import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../app/Layout';
import { useStore } from '../../services/store';
import { chatService } from '../../services/chatService';
import type { ChatMessage } from '../../services/chatService';
import { Send, Search, MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export const MessagesPage: React.FC = () => {
    const { connections, users, loading } = useStore();
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState('');
    const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
    
    // Auth check state
    const [myId, setMyId] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get My ID & Unread Counts
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setMyId(data.user.id);
                // Fetch unread
                chatService.getUnreadCounts().then(setUnreadCounts);
            }
        });
    }, []);

    // Filter Accepted Connections
    const activeConnections = connections
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

    // Mark Read when selecting a connection
    useEffect(() => {
        if (selectedConnectionId) {
             const connection = activeConnections.find(c => c.id === selectedConnectionId);
             if (connection) {
                 // Clear local badge immediately
                 setUnreadCounts(prev => ({ ...prev, [connection.otherId]: 0 }));
                 // Sync with server
                 chatService.markThreadRead(connection.otherId);
             }
        }
    }, [selectedConnectionId]);


    // Fetch Messages when connection selected
    useEffect(() => {
        if (!selectedConnectionId || !myId) return;

        const connection = activeConnections.find(c => c.id === selectedConnectionId);
        if (!connection) return;

        setLoadingMessages(true);
        chatService.fetchMessages(connection.otherId).then(msgs => {
            setMessages(msgs);
            setLoadingMessages(false);
            scrollToBottom();
        });

    }, [selectedConnectionId, myId]);

    // Realtime Subscription
    useEffect(() => {
        if (!myId) return;

        const sub = chatService.subscribeToMessages((newMsg) => {
            const connection = activeConnections.find(c => c.id === selectedConnectionId);
            const isRelatedToSelection = connection && (newMsg.sender_id === connection.otherId || newMsg.sender_id === myId);

            if (isRelatedToSelection) {
                // If viewing this chat, append message
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                
                // If it came from the other person while we are looking at it, mark read instantly?
                // Ideally yes, but we rely on the user clicking or focus. 
                // For simplicity, we just won't increment the badge.
                if (newMsg.sender_id !== myId) {
                     chatService.markThreadRead(newMsg.sender_id);
                }

                scrollToBottom();
            } else if (newMsg.sender_id !== myId) {
                // Background message -> Increment badge
                setUnreadCounts(prev => ({
                    ...prev,
                    [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
                }));
            }
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

        await chatService.sendMessage(connection.otherId, content);
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
            <div className="h-[calc(100vh-6rem)] w-full flex bg-surface border border-border rounded-3xl shadow-xl overflow-hidden">
                
                {/* Sidebar List */}
                <div className="w-80 border-r border-border flex flex-col bg-background/50 backdrop-blur-sm">
                    <div className="p-4 border-b border-border space-y-3">
                        <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                            <MessageCircle size={20} className="text-accent" />
                            Messages
                        </h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                            <input 
                                type="text"
                                placeholder="Search connections..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)} 
                                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {activeConnections.length === 0 ? (
                            <div className="text-center text-muted text-xs p-4 italic">
                                No connections found. Connect with peers to start chatting!
                            </div>
                        ) : (
                            activeConnections.map(c => {
                                const unread = unreadCounts[c.otherId] || 0;
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedConnectionId(c.id)}
                                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 relative ${selectedConnectionId === c.id ? 'bg-accent/10 border border-accent/20' : 'hover:bg-background border border-transparent'}`}
                                    >
                                        <div className="relative">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shadow-sm ${selectedConnectionId === c.id ? 'bg-accent' : 'bg-slate-300 dark:bg--700'}`}>
                                                {c.user?.maskedName.charAt(0)}
                                            </div>
                                            {unread > 0 && (
                                                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 h-4 min-w-[16px] flex items-center justify-center rounded-full border-2 border-surface shadow-sm">
                                                    {unread > 9 ? '9+' : unread}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-center">
                                                <div className={`font-bold text-sm truncate ${selectedConnectionId === c.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {c.user?.maskedName}
                                                </div>
                                                {unread > 0 && (
                                                     <div className="w-2 h-2 rounded-full bg-red-500" />
                                                )}
                                            </div>
                                            <div className={`text-[10px] truncate ${unread > 0 ? 'text-foreground font-bold' : 'text-muted'}`}>
                                                {c.user?.institution || 'Unknown Institution'}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

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
                                    messages.map((msg, i) => {
                                        const isMe = msg.sender_id === myId;
                                        return (
                                            <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-slate-900 dark:bg-blue-600 text-white rounded-tr-none border-2 border-white' : 'bg-white dark:bg-slate-200 text-slate-900 border border-border dark:border-transparent rounded-tl-none'}`}>
                                                    {msg.content}
                                                    <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-muted'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-background border-t border-border">
                                <form onSubmit={handleSend} className="relative flex items-end gap-2">
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
        </Layout>
    );
};
