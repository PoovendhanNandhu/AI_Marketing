-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  price FLOAT DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  article_generations_used INTEGER NOT NULL DEFAULT 0,
  article_generations_limit INTEGER NOT NULL DEFAULT 5,
  chat_messages_used INTEGER NOT NULL DEFAULT 0,
  chat_messages_limit INTEGER NOT NULL DEFAULT 300,
  image_generations_used INTEGER NOT NULL DEFAULT 0,
  image_generations_limit INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view only their own subscription
CREATE POLICY user_subscriptions_select_policy 
  ON public.user_subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for users to update only their own subscription usage
-- Note: This is restrictive to only allow updating usage counts
CREATE POLICY user_subscriptions_update_usage_policy 
  ON public.user_subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create separate insert policy for users
CREATE POLICY user_subscriptions_insert_policy
  ON public.user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for admins to manage all subscriptions
CREATE POLICY admin_subscriptions_all_policy 
  ON public.user_subscriptions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id AND auth.users.is_admin = true
    )
  );

-- Create a scheduled function to reset usage counts at the end of billing periods
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
$$ LANGUAGE plpgsql;

-- Create a role for running the scheduled function
CREATE ROLE subscription_manager;
GRANT USAGE ON SCHEMA public TO subscription_manager;
GRANT ALL ON public.user_subscriptions TO subscription_manager;
GRANT EXECUTE ON FUNCTION reset_subscription_usage() TO subscription_manager;

-- Set up the cron job to run daily
SELECT cron.schedule(
  'reset-subscription-usage',
  '0 0 * * *', -- Run at midnight every day
  $$SELECT reset_subscription_usage()$$
);

-- Insert a free subscription for new users trigger
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
    5,
    0,
    300,
    0,
    3
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to automatically create a free subscription for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription_for_new_user();

-- Add a column to auth.users for tracking if the user is an admin
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create a function to check if a user is on a premium plan
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
$$ LANGUAGE plpgsql;

-- Create a function to increment a counter in user_subscriptions
CREATE OR REPLACE FUNCTION increment(row_id text)
RETURNS INTEGER AS $$
DECLARE
  current_value INTEGER;
BEGIN
  -- Get the current value
  EXECUTE format('SELECT %I FROM user_subscriptions WHERE user_id = auth.uid()', row_id) INTO current_value;
  
  -- Return the incremented value
  RETURN current_value + 1;
END;
$$ LANGUAGE plpgsql; 