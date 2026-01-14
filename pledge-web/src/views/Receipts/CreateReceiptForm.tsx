import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Link } from 'react-router-dom';
import { CheckCircle2, Copy, Send, Users, AtSign, Search } from 'lucide-react';
import { makeReminderMessage } from '../../utils/reminderHelper';
import { useStore } from '../../services/store';
import type { Receipt } from '../../types';

interface CreateReceiptFormProps {
    initialRecipientEmail?: string;
    onSuccess?: (receipt: Receipt) => void;
    onCancel?: () => void;
    isInModal?: boolean;
}

export function CreateReceiptForm({ initialRecipientEmail, onSuccess, onCancel, isInModal = false }: CreateReceiptFormProps) {
    const { createReceipt, connections, users, currentUser } = useStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<Receipt | null>(null);
    const [generatedLink, setGeneratedLink] = useState('');
    const [myEmail, setMyEmail] = useState<string | null>(null);
    const [recipientType, setRecipientType] = useState<'email' | 'network'>(initialRecipientEmail ? 'email' : 'email');
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        recipientEmail: initialRecipientEmail || '',
        tags: '',
        description: '',
        isPublic: false
    });

    useEffect(() => {
        if (initialRecipientEmail) {
            setFormData(prev => ({ ...prev, recipientEmail: initialRecipientEmail }));
        }
    }, [initialRecipientEmail]);

    const networkContacts = useMemo(() => {
        if (!currentUser) return [];
        return connections
            .filter(conn => conn.accepted)
            .map(conn => {
                const otherId = conn.low_id === currentUser.id ? conn.high_id : conn.low_id;
                const otherUser = users.find(u => u.id === otherId);
                return {
                    id: otherId,
                    email: otherUser?.email || '',
                    maskedName: otherUser?.maskedName || 'Unknown',
                    institution: otherUser?.institution || ''
                };
            })
            .filter(c => c.maskedName.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [connections, users, currentUser, searchQuery]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setMyEmail(data.user?.email || null));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type, checked } = e.target as any;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSelectContact = (email: string) => {
        setFormData(prev => ({ ...prev, recipientEmail: email }));
        setRecipientType('email');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const recipientEmail = formData.recipientEmail.trim().toLowerCase();

        if (myEmail && recipientEmail === myEmail) {
            setError('You cannot send a receipt to yourself.');
            setLoading(false);
            return;
        }

        const tagsArray = formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);

        const result = await createReceipt(
            recipientEmail,
            tagsArray,
            formData.description,
            formData.isPublic
        );

        if (!result.success) {
            setError(result.message);
        } else {
            setCreated(result.receipt || null);
            if (result.receipt) {
                const link = `${window.location.origin}/c/${result.receipt.id}`;
                setGeneratedLink(link);
                // If provided, call onSuccess. We might await user action or just call it immediately?
                // For modal flow, probably call it after "Done" or immediately?
                // Let's NOT call it immediately because the user sees the success screen.
            }
        }
        setLoading(false);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        alert('Link copied!');
    };

    function openWhatsApp() {
        const msg = makeReminderMessage(generatedLink);
        window.open("https://wa.me/?text=" + encodeURIComponent(msg));
    }

    if (created) {
        return (
            <div className={`flex items-center justify-center animate-slide-up ${isInModal ? '' : 'h-full'}`}>
                <div className={`bg-surface p-8 rounded-[2rem] border border-border shadow-xl text-center space-y-6 w-full ${isInModal ? 'shadow-none border-0 p-0' : ''}`}>
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">Receipt Created</h2>
                        <p className="text-muted text-sm">Send this link to {formData.recipientEmail} to get it verified.</p>
                    </div>

                    <div className="p-4 bg-background rounded-2xl border border-dashed border-border flex items-center gap-3">
                        <code className="flex-1 text-xs text-muted truncate text-left font-mono">{generatedLink}</code>
                        <button onClick={copyLink} className="p-2 hover:bg-surface rounded-lg transition-colors shadow-sm text-muted hover:text-foreground">
                            <Copy size={16} />
                        </button>
                    </div>

                    <button
                        onClick={openWhatsApp}
                        className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-500/20"
                    >
                        <Send size={18} />
                        <span>Send via WhatsApp</span>
                    </button>
                    
                    {onSuccess && (
                        <button
                            onClick={() => onSuccess(created!)}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95 shadow-lg"
                        >
                            Return & Share
                        </button>
                    )}

                    {!isInModal && (
                        <div className="pt-2">
                            <Link to="/receipts" className="text-sm font-bold text-muted hover:text-foreground transition-colors">
                                Back to dashboard
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`py-6 animate-slide-up ${isInModal ? 'py-0' : 'max-w-lg mx-auto'}`}>
            <div className={`mb-8 space-y-2 text-center ${isInModal ? 'md:text-center pt-4' : 'md:text-left'}`}>
                <h1 className="text-3xl font-bold text-foreground">Create Proof</h1>
                {!isInModal && <p className="text-muted font-medium">Document the help you provided to someone.</p>}
            </div>

            <form onSubmit={handleSubmit} className={`bg-surface p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-900/5 border border-border space-y-6 ${isInModal ? 'shadow-none border-0 p-0 rounded-none' : ''}`}>
                <div className="flex bg-background p-1 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setRecipientType('email')}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${recipientType === 'email' ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
                    >
                        <AtSign size={14} />
                        <span>Email</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRecipientType('network')}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${recipientType === 'network' ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
                    >
                        <Users size={14} />
                        <span>Network</span>
                    </button>
                </div>

                {recipientType === 'email' ? (
                    <div className="space-y-2 animate-fade-in">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-widest ml-1">Recipient Email</label>
                        <input
                            required
                            type="email"
                            name="recipientEmail"
                            value={formData.recipientEmail}
                            onChange={handleChange}
                            className="w-full p-4 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all text-sm font-medium text-foreground placeholder:text-muted/40"
                            placeholder="who did you help?"
                        />
                    </div>
                ) : (
                    <div className="space-y-4 animate-fade-in">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all text-sm font-medium text-foreground placeholder:text-muted/40"
                                placeholder="Search your network..."
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {networkContacts.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs italic">
                                    No contacts found in your network.
                                </div>
                            ) : (
                                networkContacts.map((contact: any) => (
                                    <button
                                        key={contact.id}
                                        type="button"
                                        onClick={() => handleSelectContact(contact.email)}
                                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${formData.recipientEmail === contact.email ? 'bg-slate-900 border-slate-900 dark:bg-white dark:border-white text-white dark:text-slate-900' : 'bg-background border-border text-foreground hover:border-accent/50'}`}
                                    >
                                        <div className="flex items-center space-x-3 text-left">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${formData.recipientEmail === contact.email ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900' : 'bg-surface border border-border text-muted'}`}>
                                                {contact.maskedName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold">{contact.maskedName}</div>
                                                <div className={`text-[10px] ${formData.recipientEmail === contact.email ? 'text-white/60 dark:text-slate-900/60' : 'text-muted'}`}>{contact.institution}</div>
                                            </div>
                                        </div>
                                        {formData.recipientEmail === contact.email && <CheckCircle2 size={16} />}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-widest ml-1">Context Tags</label>
                    <input
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        className="w-full p-4 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all text-sm font-medium text-foreground placeholder:text-muted/40"
                        placeholder="design, advice, dev... (comma separated)"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-widest ml-1">What happened?</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full p-4 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all text-sm font-medium text-foreground placeholder:text-muted/40 resize-none"
                        placeholder="Briefly describe the favor..."
                    />
                </div>

                <div className="flex items-center space-x-3 p-4 bg-background rounded-2xl border border-border">
                    <input
                        type="checkbox"
                        id="isPublic"
                        name="isPublic"
                        checked={formData.isPublic}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-border bg-surface text-accent focus:ring-accent"
                    />
                    <label htmlFor="isPublic" className="text-xs font-bold text-muted cursor-pointer">Make this proof public on my portfolio</label>
                </div>

                {error && <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{error}</div>}

                <div className="flex gap-3">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        disabled={loading}
                        type="submit"
                        className="flex-1 py-4 bg-emerald-700 text-white rounded-2xl font-bold hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-xl shadow-emerald-900/10 active:scale-[0.98]"
                    >
                        {loading ? 'Creating Proof...' : 'Generate Proof'}
                    </button>
                </div>
            </form>
        </div>
    );
}
