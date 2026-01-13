import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
    id: string;
    sender_id: string;
    recipient_id: string;
    content: string;
    created_at: string;
    read_at?: string;
}

export const chatService = {
    /**
     * Fetch message history between current user and another user.
     */
    async fetchMessages(otherUserId: string): Promise<ChatMessage[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }

        return data as ChatMessage[];
    },

    /**
     * Send a message to a recipient.
     */
    async sendMessage(recipientId: string, content: string): Promise<{ success: boolean; error?: string }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { error } = await supabase
            .from('messages')
            .insert({
                sender_id: user.id,
                recipient_id: recipientId,
                content: content.trim()
            });

        if (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    },

    /**
     * Subscribe to real-time message updates.
     * @param onMessage Callback function when a new message is received (inserted).
     */
    subscribeToMessages(onMessage: (msg: ChatMessage) => void): RealtimeChannel {
        return supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    onMessage(payload.new as ChatMessage);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // console.log('Subscribed to messages');
                }
            });
    },

    /**
     * Mark a conversation thread as read.
     */
    async markThreadRead(otherUserId: string): Promise<void> {
        await supabase.rpc('mark_thread_read', { other_user_id: otherUserId });
    },

    /**
     * Get unread message counts for all senders.
     */
    async getUnreadCounts(): Promise<{ [senderId: string]: number }> {
        const { data, error } = await supabase.rpc('get_unread_counts');
        if (error || !data) return {};

        // Convert array [{sender_id, count}] to map {sender_id: count}
        const counts: { [key: string]: number } = {};
        data.forEach((row: any) => {
            counts[row.sender_id] = row.count;
        });
        return counts;
    }
};
