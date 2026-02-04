-- =============================================================================
-- SUPABASE COMPLETE SETUP FOR AI MARKETING PLATFORM
-- =============================================================================
-- Run this entire script in Supabase SQL Editor to set up a fresh project.
-- This replaces all previous SQL files and includes all fixes.
-- =============================================================================

-- =============================================================================
-- PART 1: USER SUBSCRIPTIONS TABLE
-- =============================================================================

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  price FLOAT DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  -- Article generation limits
  article_generations_used INTEGER NOT NULL DEFAULT 0,
  article_generations_limit INTEGER NOT NULL DEFAULT 5,
  -- Chat message limits
  chat_messages_used INTEGER NOT NULL DEFAULT 0,
  chat_messages_limit INTEGER NOT NULL DEFAULT 300,
  -- Image generation limits
  image_generations_used INTEGER NOT NULL DEFAULT 0,
  image_generations_limit INTEGER NOT NULL DEFAULT 3,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure one subscription per user
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

-- =============================================================================
-- PART 2: CHAT HISTORY TABLE
-- =============================================================================

-- Create chat_history table for storing conversations
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  marketing_prompt TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at DESC);

-- =============================================================================
-- PART 3: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS user_subscriptions_select_policy ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_update_policy ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_insert_policy ON public.user_subscriptions;

-- Users can view only their own subscription
CREATE POLICY user_subscriptions_select_policy
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update only their own subscription
CREATE POLICY user_subscriptions_update_policy
  ON public.user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert only their own subscription
CREATE POLICY user_subscriptions_insert_policy
  ON public.user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on chat_history
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS chat_history_select_policy ON public.chat_history;
DROP POLICY IF EXISTS chat_history_insert_policy ON public.chat_history;

-- Users can view only their own chat history
CREATE POLICY chat_history_select_policy
  ON public.chat_history
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can insert their own chat history (or anonymous)
CREATE POLICY chat_history_insert_policy
  ON public.chat_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =============================================================================
-- PART 4: FUNCTIONS
-- =============================================================================

-- Function: Create free subscription for new users (TRIGGER FUNCTION)
CREATE OR REPLACE FUNCTION create_free_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    article_generations_used,
    article_generations_limit,
    chat_messages_used,
    chat_messages_limit,
    image_generations_used,
    image_generations_limit
  ) VALUES (
    NEW.id,
    'free',
    'active',
    0,
    5,      -- Free: 5 articles
    0,
    300,    -- Free: 300 chat messages
    0,
    3       -- Free: 3 images
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment image generations count (called from backend)
CREATE OR REPLACE FUNCTION increment_user_image_generations(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET
    image_generations_used = COALESCE(image_generations_used, 0) + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for user %', p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment article generations count
CREATE OR REPLACE FUNCTION increment_user_article_generations(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET
    article_generations_used = COALESCE(article_generations_used, 0) + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for user %', p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment chat messages count
CREATE OR REPLACE FUNCTION increment_user_chat_messages(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET
    chat_messages_used = COALESCE(chat_messages_used, 0) + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for user %', p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reset subscription usage (for billing cycle reset)
CREATE OR REPLACE FUNCTION reset_subscription_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET
    article_generations_used = 0,
    chat_messages_used = 0,
    image_generations_used = 0,
    current_period_start = now(),
    current_period_end = CASE
      WHEN interval = 'yearly' THEN now() + interval '1 year'
      ELSE now() + interval '1 month'
    END,
    updated_at = now()
  WHERE current_period_end <= now() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is on premium plan
CREATE OR REPLACE FUNCTION is_premium_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_premium BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE
      user_id = user_uuid AND
      status = 'active' AND
      plan_id != 'free' AND
      current_period_end > now()
  ) INTO is_premium;

  RETURN is_premium;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's remaining limits
CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS TABLE (
  plan_id TEXT,
  articles_remaining INTEGER,
  chat_remaining INTEGER,
  images_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.plan_id,
    CASE
      WHEN us.article_generations_limit = -1 THEN -1
      ELSE GREATEST(0, us.article_generations_limit - us.article_generations_used)
    END as articles_remaining,
    CASE
      WHEN us.chat_messages_limit = -1 THEN -1
      ELSE GREATEST(0, us.chat_messages_limit - us.chat_messages_used)
    END as chat_remaining,
    CASE
      WHEN us.image_generations_limit = -1 THEN -1
      ELSE GREATEST(0, us.image_generations_limit - us.image_generations_used)
    END as images_remaining
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 5: TRIGGERS
-- =============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create free subscription for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription_for_new_user();

-- =============================================================================
-- PART 6: UPDATED_AT TRIGGER (auto-update timestamp)
-- =============================================================================

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_subscriptions
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for chat_history
DROP TRIGGER IF EXISTS update_chat_history_updated_at ON public.chat_history;
CREATE TRIGGER update_chat_history_updated_at
  BEFORE UPDATE ON public.chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 7: GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT ON public.chat_history TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION increment_user_image_generations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_article_generations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_chat_messages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_premium_user(UUID) TO authenticated;

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================
--
-- Tables created:
--   - user_subscriptions (with RLS)
--   - chat_history (with RLS)
--
-- Functions created:
--   - create_free_subscription_for_new_user() - Trigger function
--   - increment_user_image_generations(UUID)
--   - increment_user_article_generations(UUID)
--   - increment_user_chat_messages(UUID)
--   - reset_subscription_usage()
--   - is_premium_user(UUID)
--   - get_user_limits(UUID)
--
-- Triggers created:
--   - on_auth_user_created - Creates free subscription for new users
--   - update_user_subscriptions_updated_at - Auto-updates timestamp
--   - update_chat_history_updated_at - Auto-updates timestamp
--
-- =============================================================================
