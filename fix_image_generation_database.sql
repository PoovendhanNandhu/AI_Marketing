-- Fix database issues for image generation
-- 1. Add missing columns if they don't exist
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS image_generations_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_generations_limit INTEGER NOT NULL DEFAULT 3;

-- 2. Create the RPC function for incrementing image generations
CREATE OR REPLACE FUNCTION increment_user_image_generations(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET 
    image_generations_used = image_generations_used + 1,
    updated_at = now()
  WHERE user_id = p_user_id
  AND image_generations_used < image_generations_limit; -- Prevent incrementing beyond limit
END;
$$ LANGUAGE plpgsql;

-- 3. Update image generation limits for all subscription plans
UPDATE public.user_subscriptions
SET image_generations_limit = 
  CASE 
    WHEN plan_id = 'free' THEN 3
    WHEN plan_id = 'basic' THEN 30
    WHEN plan_id = 'pro' THEN 100
    WHEN plan_id = 'business' THEN 300
    ELSE image_generations_limit -- Keep current value for any other plans
  END;

-- 4. Verify the changes (uncomment to run)
-- SELECT plan_id, image_generations_limit FROM public.user_subscriptions GROUP BY plan_id, image_generations_limit ORDER BY plan_id; 