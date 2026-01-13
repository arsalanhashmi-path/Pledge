-- RPC: Mark all messages from a specific sender as read for the current user
-- This is called when the user opens a chat thread.
CREATE OR REPLACE FUNCTION mark_thread_read(other_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE messages
    SET read_at = NOW()
    WHERE recipient_id = auth.uid()
      AND sender_id = other_user_id
      AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get unread message counts per sender for the current user
-- This is called on load to populate sidebar badges.
CREATE OR REPLACE FUNCTION get_unread_counts()
RETURNS TABLE (sender_id UUID, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT m.sender_id, COUNT(*)
    FROM messages m
    WHERE m.recipient_id = auth.uid()
      AND m.read_at IS NULL
    GROUP BY m.sender_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
