require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');

const app = express();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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

// Add the /api/chat route handler
app.post('/api/chat', async (req, res) => {
    console.log('Received request to /api/chat endpoint');
    console.log('Request body:', req.body);
    
    try {
        const { prompt, messages: chatMessages, topic, keywords, systemInstruction } = req.body;
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

        res.status(200).json({
            response: completion.choices[0].message.content
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


