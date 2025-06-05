-- Update image generation limits for all subscription plans
-- Free tier remains at 3 generations
-- Basic tier: 30 generations
-- Pro tier: 100 generations 
-- Business tier: 300 generations

-- Update existing subscriptions
UPDATE public.user_subscriptions
SET image_generations_limit = 
  CASE 
    WHEN plan_id = 'free' THEN 3
    WHEN plan_id = 'basic' THEN 30
    WHEN plan_id = 'pro' THEN 100
    WHEN plan_id = 'business' THEN 300
    ELSE image_generations_limit -- Keep current value for any other plans
  END;

-- Also update the default values in the create_free_subscription_for_new_user function
-- This ensures new users get the correct limits
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
    5, -- Default article generations limit
    0,
    300, -- Default chat messages limit
    0,
    3  -- Default image generations limit (free tier)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This comment explains how to verify the changes
-- Run this query to check the updated limits:
-- SELECT plan_id, image_generations_limit FROM public.user_subscriptions GROUP BY plan_id, image_generations_limit ORDER BY plan_id; 