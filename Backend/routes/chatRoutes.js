const express = require('express');
const router = express.Router();
// Make sure to install @google/generative-ai if you haven't: npm install @google/generative-ai
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
// Make sure to install @supabase/supabase-js: npm install @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');

// --- Initialization ---
let genAI;
let model;
try {
    // Ensure the API key is loaded from environment variables
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Initialize the model with the system instruction
    model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: "You are a marketing assistant who provides actionable marketing strategies and content ideas. Answer clearly and with detailed suggestions.",
        // Optional: Consider adding safety settings
        // safetySettings: [
        //   { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        //   { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        //   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        //   { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        // ],
    });

    console.log("Gemini AI Client and Model Initialized Successfully with System Instruction.");
} catch (error) {
    console.error("FATAL: Failed to initialize Gemini AI Client:", error);
    // Consider exiting if the AI client is essential and fails to initialize
    // process.exit(1);
}

let supabase;
try {
    // Ensure Supabase credentials are loaded from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    // Use the SERVICE_KEY for backend operations to bypass RLS by default
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        // Throw specific errors for missing variables
        if (!supabaseUrl) throw new Error("SUPABASE_URL environment variable is not set.");
        if (!supabaseKey) throw new Error("SUPABASE_SERVICE_KEY environment variable is not set.");
    }
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase Client Initialized Successfully (using Service Key).");
} catch (error) {
    console.error("FATAL: Failed to initialize Supabase Client:", error);
    // Consider exiting if the database connection is essential
    // process.exit(1);
}
// --- End Initialization ---


// --- POST /api/chat-assistant/generate Route Handler ---
router.post('/generate', async (req, res) => {
    console.log("\n--- New /generate request received ---");

    // Check if essential clients are initialized
    if (!model || !supabase) {
        console.error("Error: AI Model or Supabase Client not properly initialized during startup.");
        return res.status(500).json({ error: "Server configuration error. Please check server logs." });
    }

    try {
        // Log the raw request body for debugging
        console.log("Request Body:", JSON.stringify(req.body, null, 2));
        const { messages, marketingPrompt } = req.body;

        // Validate incoming messages array
        if (!Array.isArray(messages) || messages.length === 0) {
            console.log("Validation Error: Messages array is missing, not an array, or empty.");
            return res.status(400).json({ error: "Messages array is required and must not be empty." });
        }

        // --- Prepare data for Gemini ---
        // Separate history from the last message
        const history = messages.slice(0, -1).map(msg => {
            // Ensure content is treated as text, even if it's accidentally not a string
            const textContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            return {
                role: msg.role === "user" ? "user" : "model", // Map roles
                parts: [{ text: textContent }] // Gemini expects parts array with text objects
            };
        });

        const lastUserMessage = messages[messages.length - 1];
        // Validate the last message is from the user
        if (lastUserMessage.role !== 'user') {
             console.log("Validation Error: The last message in the 'messages' array must have the role 'user'.");
             return res.status(400).json({ error: "Last message must be from the 'user'." });
        }
        // Ensure the last message content is also a string
        const lastMessageContent = typeof lastUserMessage.content === 'string'
            ? lastUserMessage.content
            : JSON.stringify(lastUserMessage.content);


        console.log("Formatted History for Gemini:", JSON.stringify(history, null, 2));
        console.log("Last Message Content for Gemini:", lastMessageContent);

        // Start the chat session using the prepared history and generation config
        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 1000, // Adjust as needed
                temperature: 0.7,      // Adjust creativity vs. coherence
            },
            // System instruction is now set during model initialization
        });

        // --- Call Gemini API ---
        let result;
        try {
            console.log("Sending message to Gemini API...");
            result = await chat.sendMessage(lastMessageContent);
            // Log the entire raw result from Gemini for detailed inspection
            console.log("Raw Gemini API Result:", JSON.stringify(result, null, 2));
        } catch (geminiError) {
            // Handle errors during the API call specifically
            console.error("ERROR DURING GEMINI API CALL:", geminiError);
            const errorMessage = geminiError.message || "Unknown error during AI generation.";
            // Provide detailed error info in development
            const errorDetails = process.env.NODE_ENV === 'development'
                ? (geminiError.stack || (geminiError.errorDetails ? JSON.stringify(geminiError.errorDetails) : undefined))
                : undefined;
            return res.status(500).json({
                error: `Failed to generate response from AI model: ${errorMessage}`,
                details: errorDetails,
            });
        }

        // --- Process Gemini Response ---
        let aiResponse = ''; // Initialize with an empty string
        try {
            // Check for valid response structure before attempting to access properties
            if (!result?.response?.candidates?.[0]?.content?.parts?.[0]?.text && typeof result?.response?.text !== 'function' ) {
                 console.error("Invalid or missing response structure from Gemini:", result);
                 // Check specifically for safety block reasons
                 const blockReason = result?.response?.promptFeedback?.blockReason || result?.response?.candidates?.[0]?.finishReason === 'SAFETY';
                 if (blockReason) {
                     const reasonText = result?.response?.promptFeedback?.blockReason || 'Safety settings';
                     console.warn(`AI response was blocked due to: ${reasonText}`);
                     // Provide a user-friendly message about content blocking
                     aiResponse = `[My response was blocked due to ${reasonText}. Please try rephrasing your request.]`;
                 } else {
                     // If not blocked and structure is still invalid, throw a generic error
                     throw new Error("Failed to get a valid text response structure from the AI model.");
                 }
            } else {
                // Prefer the text function if available, otherwise fallback to the candidates structure
                aiResponse = typeof result.response.text === 'function'
                    ? result.response.text()
                    : result.response.candidates[0].content.parts[0].text;
            }

            console.log("Extracted AI Response Text:", aiResponse);

            // Additional check for empty string response even if structure was valid
             if (!aiResponse) {
                console.warn("Received an empty AI response text from Gemini, structure might be valid but content is empty.");
                aiResponse = "[Received an empty response from the AI. Please try again.]"; // Provide a fallback message
            }

        } catch (processingError) {
            // Handle errors during the processing of the Gemini response
            console.error("ERROR PROCESSING GEMINI RESPONSE:", processingError);
            return res.status(500).json({
                error: "Failed to process the response from the AI model.",
                details: process.env.NODE_ENV === 'development' ? processingError.message : undefined,
             });
        }

        // --- Store conversation in Supabase ---
        // Prepare the full conversation history including the latest assistant response
        const conversationToSave = [...messages, { role: "assistant", content: aiResponse }];
        const dataToInsert = {
            // Stringify the array for storage in a jsonb/json column
            messages: JSON.stringify(conversationToSave),
            // Ensure marketingPrompt is a string, default to empty if null/undefined
            marketing_prompt: typeof marketingPrompt === 'string' ? marketingPrompt : "",
            // Use ISO string format for timestamp/timestamptz columns
            created_at: new Date().toISOString(),
        };

        console.log("Data prepared for Supabase insertion:", JSON.stringify(dataToInsert, null, 2));

        try {
            // Attempt to insert the data into the specified table
            const { data, error: insertError } = await supabase
                .from('chat_history')
                .insert([dataToInsert])
                .select(); // Optional: '.select()' retrieves the inserted row(s) for confirmation

            // Check specifically if the insert operation returned an error
            if (insertError) {
                // *** ENHANCED LOGGING FOR SUPABASE INSERT ERROR ***
                console.error("ERROR SAVING CHAT HISTORY TO SUPABASE (Raw Object):", insertError);
                // Log known properties explicitly, as the object might appear empty {} in basic console output
                console.error("Supabase Insert Error Code:", insertError.code);
                console.error("Supabase Insert Error Message:", insertError.message);
                console.error("Supabase Insert Error Details:", insertError.details);
                console.error("Supabase Insert Error Hint:", insertError.hint);
                // Stringify the whole error object for maximum detail
                console.error("Full Supabase Insert Error Object (Stringified):", JSON.stringify(insertError, null, 2));

                // Return a 500 status with specific error details
                return res.status(500).json({
                    error: "Failed to save chat history to database.",
                    // Provide clearer details to the client if possible
                    details: `Supabase error: ${insertError.message || 'Unknown database error'} (Code: ${insertError.code || 'N/A'})`,
                });
            }
            // Log successful insertion and the data returned by .select() if used
            console.log("Chat history saved successfully to Supabase. Inserted:", JSON.stringify(data, null, 2));

        } catch (supabaseError) {
            // Catch errors occurring during the Supabase client call itself (e.g., network issues, client misconfiguration)
            console.error("UNEXPECTED SUPABASE CLIENT/NETWORK ERROR:", supabaseError);
            return res.status(500).json({
                error: "An unexpected database client or network error occurred while saving chat history.",
                 details: process.env.NODE_ENV === 'development' ? supabaseError.message : undefined,
            });
        }

        // --- Send Successful Response to Client ---
        console.log("Sending successful response to client.");
        // Return only the AI's latest response content
        res.json({ response: aiResponse });

    } catch (error) {
        // Catch any unexpected errors not caught by the more specific blocks above
        console.error("!!! UNHANDLED ERROR in /generate route !!!:", error);
        res.status(500).json({
            error: "An unexpected server error occurred. Please check server logs.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    } finally {
        // Log the end of request processing regardless of success or failure
        console.log("--- /generate request processing finished ---");
    }
});

// Export the router to be used in your main server file (e.g., server.js or app.js)
module.exports = router;