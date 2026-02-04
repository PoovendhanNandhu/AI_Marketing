-- PART 3: FUNCTIONS AND TRIGGERS
-- Run this after Part 2

-- Function: Create free subscription for new users
CREATE OR REPLACE FUNCTION create_free_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (
    user_id, plan_id, status,
    article_generations_used, article_generations_limit,
    chat_messages_used, chat_messages_limit,
    image_generations_used, image_generations_limit
  ) VALUES (
    NEW.id, 'free', 'active',
    0, 5,
    0, 300,
    0, 3
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment image generations
CREATE OR REPLACE FUNCTION increment_user_image_generations(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET image_generations_used = COALESCE(image_generations_used, 0) + 1, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment article generations
CREATE OR REPLACE FUNCTION increment_user_article_generations(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET article_generations_used = COALESCE(article_generations_used, 0) + 1, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment chat messages
CREATE OR REPLACE FUNCTION increment_user_chat_messages(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET chat_messages_used = COALESCE(chat_messages_used, 0) + 1, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user limits
CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS TABLE (
  plan_id TEXT,
  articles_remaining INTEGER,
  chat_remaining INTEGER,
  images_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.plan_id,
    CASE WHEN us.article_generations_limit = -1 THEN -1
         ELSE GREATEST(0, us.article_generations_limit - us.article_generations_used) END,
    CASE WHEN us.chat_messages_limit = -1 THEN -1
         ELSE GREATEST(0, us.chat_messages_limit - us.chat_messages_used) END,
    CASE WHEN us.image_generations_limit = -1 THEN -1
         ELSE GREATEST(0, us.image_generations_limit - us.image_generations_used) END
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription_for_new_user();

-- Drop and create trigger for updated_at on user_subscriptions
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop and create trigger for updated_at on chat_history
DROP TRIGGER IF EXISTS update_chat_history_updated_at ON public.chat_history;
CREATE TRIGGER update_chat_history_updated_at
  BEFORE UPDATE ON public.chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
