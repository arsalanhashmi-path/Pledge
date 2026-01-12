import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Layout } from '../../app/Layout';
import { CheckCircle2, Award } from 'lucide-react';
import { ReceiptStatus } from '../../types';
import type { Receipt } from '../../types';

export const UserProfilePage: React.FC = () => {
    const { userId } = useParams();
    const [rows, setRows] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        (async () => {
            const { data } = await supabase
                .from('receipts')
                .select('*')
                .eq('from_user_id', userId)
                .is('is_public', true)
                .eq('status', ReceiptStatus.ACCEPTED)
                .order('created_at', { ascending: false });

            if (data) {
                // Map Supabase data to Receipt type
                const mapped: Receipt[] = data.map((d: any) => ({
                    id: d.id,
                    from_user_id: d.from_user_id,
                    to_user_id: d.to_user_id,
                    tags: d.tags || [],
                    description: d.description,
                    is_public: d.is_public,
                    status: d.status as ReceiptStatus,
                    created_at: d.created_at,
                    accepted_at: d.accepted_at,
                    recipient_email: d.recipient_email,
                    accepted_by_user_id: d.accepted_by_user_id,
                    connection_id: d.connection_id
                }));
                setRows(mapped);
            }
            setLoading(false);
        })();
    }, [userId]);

    if (loading) return (
        <Layout>
            <div className="flex items-center justify-center p-8 text-slate-400 font-bold animate-pulse">Building profile...</div>
        </Layout>
    );

    const givenCount = rows.length;
    const topTags = Array.from(new Set(rows.flatMap(r => r.tags || []))).slice(0, 5);

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-12 py-8 md:py-12 animate-fade-in pb-20">
                {/* Elegant Header */}
                <header className="flex flex-col items-center text-center space-y-6">
                    <div className="relative group">
                        <div className="w-24 h-24 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center text-4xl font-bold shadow-2xl transition-transform group-hover:scale-105 group-hover:rotate-3">
                            {userId?.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                            <Award size={16} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Verified Portfolio</h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Global Citizen • {userId?.split('-')[0]}</p>
                    </div>
                </header>

                {/* Impact Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-8 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-900/5 text-center space-y-2">
                        <div className="text-4xl font-black text-slate-900">{givenCount}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impact Proofs</div>
                    </div>

                    <div className="md:col-span-2 glass-card p-8 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-900/5">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Core Capabilities</h3>
                        <div className="flex flex-wrap gap-2">
                            {topTags.length > 0 ? topTags.map(tag => (
                                <span key={tag} className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-lg shadow-slate-900/10">
                                    {tag}
                                </span>
                            )) : <span className="text-xs text-slate-400 italic">No public skills listed yet.</span>}
                        </div>
                    </div>
                </div>

                {/* Proof Feed */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Verified Feed</h3>
                        <div className="h-px bg-slate-100 flex-1" />
                    </div>

                    {rows.length === 0 ? (
                        <div className="bg-slate-50/50 p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                            <p className="text-slate-400 font-medium italic">This user hasn't made any impact proofs public yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {rows.slice(0, 10).map(r => (
                                <div key={r.id} className="glass-card p-6 rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-900/5 group hover:scale-[1.01] transition-transform">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            <div className="text-sm font-bold text-slate-800 leading-relaxed">
                                                {r.description || "Interaction verified by recipient."}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-1.5">
                                                    {r.tags?.map(t => (
                                                        <span key={t} className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase tracking-wider">#{t}</span>
                                                    ))}
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="text-center pt-8 border-t border-slate-100">
                    <Link to="/" className="inline-flex items-center space-x-2 text-slate-300 hover:text-slate-900 transition-colors">
                        <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center scale-75">
                            <div className="w-1 h-1 bg-current rounded-full" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Pledge Infrastructure</span>
                    </Link>
                </footer>
            </div>
        </Layout>
    );
};
