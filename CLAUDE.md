# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands

### Frontend (Next.js - root directory)
```bash
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

### Backend (Express - Backend/ directory)
```bash
cd Backend
npm run dev      # Development with nodemon at http://localhost:3001
npm start        # Production server
```

Both servers must run simultaneously for full functionality.

## Architecture Overview

This is a full-stack AI marketing platform with a Next.js 13 frontend and Express backend.

### Frontend Structure (root directory)
- **app/**: Next.js App Router pages
  - `ai-apps/`: AI tools hub
  - `article-writer/`, `chat-assistant/`, `image-generation/`: Feature pages
  - `login/`, `signup/`, `profile/`, `pricing/`: Auth and user pages
  - `SupabaseProvider.tsx`: Context provider wrapping the app
- **components/ui/**: shadcn/ui component library
- **hooks/**: Custom hooks for auth (`useAuth.ts`), subscriptions (`useSubscription.ts`), anonymous usage tracking
- **lib/config.ts**: Centralized API endpoint configuration with environment detection

### Backend Structure (Backend/)
- **server.js**: Express entry point (port 3001)
- **routes/**: API handlers
  - `articleRoutes.js`: Article generation (OpenAI)
  - `chatRoutes.js`: Chat assistant (Google Gemini)
  - `imageRoutes.js`: Image generation (DALL-E, Replicate, Stability AI)
  - `stripe.js`: Subscription management

### Key Integrations
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth
- **Payments**: Stripe (tiered subscriptions: Free/Basic/Pro/Business)
- **AI Services**: OpenAI GPT-3.5, Google Gemini, Replicate, Stability AI

### API Communication
Frontend uses `lib/config.ts` for API URLs. The backend runs on port 3001 locally, with production at `https://ai-marketing-xvf3.onrender.com`.

## Development Guidelines

- Use `"use client"` directive for components with client-side hooks (useState, useEffect)
- Use shadcn/ui and Lucide React for UI - avoid adding other UI libraries
- Tailwind CSS for all styling
- Backend uses `SUPABASE_SERVICE_KEY` to bypass Row Level Security
- SQL migration files in `SQL files/` directory should be run in Supabase SQL Editor

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env)
```
OPENAI_API_KEY=
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PORT=3001
```

## Database Setup

For new Supabase projects, see `SUPABASE_SETUP.md` for complete instructions.

Quick setup:
1. Create Supabase project at supabase.com
2. Run `supabase_complete_setup.sql` in SQL Editor
3. Copy API keys to environment variables

### Database Schema
- **user_subscriptions**: Stores user plan info and usage limits
- **chat_history**: Stores chat conversations (JSONB messages column)

### Key RPC Functions
- `increment_user_image_generations(user_id)` - Increment image count
- `increment_user_article_generations(user_id)` - Increment article count
- `get_user_limits(user_id)` - Get remaining limits for a user
