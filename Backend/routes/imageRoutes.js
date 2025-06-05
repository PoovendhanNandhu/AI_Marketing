const express = require('express');
const { OpenAI } = require('openai');
// const { VertexAI } = require('@google-cloud/aiplatform'); // Will uncomment when implementing Google
// const Replicate = require('replicate'); // Will uncomment when implementing Replicate
const fetch = require('node-fetch'); // For Stability AI or other direct HTTP calls
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --- Client Initializations ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// const replicate = new Replicate({ // Will uncomment and configure
//   auth: process.env.REPLICATE_API_TOKEN,
// });

// For Google Vertex AI - more complex initialization usually in the function
// const googleVertexAI = new VertexAI({project: process.env.GOOGLE_PROJECT_ID, location: process.env.GOOGLE_LOCATION});


// --- Helper Functions (Usage Limits) ---
// User subscription tiers and limits:
// - Free: 3 image generations
// - Basic: 30 image generations
// - Pro: 100 image generations
// - Business: 300 image generations
async function checkImageGenerationLimits(userId) {
  if (!userId) {
    return { canGenerate: true, used: 0, limit: Infinity, isPremium: false };
  }

  try {
    const { data: subscription, error: dbError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('status', { ascending: true })
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (dbError) {
      console.error('Supabase DB Error fetching subscription for limits:', dbError);
      throw new Error(`Database query failed while fetching subscription: ${dbError.message}`);
    }
    
    if (!subscription) {
      console.warn('No subscription record found for user for limits:', userId, '- Applying default free tier limits.');
      const defaultLimitEnv = process.env.DEFAULT_FREE_LIMIT;
      let defaultLimit = 3; // Hardcoded fallback default
      if (defaultLimitEnv) {
        const parsedLimit = parseInt(defaultLimitEnv, 10);
        if (!isNaN(parsedLimit) && parsedLimit >= 0) {
          defaultLimit = parsedLimit;
        } else {
          console.warn(`Invalid DEFAULT_FREE_LIMIT environment variable: "${defaultLimitEnv}". Using fallback default ${defaultLimit}.`);
        }
      }
      
      return { 
        canGenerate: 0 < defaultLimit,
        used: 0, 
        limit: defaultLimit, 
        isPremium: false 
      };
    }
    
    // Handle unlimited generations case (-1 indicates unlimited)
    if (subscription.image_generations_limit === -1) {
      return {
        canGenerate: true,
        used: subscription.image_generations_used || 0,
        limit: Infinity,
        isPremium: subscription.plan_id !== 'free'
      };
    }
    
    if (subscription.image_generations_used >= subscription.image_generations_limit) {
      return {
        canGenerate: false,
        used: subscription.image_generations_used,
        limit: subscription.image_generations_limit,
        isPremium: subscription.plan_id !== 'free'
      };
    }
    
    return {
      canGenerate: true,
      used: subscription.image_generations_used,
      limit: subscription.image_generations_limit,
      isPremium: subscription.plan_id !== 'free'
    };

  } catch (err) {
    console.error('Error in checkImageGenerationLimits function for user:', userId, err);
    if (err instanceof Error) {
    throw err;
    } else {
        throw new Error('An unexpected issue occurred in checkImageGenerationLimits.');
    }
  }
}

async function incrementImageGenerationCount(userId) {
  if (!userId) {
    console.warn('No user ID provided, skipping increment of image generation count.');
    return;
  }
  
  try {
    // First check if the user has unlimited image generations
    const { data: subscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('image_generations_limit')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching subscription to check limits:', fetchError);
      return;
    }
    
    // Skip incrementing if user has unlimited generations (limit = -1)
    if (subscription && subscription.image_generations_limit === -1) {
      console.log(`User ${userId} has unlimited image generations, skipping count increment.`);
      return;
    }
    
    // Otherwise, increment as usual
    const { error } = await supabase.rpc('increment_user_image_generations', { p_user_id: userId });
      
    if (error) {
      console.error('Error incrementing image generation count via RPC:', error);
    }
  } catch (err) {
    console.error('Failed to update image generation count (incrementImageGenerationCount):', err);
  }
}

// We need a more robust way to increment. Let's assume a Supabase RPC function for atomicity.
// SQL for Supabase:
// CREATE OR REPLACE FUNCTION increment_user_image_generations(p_user_id UUID)
// RETURNS void AS $$
// BEGIN
//   UPDATE public.user_subscriptions
//   SET 
//     image_generations_used = image_generations_used + 1,
//     updated_at = now()
//   WHERE user_id = p_user_id
//   AND image_generations_used < image_generations_limit; -- Optional: prevent incrementing beyond limit
// END;
// $$ LANGUAGE plpgsql;
//
// Note: The old supabase.rpc('increment', { row_id: 'image_generations_used' }) was too generic.
// The new RPC function 'increment_user_image_generations' is more specific.


// --- Provider-Specific Generation Logic ---

async function generateWithOpenAI({ prompt, modelId, size, style, negativePrompt }) {
  let fullPrompt = prompt;
  if (style) fullPrompt = `${prompt}, ${style} style`;
  if (negativePrompt) fullPrompt += `. Avoid: ${negativePrompt}`;

  const imageResponse = await openai.images.generate({
    model: modelId || "dall-e-3",
    prompt: fullPrompt,
    n: 1,
    size: size || "1024x1024",
    response_format: 'url',
  });
  return imageResponse.data.map(img => img.url);
}

async function generateWithGoogle({ prompt, modelId, size, style, negativePrompt, userId }) {
  const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_QUOTA_PROJECT_ID;
  const LOCATION_ID = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  const MODEL_ID = modelId || 'imagegeneration@006'; // Use the working model
  
  if (!PROJECT_ID) {
    throw new Error("Google Cloud Project ID not configured. Set GOOGLE_CLOUD_PROJECT_ID or GOOGLE_QUOTA_PROJECT_ID environment variable.");
  }

  console.log("Google Imagen generation started", { prompt, modelId: MODEL_ID, size, negativePrompt });

  try {
    // Use OAuth credentials instead of service account file
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      credentials: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        type: 'authorized_user',
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      projectId: PROJECT_ID
    });
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    // Set aspect ratio based on size
    let aspectRatio = "1:1"; // Default
    if (size) {
      const [width, height] = size.split('x').map(Number);
      if (width && height) {
        if (width > height) aspectRatio = "16:9";
        else if (height > width) aspectRatio = "9:16";
        else aspectRatio = "1:1";
      }
    }
    
    // Prepare the request body for Vertex AI Imagen
    const requestBody = {
      instances: [
        {
          prompt: prompt + (style ? `, ${style} style` : ''),
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: aspectRatio,
        negativePrompt: negativePrompt || "",
        safetySetting: "block_some",
        personGeneration: "dont_allow"
      }
    };
    
    // Make the API request to Vertex AI using the correct endpoint format
    const apiUrl = `https://${LOCATION_ID}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${MODEL_ID}:predict`;
    
    console.log('Making request to:', apiUrl);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Imagen API error: ${response.status}`, errorText);
      throw new Error(`Google Imagen API error: ${response.status} - ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('Google Imagen response structure:', JSON.stringify(responseData, null, 2));
    
    // Extract image URLs from the response
    const images = [];
    
    // Handle different possible response formats from Vertex AI Imagen
    if (responseData.predictions && Array.isArray(responseData.predictions)) {
      responseData.predictions.forEach(prediction => {
        // Handle the correct response format for imagegeneration@006
        if (prediction.bytesBase64Encoded) {
          images.push(`data:image/png;base64,${prediction.bytesBase64Encoded}`);
        } else if (prediction.mimeType && prediction.bytesBase64Encoded) {
          const mimeType = prediction.mimeType || 'image/png';
          images.push(`data:${mimeType};base64,${prediction.bytesBase64Encoded}`);
        }
      });
    } else if (responseData.artifacts && Array.isArray(responseData.artifacts)) {
      // Alternative response format
      responseData.artifacts.forEach(artifact => {
        if (artifact.base64) {
          images.push(`data:image/png;base64,${artifact.base64}`);
        }
      });
    } else if (responseData.images && Array.isArray(responseData.images)) {
      // Another possible format
      responseData.images.forEach(image => {
        if (image.bytesBase64Encoded) {
          images.push(`data:image/png;base64,${image.bytesBase64Encoded}`);
        }
      });
    } else if (responseData.generated_images && Array.isArray(responseData.generated_images)) {
      // Yet another format
      responseData.generated_images.forEach(image => {
        if (image.bytes_base64_encoded) {
          images.push(`data:image/png;base64,${image.bytes_base64_encoded}`);
        }
      });
    }
    
    // If still no images, check if the response has any base64 data at all
    if (images.length === 0 && responseData) {
      // Try to find any base64 encoded data in the response
      const findBase64 = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string' && obj[key].length > 100 && /^[A-Za-z0-9+/=]+$/.test(obj[key])) {
            return obj[key];
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            const result = findBase64(obj[key]);
            if (result) return result;
          }
        }
        return null;
      };
      
      const base64Data = findBase64(responseData);
      if (base64Data) {
        images.push(`data:image/png;base64,${base64Data}`);
      }
    }
    
    if (images.length === 0) {
      console.warn("No images were returned from Google Imagen API", responseData);
      throw new Error("No images were generated by Google Imagen. The API returned an empty response. Please check your Google Cloud project configuration and billing.");
    }
    
    return images;
  } catch (error) {
    console.error('Error generating image with Google Imagen:', error);
    throw new Error(`Google Imagen generation failed: ${error.message}`);
  }
}

async function generateWithStabilityAI({ prompt, modelId, size, style, negativePrompt, userId }) {
  // Placeholder - Implementation needed
  console.log("Stability AI generation called (not implemented yet)", { prompt, modelId, size, userId });
  const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
  if (!STABILITY_API_KEY) throw new Error("Stability AI API key is not configured.");

  const engineId = modelId || 'stable-diffusion-xl-1024-v1-0'; // Default model
  const apiHost = 'https://api.stability.ai';
  const url = `${apiHost}/v1/generation/${engineId}/text-to-image`;

  const [width, height] = (size || "1024x1024").split('x').map(Number);
  
  let text_prompts = [{ text: prompt, weight: 1 }];
  if (negativePrompt) {
    text_prompts.push({ text: negativePrompt, weight: -1 });
  }

  const body = {
    text_prompts,
    cfg_scale: 7,
    height,
    width,
    samples: 1,
    steps: 30, // Default, can be configured
  };
  if (style) body.style_preset = style; // e.g., "photographic", "digital-art" etc. Check Stability AI docs for presets

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${STABILITY_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Stability AI error: ${response.status}`, errorText);
      throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
    }

    const responseJSON = await response.json();
    // Images are base64 encoded
    return responseJSON.artifacts.map(image => `data:image/png;base64,${image.base64}`);
  } catch (error) {
    console.error('Error generating image with Stability AI:', error);
    throw new Error('Stability AI image generation failed.');
  }
}

async function generateWithReplicate({ prompt, modelId, size, style, negativePrompt, userId }) {
  // Placeholder - Implementation needed
  console.log("Replicate generation called (not implemented yet)", { prompt, modelId, size, userId });
  /*
  if (!modelId) throw new Error("Replicate model ID is required.");
  const ReplicateSDK = require('replicate'); // Local require if not global
  const replicateClient = new ReplicateSDK({ auth: process.env.REPLICATE_API_TOKEN });

  const [width, height] = (size || "512x512").split('x').map(Number); // Default for many Replicate SD models

  const input = {
    prompt: `${prompt}${style ? ', ' + style + ' style' : ''}${negativePrompt ? '. Avoid: ' + negativePrompt : ''}`,
    width,
    height,
    // Other params depend on the specific Replicate model
    // num_outputs: 1,
    // negative_prompt: negativePrompt, // Some models have this directly
  };

  try {
    const output = await replicateClient.run(modelId, { input });
    // Output structure varies; usually an array of URLs or base64 images
    if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
      return output; // Assuming it's an array of image URLs
    }
    console.error("Unexpected Replicate output format:", output);
    throw new Error("Replicate image generation returned an unexpected format.");
  } catch (error) {
    console.error('Error generating image with Replicate:', error);
    throw new Error('Replicate image generation failed.');
  }
  */
  return ["https://via.placeholder.com/512.png?text=Replicate+NI"];
}


// --- Main Generation Route ---
router.post('/generate', async (req, res) => {
  try {
    const { provider, modelId, prompt, size, style, negativePrompt, userId } = req.body;
    
    if (!provider || !prompt) {
      return res.status(400).json({ error: 'Provider and prompt are required.' });
    }

    // Check limits (apply globally for now)
    if (userId) { // Only check limits if a user is involved
        const limitCheck = await checkImageGenerationLimits(userId);
        if (!limitCheck.canGenerate) {
          return res.status(403).json({
            error: 'Usage limit reached',
            details: {
              used: limitCheck.used,
              limit: limitCheck.limit,
              isPremium: limitCheck.isPremium,
            },
          });
        }
    }

    let imageUrls = [];
    const generationParams = { prompt, modelId, size, style, negativePrompt, userId };

    switch (provider.toLowerCase()) {
      case 'openai':
        imageUrls = await generateWithOpenAI(generationParams);
        break;
      case 'google':
        imageUrls = await generateWithGoogle(generationParams);
        break;
      case 'stability':
        imageUrls = await generateWithStabilityAI(generationParams);
        break;
      case 'replicate':
        imageUrls = await generateWithReplicate(generationParams);
        break;
      default:
        return res.status(400).json({ error: 'Invalid image generation provider.' });
    }

    // Increment usage count if userId is provided and generation was successful
    if (userId && imageUrls.length > 0) {
      await incrementImageGenerationCount(userId);
    }

    res.status(200).json({ 
      images: imageUrls,
      message: `Image generated successfully with ${provider}`,
    });

  } catch (error) {
    console.error(`Error in /generate route with provider ${req.body.provider}:`, error);
    res.status(error.status || 500).json({
      error: error.message || 'Error generating image',
      details: process.env.NODE_ENV === 'development' && error.response ? error.response.data : undefined,
    });
  }
});

// --- Models Information Route ---
router.get('/models', async (req, res) => {
  // This should be dynamic, possibly fetched from a config or by querying APIs if feasible
  // For now, returning a static structure.
  // Styles should be curated per model/provider for best results.
  const modelsData = {
    providers: [
      {
        id: "openai",
        name: "OpenAI",
        models: [
          { id: "dall-e-3", name: "DALL·E 3", sizes: ["1024x1024", "1792x1024", "1024x1792"], defaultSize: "1024x1024", styles: ["photographic", "digital art", "pixel art", "van gogh", "impressionist", "surrealist", "minimalist", "abstract", "comic book", "fantasy art", "sci-fi", "anime", "cartoon", "3d render", "isometric"] },
          { id: "dall-e-2", name: "DALL·E 2", sizes: ["256x256", "512x512", "1024x1024"], defaultSize: "1024x1024", styles: ["photographic", "digital art", "pixel art", "van gogh", "impressionist", "surrealist"] }
        ]
      },
      {
        id: "google",
        name: "Google Vertex AI",
        models: [
          // modelId for Google is the Vertex AI model identifier
          { id: "imagegeneration@006", name: "Imagen 2 (via 006)", sizes: ["256x256", "512x512", "1024x1024"], defaultSize: "1024x1024", styles: ["photograph", "digital_art", "portrait", "landscape", "cinematic"] }, // Add more valid sizes
          { id: "imagegeneration@005", name: "Imagen (via 005)", sizes: ["256x256", "512x512", "1024x1024"], defaultSize: "1024x1024", styles: ["photograph", "digital_art", "portrait", "landscape"] } 
        ]
      },
      {
        id: "stability",
        name: "Stability AI",
        models: [
          { id: "stable-diffusion-xl-1024-v1-0", name: "SDXL 1.0", sizes: ["1024x1024", "1152x896", "896x1152", "1216x832", "832x1216", "1344x768", "768x1344", "1536x640", "640x1536"], defaultSize: "1024x1024", styles: ["photographic", "digital-art", "anime", "fantasy", "cinematic", "comic-book", "low-poly", "origami" /* Check Stability AI docs for valid style_presets */] },
          { id: "stable-diffusion-v1-6", name: "Stable Diffusion 1.6", sizes: ["512x512", "768x768"], defaultSize: "512x512", styles: ["photographic", "digital-art", "anime", "fantasy"] }
        ]
      },
      {
        id: "replicate",
        name: "Replicate",
        // Replicate models are very diverse. You'll need to curate this list carefully
        // with models you want to support and their specific parameters.
        models: [
          { id: "stability-ai/sdxl:c221b2b8ef527988fb59bf24a8b97c4561f1c671f73bd389f866fe846063197", name: "SDXL (Replicate by Stability AI)", sizes: ["1024x1024", "512x512"], defaultSize: "1024x1024", styles: ["photographic", "cinematic", "anime"] },
          { id: "ai-forever/kandinsky-2.2:ea1addaab376f4dc227f5368bbd8eff901820fd1cc14ed8cad63b29249e9d463", name: "Kandinsky 2.2 (Replicate)", sizes: ["1024x1024", "512x512"], defaultSize: "1024x1024", styles: ["artistic", "photorealistic"] }
          // Add more Replicate models with their specific model IDs (owner/name:version)
        ]
      }
    ]
  };
  res.status(200).json(modelsData);
});

// Get user's image generation usage stats - Remains largely the same
router.get('/usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const usage = await checkImageGenerationLimits(userId); // Use the updated helper
    res.status(200).json({
      used: usage.used,
      limit: usage.limit,
      isPremium: usage.isPremium,
      canGenerate: usage.canGenerate
    });
  } catch (error) {
    console.error('Error fetching image generation usage:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch usage data' });
  }
});

module.exports = router; 