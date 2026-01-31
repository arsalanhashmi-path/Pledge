import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from '../../app/Layout';
import { useStore } from '../../services/store';
import { chatService } from '../../services/chatService';
import type { ChatMessage } from '../../services/chatService';
import { Send, MessageCircle, Loader2, Plus, X } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { ProofPickerModal } from './ProofPickerModal';
import { ReceiptDetailView } from '../Receipts/ReceiptDetailView';
import { CreateReceiptForm } from '../Receipts/CreateReceiptForm';
import type { Receipt } from '../../types';
import { ChatSidebar } from './ChatSidebar';
import { MessageBubble } from './MessageBubble';

// Modal for creating a new proof
const CreateProofModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: (receipt: Receipt) => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
             <div className="bg-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl relative border border-border">
                <div className="absolute top-6 right-6 z-10">
                     <button onClick={onClose} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-sm">
                        <X size={20} />
                     </button>
                </div>
                <div className="p-2 md:p-6">
                    <CreateReceiptForm 
                        isInModal={true} 
                        initialRecipientEmail="" 
                        onCancel={onClose}
                        onSuccess={onSuccess}
                    />
                </div>
             </div>
        </div>
    );
};

// Modal for viewing full proof details
const ProofDetailsModal = ({ proofId, onClose }: { proofId: string | null; onClose: () => void }) => {
    if (!proofId) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
             <div className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl relative border border-border">
                <div className="sticky top-0 right-0 z-10 flex justify-end p-6 pointer-events-none">
                     <button onClick={onClose} className="pointer-events-auto p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors">
                        <X size={20} />
                     </button>
                </div>
                <div className="p-2 md:p-6 -mt-16">
                    <ReceiptDetailView receiptId={proofId} onClose={onClose} />
                </div>
             </div>
        </div>
    );
};

export const MessagesPage: React.FC = () => {
    const { connections, users, loading, unreadCounts, setUnreadCount, setActiveConversationId } = useStore();
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState('');

    const [showProofPicker, setShowProofPicker] = useState(false);
    
    // Auth check state
    const [myId, setMyId] = useState<string | null>(null);

    // Modal states
    const [viewingProofId, setViewingProofId] = useState<string | null>(null);
    const [showCreateProof, setShowCreateProof] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get My ID
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setMyId(data.user.id);
        });
    }, []);

    // Filter Accepted Connections
    const activeConnections = useMemo(() => {
        return connections
            .filter(c => c.accepted)
            .map(c => {
                const otherId = c.low_id === myId ? c.high_id : c.low_id;
                const user = users.find(u => u.id === otherId);
                return {
                    id: c.id,
                    otherId,
                    user,
                };
            })
            .filter(c => {
                if (!search) return true;
                return c.user?.maskedName.toLowerCase().includes(search.toLowerCase());
            });
    }, [connections, users, myId, search]);

    // Mark Read & Set Active when selecting a connection
    useEffect(() => {
        if (selectedConnectionId) {
             const connection = activeConnections.find(c => c.id === selectedConnectionId);
             if (connection) {
                 // Tell Store we are viewing this chat
                 setActiveConversationId(connection.otherId);
                 
                 // Clear local badge immediately (global store)
                 setUnreadCount(connection.otherId, 0);
                 // Sync with server
                 chatService.markThreadRead(connection.otherId);
             }
        } else {
            setActiveConversationId(null);
        }
        
        return () => {
            setActiveConversationId(null);
        };
    }, [selectedConnectionId, activeConnections, setActiveConversationId, setUnreadCount]);


    // Fetch Messages when connection selected
    useEffect(() => {
        if (!selectedConnectionId || !myId) {
            setMessages([]);
            return;
        }

        const connection = activeConnections.find(c => c.id === selectedConnectionId);
        if (!connection) return;

        setLoadingMessages(true);
        chatService.fetchMessages(connection.otherId).then(msgs => {
            setMessages(msgs);
            setLoadingMessages(false);
            scrollToBottom();
        })
        .catch(err => {
            console.error(err);
            setLoadingMessages(false);
        });

    }, [selectedConnectionId, myId, activeConnections]);

    // Realtime Subscription
    useEffect(() => {
        if (!myId) return;

        const sub = chatService.subscribeToMessages((newMsg, eventType) => {
            if (eventType === 'DELETE') return;

            // Handle Updates (e.g. read status changes)
            if (eventType === 'UPDATE') {
                // Update message in list if present
                setMessages(prev => prev.map(m => m.id === newMsg.id ? newMsg : m));
                return;
            }

            // Handle INSERTs
            const connection = activeConnections.find(c => c.id === selectedConnectionId);
            const isRelatedToSelection = connection && (newMsg.sender_id === connection.otherId || newMsg.sender_id === myId);

            if (isRelatedToSelection) {
                // If viewing this chat, append message
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                
                // If it came from the other person while we are looking at it, mark read instantly (Layout/service handles db update)
                // Actually we should mark read here if we see it live
                if (newMsg.sender_id !== myId) {
                     chatService.markThreadRead(newMsg.sender_id);
                     setUnreadCount(newMsg.sender_id, 0); 
                }

                scrollToBottom();
            } 
            // Background messages are handled by Layout.tsx/Store for badges
        });

        return () => {
            sub.unsubscribe();
        };
    }, [selectedConnectionId, myId, activeConnections]); 

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !selectedConnectionId) return;

        const connection = activeConnections.find(c => c.id === selectedConnectionId);
        if (!connection) return;

        const content = inputText.trim();
        setInputText(''); // Clear immediately

        try {
            const newMsg = await chatService.sendMessage(connection.otherId, content);
            setMessages(prev => [...prev, newMsg]);
            scrollToBottom();
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    const handleSelectProof = async (proofId: string) => {
        setShowProofPicker(false);
        if (!selectedConnectionId) return;
        const connection = activeConnections.find(c => c.id === selectedConnectionId);
        if (!connection) return;

        try {
            const newMsg = await chatService.sendProofMessage(connection.otherId, proofId);
            setMessages(prev => [...prev, newMsg]);
            scrollToBottom();
        } catch (err) {
            console.error("Failed to send proof", err);
        }
    };

    const selectedUser = activeConnections.find(c => c.id === selectedConnectionId)?.user;

    // Loading Screen
    if (loading && activeConnections.length === 0) {
        return (
            <Layout>
                <div className="h-[calc(100vh-6rem)] w-full flex items-center justify-center bg-surface border border-border rounded-3xl shadow-xl">
                    <div className="flex flex-col items-center gap-3 text-muted">
                        <Loader2 className="animate-spin text-accent" size={48} />
                        <p className="font-medium">Loading connections...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex h-[calc(100vh-6rem)] bg-surface border border-border rounded-3xl shadow-xl overflow-hidden animate-fade-in">
                
                <ChatSidebar 
                    activeConnections={activeConnections}
                    selectedConnectionId={selectedConnectionId}
                    setSelectedConnectionId={setSelectedConnectionId}
                    unreadCounts={unreadCounts}
                    search={search}
                    setSearch={setSearch}
                />

                {/* Chat Area */}
                <div className="flex-1 flex flex-col relative bg-dots-pattern">
                    {selectedConnectionId && selectedUser ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">
                                        {selectedUser.maskedName.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-foreground">{selectedUser.maskedName}</div>
                                        <div className="text-[10px] text-muted font-bold uppercase tracking-wider">Connected</div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                                {loadingMessages ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="animate-spin text-muted" size={24} />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted space-y-2">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <MessageCircle size={20} className="text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium">No messages yet.</p>
                                        <p className="text-xs">Say hello to start the conversation!</p>
                                    </div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <MessageBubble 
                                            key={msg.id || i}
                                            msg={msg}
                                            isMe={msg.sender_id === myId}
                                            setViewingProofId={setViewingProofId}
                                        />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-background border-t border-border">
                                <form onSubmit={handleSend} className="relative flex items-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowProofPicker(true)}
                                        className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:text-foreground rounded-2xl transition-colors"
                                    >
                                        <Plus size={20} />
                                    </button>
                                    <input 
                                        className="w-full bg-slate-100 dark:bg-slate-200 text-slate-900 placeholder:text-slate-500 border-0 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent/50 transition-all font-medium resize-none"
                                        placeholder="Type a message..."
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        autoFocus
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!inputText.trim()}
                                        className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg"
                                    >
                                        <Send size={18} strokeWidth={2.5} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted">
                            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 rotate-12">
                                <MessageCircle size={32} className="text-slate-400 -rotate-12" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Select a connection</h3>
                            <p className="text-sm">Choose a friend from the sidebar to chat.</p>
                        </div>
                    )}
                </div>
            </div>

            <ProofPickerModal 
                isOpen={showProofPicker} 
                onClose={() => setShowProofPicker(false)} 
                onSelect={handleSelectProof} 
                onCreateNew={() => {
                    setShowProofPicker(false);
                    setShowCreateProof(true);
                }}
            />

            <CreateProofModal 
                isOpen={showCreateProof} 
                onClose={() => setShowCreateProof(false)} 
                onSuccess={(receipt) => {
                    setShowCreateProof(false); // Close modal
                    if (selectedConnectionId && receipt) {
                        handleSelectProof(receipt.id);
                    }
                }}
            />

            <ProofDetailsModal 
                proofId={viewingProofId} 
                onClose={() => setViewingProofId(null)} 
            />
        </Layout>
    );
};
