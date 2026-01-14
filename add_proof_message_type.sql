-- Add message_type and attachment_id to messages table safely
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES receipts(id);

-- Add index for attachment lookups if needed
CREATE INDEX IF NOT EXISTS idx_messages_attachment ON messages(attachment_id);
