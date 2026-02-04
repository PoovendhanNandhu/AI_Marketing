-- PART 4: PERMISSIONS
-- Run this after Part 3

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT ON public.chat_history TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION increment_user_image_generations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_article_generations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_chat_messages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_limits(UUID) TO authenticated;
