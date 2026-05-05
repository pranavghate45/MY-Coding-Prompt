-- Convert chat ownership to stable account string IDs.
-- This allows admin/non-numeric account ids to have isolated history.
ALTER TABLE chats
ALTER COLUMN user_id TYPE TEXT
USING user_id::text;