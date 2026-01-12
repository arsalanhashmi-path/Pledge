import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Layout } from '../../app/Layout';
import { useStore } from '../../services/store';
import { ReceiptStatus } from '../../types';
import { CheckCircle2, XCircle, ArrowLeft, Clock } from 'lucide-react';

/* 
  Reusing types from central definition to ensure consistency.
*/
import type { Receipt } from '../../types';

export const VerifyReceiptPage: React.FC = () => {
    const { id } = useParams();
    const { claimReceipt, rejectReceipt } = useStore();
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);
    const [error, setError] = useState('');

    async function load() {
        if (!id) return;
        setLoading(true);
        setError('');

        const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .eq('id', id)
            .single();

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        // Map manual fetch to app type
        const mappedReceipt: Receipt = {
            id: data.id,
            from_user_id: data.from_user_id,
            to_user_id: data.to_user_id,
            tags: data.tags || [],
            description: data.description,
            is_public: data.is_public,
            status: data.status as ReceiptStatus,
            created_at: data.created_at,
            accepted_at: data.accepted_at,
            recipient_email: data.recipient_email,
            accepted_by_user_id: data.accepted_by_user_id,
            connection_id: data.connection_id
        };

        setReceipt(mappedReceipt);
    }

    useEffect(() => {
        load();
    }, [id]);

    async function handleAccept() {
        if (!id) return;
        setActing(true);
        setError('');

        const result = await claimReceipt(id);

        if (!result.success) {
            setError(result.message);
        } else {
            // Refresh local view
            await load();
        }
        setActing(false);
    }

    async function handleReject() {
        if (!id) return;
        setActing(true);
        setError('');

        const result = await rejectReceipt(id);

        if (!result.success) {
            setError(result.message);
        } else {
            // Refresh local view
            await load();
        }
        setActing(false);
    }

    if (loading) return (
        <Layout>
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-slate-400 font-bold">Loading receipt...</div>
            </div>
        </Layout>
    );

    if (error && !receipt) {
        return (
            <Layout>
                <div className="max-w-md mx-auto py-12 px-4 animate-slide-up">
                    <div className="glass-card p-8 rounded-[2.5rem] text-center space-y-4 shadow-xl">
                        <div className="text-red-500 mx-auto w-12 h-12 flex items-center justify-center bg-red-50 rounded-full">
                            <XCircle size={32} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-900">Couldn’t load receipt</h2>
                            <p className="text-sm text-slate-500">{error}</p>
                        </div>
                        <Link to="/receipts" className="block text-sm font-bold text-slate-900 underline underline-offset-4 hover:text-slate-700">Back to history</Link>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!receipt) return null;

    return (
        <Layout>
            <div className="max-w-2xl mx-auto py-8 md:py-12 px-4 animate-fade-in">
                <Link to="/receipts" className="inline-flex items-center space-x-2 text-slate-400 hover:text-slate-900 transition-colors mb-8 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Back to History</span>
                </Link>

                <div className="glass-card p-8 md:p-12 rounded-[3rem] border border-slate-200/60 shadow-2xl shadow-slate-900/5 space-y-10">
                    <header className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Verify Action</h1>
                        <p className="text-slate-500 font-medium">Please review the details below before confirming.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ring-1 ring-slate-100 p-8 rounded-[2rem] bg-slate-50/50">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipient</label>
                            <div className="text-lg font-bold text-slate-900">{receipt.recipient_email}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Recorded</label>
                            <div className="text-lg font-bold text-slate-900">{new Date(receipt.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Context Tags</label>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {receipt.tags?.map(t => (
                                    <span key={t} className="px-3 py-1 bg-white border border-slate-200 text-slate-500 text-[10px] font-bold rounded-lg uppercase tracking-tighter">#{t}</span>
                                ))}
                            </div>
                        </div>
                        {receipt.description && (
                            <div className="md:col-span-2 space-y-1 pt-4 border-t border-slate-200/50">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Private Note</label>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{receipt.description}"</p>
                            </div>
                        )}
                    </div>

                    {(receipt.status === ReceiptStatus.AWAITING_SIGNUP || receipt.status === ReceiptStatus.AWAITING_CONNECTION) ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <button
                                    disabled={acting}
                                    onClick={handleAccept}
                                    className="md:col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50"
                                >
                                    <CheckCircle2 size={18} />
                                    <span>{acting ? 'Processing...' : 'Verify this help'}</span>
                                </button>

                                <button
                                    disabled={acting}
                                    onClick={handleReject}
                                    className="py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Reject
                                </button>
                            </div>

                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className={`p-6 rounded-[2rem] border flex items-center space-x-4 ${receipt.status === ReceiptStatus.ACCEPTED ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${receipt.status === ReceiptStatus.ACCEPTED ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                    {receipt.status === ReceiptStatus.ACCEPTED ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Successfully {receipt.status.toLowerCase()}</h3>
                                    <p className="text-sm opacity-80 font-medium">This interaction has been updated in the global history.</p>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3">
                                <Link to="/receipts" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-center shadow-lg shadow-slate-900/10 hover:scale-[1.02] transition-transform">
                                    Go to History
                                </Link>
                                <Link to="/create" className="flex-1 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold text-center hover:bg-slate-50 transition-colors">
                                    Create New
                                </Link>
                            </div>
                        </div>
                    )}

                    {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold">{error}</div>}
                </div>
            </div>
        </Layout>
    );
};
