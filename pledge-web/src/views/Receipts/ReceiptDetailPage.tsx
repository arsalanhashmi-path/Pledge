import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Layout } from '../../app/Layout';
import { useStore } from '../../services/store';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Download } from 'lucide-react';
import { ReceiptStatus } from '../../types';
import type { Receipt } from '../../types';

export const ReceiptDetailPage: React.FC = () => {
    const { id } = useParams();
    const { currentUser } = useStore(); // Access current user for "You" logic if needed, but we can also just fetch.
    // Actually, getting currentUser from store is safer for "You" check.

    const [row, setRow] = useState<Receipt | null>(null);
    const [senderAuth, setSenderAuth] = useState<{ name: string, id: string, email: string | null, institution: string | null } | null>(null);
    const [receiverAuth, setReceiverAuth] = useState<{ name: string, id: string, email: string | null, institution: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [acting, setActing] = useState(false);
    const { claimReceipt, rejectReceipt } = useStore();

    useEffect(() => {
        if (!id) return;

        (async () => {
            setLoading(true);
            setError('');

            const { data, error } = await supabase
                .from('receipts')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                setLoading(false);
                setError(error.message);
                return;
            }

            // Fetch sender and recipient details from public_profiles
            const fetchPublicProfile = async (uid: string) => {
                const { data } = await supabase
                    .from('public_profiles')
                    .select('user_id,first_name,last_name,institution,email')
                    .eq('user_id', uid)
                    .maybeSingle();
                return data;
            };

            const fetchProfileByEmail = async (email: string) => {
                const { data } = await supabase
                    .from('public_profiles')
                    .select('user_id,first_name,last_name,institution,email')
                    .eq('email', email.toLowerCase())
                    .maybeSingle();
                return data;
            };

            const senderDirectory = await fetchPublicProfile(data.from_user_id);
            let recipientDirectory = data.to_user_id ? await fetchPublicProfile(data.to_user_id) : null;
            
            // Fallback: If still no recipient profile but we have an email, search by email
            if (!recipientDirectory && data.recipient_email) {
                recipientDirectory = await fetchProfileByEmail(data.recipient_email);
            }

            // Sender Logic
            const senderName = senderDirectory
                ? `${senderDirectory.first_name} ${senderDirectory.last_name}`
                : 'Unknown';
            const senderEmail = senderDirectory?.email || (currentUser?.id === data.from_user_id ? currentUser?.email : null);
            const senderInst = senderDirectory?.institution || null;

            // Recipient Logic
            const receiverName = recipientDirectory
                ? `${recipientDirectory.first_name} ${recipientDirectory.last_name}`
                : (data.recipient_email || 'Unknown');
            const receiverEmail = recipientDirectory?.email || data.recipient_email || (currentUser?.id === data.to_user_id ? currentUser?.email : null);
            const receiverInst = recipientDirectory?.institution || 'Visitor';

            setSenderAuth({
                name: senderName,
                id: data.from_user_id,
                email: senderEmail || null,
                institution: senderInst
            });
            setReceiverAuth({
                name: (receiverName === 'Unknown' && data.recipient_email) ? 'External User' : receiverName,
                id: recipientDirectory?.user_id || data.to_user_id || 'No Account',
                email: receiverEmail || null,
                institution: receiverInst
            });

            // Map data to Receipt
            const mapped: Receipt = {
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

            setRow(mapped);
            setLoading(false);
        })();
    }, [id, currentUser?.id]);

    if (loading) return (
        <Layout>
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted font-bold">Retrieving proof...</div>
            </div>
        </Layout>
    );

    if (error || !row) {
        return (
            <Layout>
                <div className="max-w-md mx-auto py-12 px-4 animate-slide-up">
                    <div className="bg-surface p-8 rounded-[2.5rem] border border-border text-center space-y-4 shadow-xl">
                        <div className="text-red-500 mx-auto w-12 h-12 flex items-center justify-center bg-red-500/10 rounded-full">
                            <XCircle size={32} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-foreground">Proof not found</h2>
                            <p className="text-sm text-muted">{error || "This proof might have been deleted or moved."}</p>
                        </div>
                        <Link to="/receipts" className="block text-sm font-bold text-foreground underline underline-offset-4 hover:text-accent">Back to history</Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const isSender = currentUser?.id === row.from_user_id;
    const isEmailMatch = currentUser?.email && row.recipient_email && currentUser.email.toLowerCase() === row.recipient_email.toLowerCase();
    
    // Allow claiming if status is AWAITING_ACCEPTANCE
    // OR if status is AWAITING_SIGNUP/CONNECTION but the email matches (Late Binding)
    const canClaim = !isSender && (
        row.status === ReceiptStatus.AWAITING_ACCEPTANCE || 
        ((row.status === ReceiptStatus.AWAITING_SIGNUP || row.status === ReceiptStatus.AWAITING_CONNECTION) && isEmailMatch)
    );

    async function handleAccept() {
        if (!id || !row) return;
        setActing(true);
        setError('');

        const result = await claimReceipt(id);

        if (!result.success) {
            setError(result.message);
        } else {
            setRow({ ...row, status: ReceiptStatus.ACCEPTED, accepted_at: new Date().toISOString() });
        }
        setActing(false);
    }

    async function handleReject() {
        if (!id || !row) return;
        setActing(true);
        setError('');

        const result = await rejectReceipt(id);

        if (!result.success) {
            setError(result.message);
        } else {
            setRow({ ...row, status: ReceiptStatus.REJECTED });
        }
        setActing(false);
    }

    return (
        <Layout>
            <div className="max-w-6xl mx-auto py-8 md:py-12 px-4 animate-fade-in">
                <Link to="/receipts" className="inline-flex items-center space-x-2 text-muted hover:text-foreground transition-colors mb-8 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Back to History</span>
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div id="printable-proof-card" className="lg:col-span-2 bg-surface p-8 md:p-12 rounded-[3rem] border border-border shadow-2xl shadow-slate-900/5 space-y-10">
                    <header className="flex items-start justify-between">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Proof Detail</h1>
                            <p className="text-muted font-medium text-sm font-mono">ID: {row.id}</p>
                        </div>
                        <div className={`p-4 rounded-2xl flex items-center justify-center ${
                            row.status === ReceiptStatus.ACCEPTED ? 'bg-emerald-500/10 text-emerald-500' :
                            row.status === ReceiptStatus.REJECTED ? 'bg-red-500/10 text-red-500' :
                            'bg-amber-500/10 text-amber-500'
                        }`}>
                            {row.status === ReceiptStatus.ACCEPTED ? <CheckCircle2 size={24} /> : 
                             row.status === ReceiptStatus.REJECTED ? <XCircle size={24} /> : 
                             <Clock size={24} />}
                        </div>
                    </header>

                    <div className="space-y-8">
                        {/* Verification Section */}
                        {canClaim && (
                            <div className="p-6 bg-background rounded-[2rem] border-2 border-border space-y-4 animate-slide-down">
                                <div className="text-center space-y-1">
                                    <h3 className="text-lg font-bold text-foreground">Verify this Receipt</h3>
                                    <p className="text-sm text-muted">
                                        {row.status === ReceiptStatus.AWAITING_SIGNUP 
                                            ? "Claim this receipt to link it to your account." 
                                            : "Confirm that this impact actually happened."}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button
                                        disabled={acting}
                                        onClick={handleAccept}
                                        className="py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold flex items-center justify-center space-x-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={18} />
                                        <span>{row.status === ReceiptStatus.AWAITING_SIGNUP ? "Claim & Verify" : "Confirm & Verify"}</span>
                                    </button>
                                    <button
                                        disabled={acting}
                                        onClick={handleReject}
                                        className="py-3 bg-surface border border-border text-red-600 rounded-xl font-bold hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        )}

                        {!canClaim && row.status === ReceiptStatus.AWAITING_CONNECTION && !isSender && (
                            <div className="p-6 bg-amber-500/5 rounded-[2rem] border-2 border-amber-500/20 space-y-2 text-center">
                                <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">Connection Required</h3>
                                <p className="text-sm text-muted">You must be connected to the sender before you can accept this receipt.</p>
                                <div className="pt-2">
                                    <Link to="/connections" className="text-sm font-bold text-foreground underline underline-offset-4">Check Network Requests</Link>
                                </div>
                            </div>
                        )}
                        
                        {error && (
                            <div className="p-4 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border border-border p-8 rounded-[2rem] bg-background/50">

                            {/* Sender */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Sender</label>
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-lg font-bold text-foreground">{senderAuth?.name}</div>
                                    {senderAuth?.email && <div className="text-sm text-muted font-medium">{senderAuth.email}</div>}
                                    <div className="text-[10px] text-muted opacity-40 font-mono mt-1 mb-1">{senderAuth?.id}</div>
                                    {senderAuth?.institution && <div className="text-xs font-bold text-muted uppercase tracking-wide bg-surface border border-border self-start px-2 py-1 rounded-md">{senderAuth.institution}</div>}
                                </div>
                            </div>

                            {/* Recipient */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Recipient</label>
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-lg font-bold text-foreground">{receiverAuth?.name}</div>
                                    {receiverAuth?.email && <div className="text-sm text-muted font-medium">{receiverAuth.email}</div>}
                                    <div className="text-[10px] text-muted opacity-40 font-mono mt-1 mb-1">{receiverAuth?.id}</div>
                                    {receiverAuth?.institution && <div className="text-xs font-bold text-muted uppercase tracking-wide bg-surface border border-border self-start px-2 py-1 rounded-md">{receiverAuth.institution}</div>}
                                </div>
                            </div>

                            {/* Divider for Details */}
                            <div className="md:col-span-2 border-t border-border my-2"></div>

                            {/* Global Status */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Global Status</label>
                                <div className={`text-lg font-bold ${
                                    row.status === ReceiptStatus.ACCEPTED ? 'text-emerald-500' :
                                    row.status === ReceiptStatus.REJECTED ? 'text-red-500' :
                                    'text-amber-500'
                                }`}>{row.status}</div>
                            </div>

                            {/* Created At */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Receipt Generation Date</label>
                                <div className="text-sm font-bold text-muted">{new Date(row.created_at).toLocaleString()}</div>
                            </div>

                            {/* Accepted At */}
                            {row.accepted_at && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Receipt Acceptance Date</label>
                                    <div className="text-sm font-bold text-muted">{new Date(row.accepted_at).toLocaleString()}</div>
                                </div>
                            )}

                            {/* Tags */}
                            <div className="md:col-span-2 space-y-1 pt-2">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Tags</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {row.tags?.map(t => (
                                        <span key={t} className="px-3 py-1 bg-surface border border-border text-muted text-[10px] font-bold rounded-lg uppercase tracking-tighter">#{t}</span>
                                    ))}
                                    {(!row.tags || row.tags.length === 0) && <span className="text-muted text-xs italic">No tags</span>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest">Description</label>
                            <div className="p-8 rounded-[2rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-lg font-medium leading-relaxed shadow-xl shadow-slate-900/10 italic">
                                "{row.description || "No public description provided for this interaction."}"
                            </div>
                        </div>
                    </div>

                    </div>
                    {/* End of Card Content */}

                    <div className="space-y-4">
                        <button 
                            onClick={() => window.print()}
                            className="w-full py-4 bg-surface border border-border text-foreground rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-background transition-colors hover:scale-[1.02] active:scale-95"
                        >
                            <Download size={20} />
                            <span>Export Proof</span>
                        </button>

                        <Link to="/create" className="flex w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold items-center justify-center space-x-2 shadow-lg shadow-slate-900/10 hover:scale-[1.02] transition-transform">
                            <span>Document Help</span>
                        </Link>
                        
                        <Link to="/receipts" className="flex w-full py-4 bg-surface border border-border text-foreground rounded-2xl font-bold items-center justify-center hover:bg-background transition-colors hover:scale-[1.02] active:scale-95">
                            <span>All History</span>
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
