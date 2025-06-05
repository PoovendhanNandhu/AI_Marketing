-- Fix database issues for image generation
-- 1. Add missing columns if they don't exist
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS image_generations_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_generations_limit INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Create a debug function to check the table structure
CREATE OR REPLACE FUNCTION debug_user_subscriptions(p_user_id UUID)
RETURNS TABLE (column_name text, data_type text, column_value text) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    columns.column_name::text, 
    columns.data_type::text,
    (SELECT COALESCE(
      CASE 
        WHEN columns.data_type = 'timestamp with time zone' THEN to_char(u.updated_at, 'YYYY-MM-DD HH:MI:SS')::text
        WHEN columns.data_type = 'text' OR columns.data_type LIKE 'character%' THEN u.column_name::text
        WHEN columns.data_type = 'integer' OR columns.data_type = 'bigint' THEN u.column_name::text
        WHEN columns.data_type = 'uuid' THEN u.column_name::text
        ELSE 'unsupported type'
      END, 'NULL')
      FROM public.user_subscriptions u 
      WHERE u.user_id = p_user_id 
      LIMIT 1) as column_value
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = 'user_subscriptions';
END;
$$ LANGUAGE plpgsql;

-- 3. Create the RPC function for incrementing image generations (FIXED VERSION)
CREATE OR REPLACE FUNCTION increment_user_image_generations(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Debug output to logs
  RAISE NOTICE 'Incrementing image_generations_used for user: %', p_user_id;
  
  UPDATE public.user_subscriptions
  SET 
    image_generations_used = COALESCE(image_generations_used, 0) + 1,
    updated_at = now()
  WHERE user_id = p_user_id
  AND (image_generations_used IS NULL OR image_generations_used < image_generations_limit); 
  
  -- Return how many rows were updated
  RAISE NOTICE 'Updated % row(s)', ROW_COUNT();
END;
$$ LANGUAGE plpgsql;

-- 4. Update image generation limits for all subscription plans
UPDATE public.user_subscriptions
SET image_generations_limit = 
  CASE 
    WHEN plan_id = 'free' THEN 3
    WHEN plan_id = 'basic' THEN 30
    WHEN plan_id = 'pro' THEN 100
    WHEN plan_id = 'business' THEN 300
    ELSE image_generations_limit -- Keep current value for any other plans
  END;

-- 5. Verification queries (uncomment to run)
-- Run this to see the table structure and data for a specific user:
-- SELECT * FROM debug_user_subscriptions('your-user-id-here');

-- Run this to see usage across plans:
-- SELECT plan_id, image_generations_limit, COUNT(*) 
-- FROM public.user_subscriptions 
-- GROUP BY plan_id, image_generations_limit 
-- ORDER BY plan_id; 