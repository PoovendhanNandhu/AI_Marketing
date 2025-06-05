-- Reset subscription usage function
CREATE OR REPLACE FUNCTION reset_subscription_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET 
    article_generations_used = 0,
    chat_messages_used = 0,
    current_period_start = now(),
    current_period_end = CASE 
      WHEN interval = 'yearly' THEN now() + interval '1 year'
      ELSE now() + interval '1 month'
    END,
    updated_at = now()
  WHERE current_period_end <= now() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Reset image generation usage counters for all users
-- This will allow everyone to start fresh with the new limits

-- 1. Reset the counters for all users
UPDATE public.user_subscriptions
SET image_generations_used = 0;

-- 2. Display the current settings for all users to verify
SELECT 
  user_id, 
  plan_id, 
  image_generations_used, 
  image_generations_limit,
  image_generations_used || ' of ' || image_generations_limit AS usage_display
FROM public.user_subscriptions
ORDER BY plan_id;

-- 3. Also verify again that the limits match our tiers
SELECT 
  plan_id, 
  image_generations_limit,
  COUNT(*) as user_count
FROM public.user_subscriptions
GROUP BY plan_id, image_generations_limit
ORDER BY plan_id; 