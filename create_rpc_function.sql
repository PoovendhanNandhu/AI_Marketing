-- Function to check if a subscription exists for a user and create one if not
CREATE OR REPLACE FUNCTION create_subscription_if_not_exists(
  user_id_param UUID,
  plan_id_param TEXT DEFAULT 'free',
  status_param TEXT DEFAULT 'active',
  article_limit_param INTEGER DEFAULT 5,
  chat_limit_param INTEGER DEFAULT 300
) RETURNS SETOF user_subscriptions AS $$
DECLARE
  exists_already BOOLEAN;
  subscription_id UUID;
BEGIN
  -- Check if a subscription already exists for this user
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions WHERE user_id = user_id_param
  ) INTO exists_already;
  
  -- If no subscription exists, create one
  IF NOT exists_already THEN
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      article_generations_used,
      article_generations_limit,
      chat_messages_used,
      chat_messages_limit,
      current_period_start,
      current_period_end
    ) VALUES (
      user_id_param,
      plan_id_param,
      status_param,
      0,
      article_limit_param,
      0,
      chat_limit_param,
      now(),
      now() + interval '30 days'
    )
    RETURNING id INTO subscription_id;
  ELSE
    -- Get the most recent subscription ID
    SELECT id INTO subscription_id
    FROM user_subscriptions
    WHERE user_id = user_id_param
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- Return the subscription record
  RETURN QUERY
    SELECT *
    FROM user_subscriptions
    WHERE id = subscription_id;
END;
$$ LANGUAGE plpgsql; 