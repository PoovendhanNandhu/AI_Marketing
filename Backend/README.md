# AI Marketing Backend

A Node.js backend service that integrates OpenAI's GPT model with Supabase for data storage.

## Features

- Express.js server with security middleware
- OpenAI API integration for text generation
- Supabase integration for data storage
- Rate limiting and security headers
- Error handling and logging
- Environment variable configuration

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key
- Supabase project credentials

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3000
   NODE_ENV=development
   ```

4. Create a table in your Supabase database named `chat_interactions` with the following columns:
   - id (uuid, primary key)
   - prompt (text)
   - response (text)
   - timestamp (timestamp with timezone)

## Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Health Check
- GET `/health`
- Returns server status

### Chat Endpoint
- POST `/api/chat`
- Request body:
  ```json
  {
    "prompt": "Your prompt here"
  }
  ```
- Returns:
  ```json
  {
    "response": "Generated response",
    "timestamp": "2024-03-24T12:00:00.000Z"
  }
  ```

## Security Features

- Helmet.js for security headers
- Rate limiting (100 requests per 15 minutes per IP)
- CORS enabled
- Environment variable protection
- Error handling with appropriate status codes

## Error Handling

The API includes comprehensive error handling:
- 400: Bad Request (missing or invalid parameters)
- 500: Internal Server Error
- Rate limit exceeded: 429 Too Many Requests

## Development

The server uses nodemon in development mode for automatic reloading when files change. 