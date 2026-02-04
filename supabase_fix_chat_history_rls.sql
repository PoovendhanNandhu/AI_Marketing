-- Fix RLS policies for chat_history to allow upsert operations

-- Drop existing policies
DROP POLICY IF EXISTS chat_history_select_policy ON public.chat_history;
DROP POLICY IF EXISTS chat_history_insert_policy ON public.chat_history;
DROP POLICY IF EXISTS chat_history_update_policy ON public.chat_history;
DROP POLICY IF EXISTS chat_history_delete_policy ON public.chat_history;

-- Create comprehensive policies for authenticated users
-- SELECT: Users can read their own chat history
CREATE POLICY chat_history_select_policy
  ON public.chat_history FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can insert their own chat history
CREATE POLICY chat_history_insert_policy
  ON public.chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own chat history
CREATE POLICY chat_history_update_policy
  ON public.chat_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own chat history
CREATE POLICY chat_history_delete_policy
  ON public.chat_history FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_history TO authenticated;
