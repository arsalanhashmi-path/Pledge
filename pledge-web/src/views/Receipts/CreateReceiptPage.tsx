import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Link } from 'react-router-dom';
import { CheckCircle2, Copy, Send, Users, AtSign, Search } from 'lucide-react';
import { makeReminderMessage } from '../../utils/reminderHelper';
import { Layout } from '../../app/Layout';
import { useStore } from '../../services/store';
import type { Receipt } from '../../types';

export function CreateReceiptPage() {
    const { createReceipt, connections, users, currentUser } = useStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<Receipt | null>(null);
    const [generatedLink, setGeneratedLink] = useState('');
    const [myEmail, setMyEmail] = useState<string | null>(null);
    const [recipientType, setRecipientType] = useState<'email' | 'network'>('email');
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        recipientEmail: '',
        tags: '',
        description: '',
        isPublic: false
    });

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
        setRecipientType('email'); // Switch back to see the email or keep it? Let's keep it 'email' for the submission logic
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
            <Layout>
                <div className="max-w-md mx-auto h-full flex items-center justify-center animate-slide-up">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl text-center space-y-6 w-full">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900">Receipt Created</h2>
                            <p className="text-slate-500 text-sm">Send this link to {formData.recipientEmail} to get it verified.</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex items-center gap-3">
                            <code className="flex-1 text-xs text-slate-500 truncate text-left font-mono">{generatedLink}</code>
                            <button onClick={copyLink} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm text-slate-600">
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

                        <div className="pt-2">
                            <Link to="/receipts" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">
                                Back to dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-lg mx-auto py-6 animate-slide-up">
                <div className="mb-8 space-y-2 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-slate-900">Create Proof</h1>
                    <p className="text-slate-500 font-medium">Document the help you provided to someone.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-900/5 border border-slate-200 space-y-6">
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setRecipientType('email')}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${recipientType === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <AtSign size={14} />
                            <span>Email</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRecipientType('network')}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${recipientType === 'network' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={14} />
                            <span>Network</span>
                        </button>
                    </div>

                    {recipientType === 'email' ? (
                        <div className="space-y-2 animate-fade-in">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Recipient Email</label>
                            <input
                                required
                                type="email"
                                name="recipientEmail"
                                value={formData.recipientEmail}
                                onChange={handleChange}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                                placeholder="who did you help?"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
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
                                            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${formData.recipientEmail === contact.email ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-900 hover:border-slate-300'}`}
                                        >
                                            <div className="flex items-center space-x-3 text-left">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${formData.recipientEmail === contact.email ? 'bg-white/20 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                                                    {contact.maskedName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold">{contact.maskedName}</div>
                                                    <div className={`text-[10px] ${formData.recipientEmail === contact.email ? 'text-white/60' : 'text-slate-500'}`}>{contact.institution}</div>
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
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Context Tags</label>
                        <input
                            name="tags"
                            value={formData.tags}
                            onChange={handleChange}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                            placeholder="design, advice, dev... (comma separated)"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">What happened?</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                            placeholder="Briefly describe the favor..."
                        />
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <input
                            type="checkbox"
                            id="isPublic"
                            name="isPublic"
                            checked={formData.isPublic}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <label htmlFor="isPublic" className="text-xs font-bold text-slate-600 cursor-pointer">Make this proof public on my portfolio</label>
                    </div>

                    {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{error}</div>}

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
                    >
                        {loading ? 'Creating Proof...' : 'Generate Verification Link'}
                    </button>
                </form>
            </div>
        </Layout>
    );
}
