require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');

// Ensure required environment variables are present
const requiredEnvVars = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

const app = express();
const { createClient } = require('@supabase/supabase-js');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Special handling for Stripe webhook
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Request logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Import route modules
const articleRoutes = require('./routes/articleRoutes');
// const socialPostsRoutes = require('./routes/socialPostsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const contactRoutes = require('./routes/contactRoutes');
const stripeRoutes = require('./routes/stripe');
const imageRoutes = require('./routes/imageRoutes');

// Mount the routes under appropriate endpoints
app.use('/api/articles', articleRoutes);
// app.use('/api/social-posts', socialPostsRoutes);
app.use('/api/chat-assistant', chatRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/images', imageRoutes);

async function incrementChatUsageCount(userId) {
  if (!userId) return;
  try {
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('chat_messages_limit')
      .eq('user_id', userId)
      .maybeSingle();

    if (subscription && subscription.chat_messages_limit === -1) return;

    await supabase.rpc('increment_user_chat_messages', { p_user_id: userId });
  } catch (err) {
    console.error('Failed to update chat usage count:', err);
  }
}

// Add the /api/chat route handler
app.post('/api/chat', async (req, res) => {
    console.log('Received request to /api/chat endpoint');
    console.log('Request body:', req.body);
    
    try {
        const { prompt, messages: chatMessages, topic, keywords, systemInstruction, userId } = req.body;
        let finalPrompt = prompt;

        if (topic && keywords) {
            finalPrompt = `Write an article about "${topic}" focusing on these keywords: ${keywords}.`;
        } else if (Array.isArray(chatMessages) && chatMessages.length > 0) {
            const lastUserMessage = chatMessages.filter(m => m.role === 'user').pop();
            if (lastUserMessage) {
                finalPrompt = lastUserMessage.content;
            } else {
                finalPrompt = prompt || "Hello";
            }
        } else if (!finalPrompt) {
            return res.status(400).json({ error: 'A valid prompt, topic/keywords, or message history is required' });
        }

        if (!topic && !keywords && !finalPrompt) {
            return res.status(400).json({ error: 'Either topic and keywords, or a prompt/message history is required' });
        }

        // Prepare messages array for OpenAI
        let messagesForAI = [];
        
        // Add system instruction if provided
        if (systemInstruction) {
            messagesForAI.push({ role: "system", content: systemInstruction });
        }
        
        // Add chat history or single prompt
        if (Array.isArray(chatMessages)) {
            messagesForAI = [...messagesForAI, ...chatMessages];
        } else {
            messagesForAI.push({ role: "user", content: finalPrompt });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messagesForAI,
            max_tokens: 500,
            temperature: 0.7,
        });

        const responseText = completion.choices[0].message.content;

        if (userId && responseText) {
          await incrementChatUsageCount(userId);
        }

        res.status(200).json({
            response: responseText
        });
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start the server using environment variable for port
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});


