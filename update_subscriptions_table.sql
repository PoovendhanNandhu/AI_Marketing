-- Add image generation columns to existing user_subscriptions table
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS image_generations_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_generations_limit INTEGER NOT NULL DEFAULT 3;

-- Create the increment function if it doesn't exist
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

-- Update existing subscriptions with appropriate limits based on plan_id
UPDATE public.user_subscriptions
SET image_generations_limit = 
  CASE 
    WHEN plan_id = 'free' THEN 3
    WHEN plan_id = 'basic' THEN 10
    WHEN plan_id = 'pro' THEN 50
    WHEN plan_id = 'business' THEN 100
    ELSE 3
  END
WHERE image_generations_limit IS NULL OR image_generations_limit = 0;

-- Reset the usage counter for all subscriptions
UPDATE public.user_subscriptions
SET image_generations_used = 0
WHERE image_generations_used IS NULL; 