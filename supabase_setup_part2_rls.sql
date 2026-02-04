-- PART 2: ROW LEVEL SECURITY
-- Run this after Part 1

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS user_subscriptions_select_policy ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_update_policy ON public.user_subscriptions;
DROP POLICY IF EXISTS user_subscriptions_insert_policy ON public.user_subscriptions;

-- Create policies for user_subscriptions
CREATE POLICY user_subscriptions_select_policy
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_subscriptions_update_policy
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_subscriptions_insert_policy
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on chat_history
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS chat_history_select_policy ON public.chat_history;
DROP POLICY IF EXISTS chat_history_insert_policy ON public.chat_history;

-- Create policies for chat_history
CREATE POLICY chat_history_select_policy
  ON public.chat_history FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY chat_history_insert_policy
  ON public.chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
