import React from 'react';
import { FileText, CheckCircle2, X, Loader2 } from 'lucide-react';
import type { ChatMessage } from '../../services/chatService';

interface MessageBubbleProps {
    msg: ChatMessage;
    isMe: boolean;
    setViewingProofId: (id: string | null) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, isMe, setViewingProofId }) => {
    const isProof = msg.message_type === 'proof';

    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-slate-900 dark:bg-blue-600 text-white rounded-tr-none border-2 border-white' : 'bg-white dark:bg-slate-200 text-slate-900 border border-border dark:border-transparent rounded-tl-none'}`}>
                {isProof && msg.proof_data ? (
                    <button 
                        onClick={() => setViewingProofId(msg.attachment_id || null)}
                        className="text-left w-full group"
                    >
                        <div className="flex items-center gap-2 mb-1 opacity-90 text-[10px] uppercase font-bold tracking-wider group-hover:underline">
                            <FileText size={12} />
                            Proof of Work
                        </div>
                        <div className="p-3 bg-white/10 rounded-xl border border-white/20 hover:bg-white/20 transition-colors">
                            <div className="font-bold text-sm">{msg.proof_data.description || 'No description'}</div>
                            {msg.proof_data.tags && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                    {msg.proof_data.tags.map((tag: string) => (
                                        <span key={tag} className="px-1.5 py-0.5 bg-black/20 rounded text-[9px] font-bold">
                                            {tag}
                                        </span>
                                    ))}
                                    </div>
                            )}
                            <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${
                                msg.proof_data.status === 'ACCEPTED' ? 'text-emerald-300' :
                                msg.proof_data.status === 'REJECTED' ? 'text-red-300' :
                                'text-amber-300'
                            }`}>
                                {msg.proof_data.status === 'ACCEPTED' ? <CheckCircle2 size={12} /> :
                                    msg.proof_data.status === 'REJECTED' ? <X size={12} /> :
                                    <Loader2 size={12} className="animate-spin" />}
                                
                                {msg.proof_data.status === 'ACCEPTED' ? 'Verified' :
                                    msg.proof_data.status === 'REJECTED' ? 'Rejected' :
                                    'Pending Verification'}
                            </div>
                        </div>
                    </button>
                ) : (
                    msg.content
                )}
                
                <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-muted'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
};
