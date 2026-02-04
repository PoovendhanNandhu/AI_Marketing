# Supabase Setup Guide for AI Marketing Platform

This guide walks you through setting up a fresh Supabase project for the AI Marketing Platform.

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in:
   - **Project name**: `ai-marketing` (or your preferred name)
   - **Database password**: Generate a strong password and **save it**
   - **Region**: Choose closest to your users
4. Click **Create new project** and wait for setup to complete

## Step 2: Get Your API Keys

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (keep this secret!)

## Step 3: Run Database Setup SQL

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New query**
3. Copy and paste the entire contents of `supabase_complete_setup.sql` (created alongside this guide)
4. Click **Run** (or Ctrl/Cmd + Enter)
5. Verify you see success messages in the output

## Step 4: Configure Authentication

### Enable Email Auth (default)
1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure settings:
   - **Enable email confirmations**: ON (recommended for production)
   - **Secure email change**: ON

### Configure Email Templates (optional but recommended)
1. Go to **Authentication** → **Email Templates**
2. Customize the confirmation, invite, and reset password emails with your branding

### Set Site URL
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:3000` (development) or your production URL
3. Add **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://your-production-domain.com/**`

## Step 5: Environment Variables

### Frontend (.env.local)
Create `.env.local` in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env)
Create `.env` in the `Backend/` directory:
```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# AI Services
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key

# Stripe (for payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Optional AI Services
REPLICATE_API_TOKEN=your-replicate-token
STABILITY_API_KEY=your-stability-key

# Server
PORT=3001
NODE_ENV=development
```

## Step 6: Verify Setup

### Test Database Tables
Run this query in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```
You should see: `user_subscriptions`, `chat_history`

### Test RPC Functions
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
```
You should see: `increment_user_image_generations`, `create_free_subscription_for_new_user`, etc.

### Test Trigger
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_schema = 'public';
```
You should see: `on_auth_user_created`

## Step 7: Test the Integration

1. Start the backend: `cd Backend && npm run dev`
2. Start the frontend: `npm run dev`
3. Create a new user account via signup
4. Check Supabase → **Table Editor** → `user_subscriptions`
5. Verify a new row was created with `plan_id = 'free'`

## Subscription Plan Limits

| Plan     | Articles | Chat Messages | Images |
|----------|----------|---------------|--------|
| Free     | 5        | 300           | 3      |
| Basic    | 30       | 1000          | 30     |
| Pro      | 100      | 5000          | 100    |
| Business | Unlimited| Unlimited     | 300    |

Note: Paid plans via Stripe get `-1` (unlimited) for most limits.

## Troubleshooting

### "relation does not exist" error
- The SQL setup wasn't run. Go to SQL Editor and run `supabase_complete_setup.sql`

### "permission denied" error
- Check that you're using `SUPABASE_SERVICE_KEY` (not anon key) in the backend
- Verify RLS policies are set up correctly

### New users don't get subscriptions
- Check the trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- Re-run the trigger creation SQL if missing

### Image generation count not updating
- Verify the RPC function exists: `SELECT * FROM pg_proc WHERE proname = 'increment_user_image_generations';`
- Check backend logs for Supabase errors

## Row Level Security (RLS) Summary

| Table              | Policy                           | Description                          |
|--------------------|----------------------------------|--------------------------------------|
| user_subscriptions | SELECT own only                  | Users can only view their own data   |
| user_subscriptions | UPDATE own only                  | Users can only update their own data |
| user_subscriptions | INSERT own only                  | Users can only insert their own data |
| chat_history       | SELECT own only                  | Users can only view their own chats  |
| chat_history       | INSERT own only                  | Users can only insert their own chats|

Note: Backend uses `SERVICE_KEY` which bypasses RLS for administrative operations.
