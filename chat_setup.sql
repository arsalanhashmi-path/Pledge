-- 1. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    
    -- Ensure sender and recipient are different
    CONSTRAINT check_self_message CHECK (sender_id != recipient_id)
);

-- 2. Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. Policies

-- Policy: View Messages
-- Users can see messages they sent OR received.
CREATE POLICY "Users can view their own messages" 
ON messages FOR SELECT 
USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Policy: Insert Messages
-- Users can only send messages IF:
-- 1. They are the sender.
-- 2. They have an ACCEPTED connection with the recipient.
CREATE POLICY "Users can send messages to connections" 
ON messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM connections c
        WHERE c.accepted = true
          AND (
              -- Case 1: Sender is low_id, Recipient is high_id
              (c.low_id = auth.uid() AND c.high_id = recipient_id)
              OR 
              -- Case 2: Sender is high_id, Recipient is low_id
              (c.low_id = recipient_id AND c.high_id = auth.uid())
          )
    )
);

-- Policy: Update Messages (Mark as Read)
-- Only recipient can update 'read_at', and nothing else (techincally RLS checks row access, column security is separate, 
-- but we usually trust the API to separate concerns, or we can use a trigger for immutability).
-- For now, simple update policy for involved parties.
CREATE POLICY "Recipients can mark as read" 
ON messages FOR UPDATE
USING (auth.uid() = recipient_id);


-- 4. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(sender_id, recipient_id);
