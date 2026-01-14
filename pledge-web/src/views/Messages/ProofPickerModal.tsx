import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, CheckCircle2, FileText, Plus } from 'lucide-react';
import { chatService } from '../../services/chatService';

interface ProofPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (proofId: string) => void;
    onCreateNew?: () => void;
}

export const ProofPickerModal: React.FC<ProofPickerModalProps> = ({ isOpen, onClose, onSelect, onCreateNew }) => {
    const [proofs, setProofs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            chatService.fetchMyProofs().then(data => {
                setProofs(data);
                setLoading(false);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = proofs.filter(p => 
        (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.recipient_email || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface border border-border w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[80vh] animate-scale-in">
                <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                    <h3 className="font-bold text-lg text-foreground">Share a Proof</h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                onClose();
                                if (onCreateNew) {
                                    onCreateNew();
                                } else {
                                    navigate('/create');
                                }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground text-xs font-bold rounded-full hover:opacity-90 transition-opacity"
                        >
                            <Plus size={14} />
                            Create New
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors">
                            <X size={20} className="text-muted" />
                        </button>
                    </div>
                </div>

                <div className="p-4 border-b border-border bg-background/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                            autoFocus
                            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                            placeholder="Search your proofs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loading ? (
                        <div className="text-center p-8 text-muted text-sm">Loading proofs...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center p-8 text-muted text-sm italic">
                            No proofs found. Create one first!
                        </div>
                    ) : (
                        filtered.map(proof => (
                            <button
                                key={proof.id}
                                onClick={() => onSelect(proof.id)}
                                className="w-full text-left p-4 rounded-xl hover:bg-background border border-transparent hover:border-border transition-all group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${proof.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-sm text-foreground truncate">
                                            {proof.description || 'No description'}
                                        </div>
                                        <div className="text-xs text-muted mt-1">
                                            To: {proof.recipient_email}
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                            {proof.tags?.map((tag: string) => (
                                                <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-muted rounded-full uppercase tracking-wider">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {proof.status === 'ACCEPTED' && (
                                        <CheckCircle2 size={16} className="text-emerald-500 mt-1" />
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
