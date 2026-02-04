-- Add missing title column to chat_history table
ALTER TABLE public.chat_history
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
