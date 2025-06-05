-- Comprehensive fix for image generation subscription issues
-- This file addresses the core problems causing subscribers to hit limits

-- 1. Fix the increment function to properly handle unlimited subscriptions
CREATE OR REPLACE FUNCTION increment_user_image_generations(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Debug output to logs
  RAISE NOTICE 'Incrementing image_generations_used for user: %', p_user_id;
  
  -- Only increment if the user doesn't have unlimited generations
  -- (unlimited = -1, so we skip incrementing for those users)
  UPDATE public.user_subscriptions
  SET 
    image_generations_used = COALESCE(image_generations_used, 0) + 1,
    updated_at = now()
  WHERE user_id = p_user_id
  AND image_generations_limit != -1  -- Don't increment for unlimited subscriptions
  AND (image_generations_used IS NULL OR image_generations_used < image_generations_limit); 
  
  -- Return how many rows were updated
  RAISE NOTICE 'Updated % row(s) for user %', ROW_COUNT(), p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure all paid subscribers have unlimited image generations
-- Update any paid subscriptions that don't have unlimited generations
UPDATE public.user_subscriptions
SET 
  image_generations_limit = -1,  -- Set to unlimited
  updated_at = now()
WHERE plan_id != 'free' 
AND status = 'active'
AND image_generations_limit != -1;  -- Only update if not already unlimited

-- 3. Reset usage counters for all unlimited users (optional - remove if you want to keep history)
-- UPDATE public.user_subscriptions
-- SET image_generations_used = 0
-- WHERE image_generations_limit = -1;

-- 4. Set proper limits for free tier users
UPDATE public.user_subscriptions
SET 
  image_generations_limit = 3,
  updated_at = now()
WHERE plan_id = 'free' 
AND (image_generations_limit IS NULL OR image_generations_limit != 3);

-- 5. Create a function to check and fix subscription limits for a specific user
CREATE OR REPLACE FUNCTION fix_user_subscription_limits(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  plan_id TEXT,
  old_limit INTEGER,
  new_limit INTEGER,
  fixed BOOLEAN
) AS $$
DECLARE
  current_plan TEXT;
  current_limit INTEGER;
  new_limit INTEGER;
BEGIN
  -- Get current subscription info
  SELECT s.plan_id, s.image_generations_limit 
  INTO current_plan, current_limit
  FROM public.user_subscriptions s 
  WHERE s.user_id = p_user_id 
  ORDER BY s.created_at DESC 
  LIMIT 1;
  
  -- Determine what the limit should be
  IF current_plan = 'free' THEN
    new_limit := 3;
  ELSE
    new_limit := -1;  -- Unlimited for all paid plans
  END IF;
  
  -- Update if needed
  IF current_limit != new_limit THEN
    UPDATE public.user_subscriptions 
    SET 
      image_generations_limit = new_limit,
      updated_at = now()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT p_user_id, current_plan, current_limit, new_limit, true;
  ELSE
    RETURN QUERY SELECT p_user_id, current_plan, current_limit, new_limit, false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Verification queries
-- Check current status of all subscriptions
SELECT 
  plan_id,
  image_generations_limit,
  COUNT(*) as user_count,
  CASE 
    WHEN image_generations_limit = -1 THEN 'Unlimited'
    ELSE image_generations_limit::text
  END as limit_display
FROM public.user_subscriptions 
GROUP BY plan_id, image_generations_limit 
ORDER BY plan_id, image_generations_limit;

-- Check for any inconsistencies (paid users without unlimited generations)
SELECT 
  user_id,
  plan_id,
  status,
  image_generations_limit,
  image_generations_used
FROM public.user_subscriptions 
WHERE plan_id != 'free' 
AND status = 'active' 
AND image_generations_limit != -1
ORDER BY plan_id; 