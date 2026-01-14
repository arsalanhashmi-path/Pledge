import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
    id: string;
    sender_id: string;
    recipient_id: string;
    content: string;
    created_at: string;
    read_at?: string;
    message_type?: 'text' | 'proof';
    attachment_id?: string;
    proof_data?: any; // Joined receipt data
}

export const chatService = {
    /**
     * Fetch message history between current user and another user.
     */
    async fetchMessages(otherUserId: string): Promise<ChatMessage[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // We fetch messages and optionally join receipt data if it exists
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                proof_data:receipts(*)
            `)
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as ChatMessage[];
    },

    /**
     * Send a text message.
     */
    async sendMessage(recipientId: string, content: string): Promise<ChatMessage> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender_id: user.id,
                recipient_id: recipientId,
                content: content,
                message_type: 'text'
            })
            .select()
            .single();

        if (error) throw error;
        return data as ChatMessage;
    },

    /**
     * Send a proof (receipt) message.
     */
    async sendProofMessage(recipientId: string, proofId: string): Promise<ChatMessage> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender_id: user.id,
                recipient_id: recipientId,
                content: 'Shared a proof', // Fallback text
                message_type: 'proof',
                attachment_id: proofId
            })
            .select(`
                *,
                proof_data:receipts(*)
            `)
            .single();

        if (error) throw error;
        return data as ChatMessage;
    },

    /**
     * Fetch user's receipts that can be shared.
     */
    async fetchMyProofs(): Promise<any[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .eq('from_user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) return [];
        return data;
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
