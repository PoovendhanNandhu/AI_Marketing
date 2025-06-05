-- Reset subscription usage function (alternative syntax)
CREATE OR REPLACE FUNCTION reset_subscription_usage()
RETURNS void AS '
BEGIN
  UPDATE public.user_subscriptions
  SET 
    article_generations_used = 0,
    chat_messages_used = 0,
    current_period_start = now(),
    current_period_end = CASE 
      WHEN interval = ''yearly'' THEN now() + interval ''1 year''
      ELSE now() + interval ''1 month''
    END,
    updated_at = now()
  WHERE current_period_end <= now() AND status = ''active'';
END;
' LANGUAGE plpgsql; 