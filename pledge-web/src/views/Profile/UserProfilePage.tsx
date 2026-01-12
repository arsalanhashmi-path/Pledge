import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Layout } from '../../app/Layout';
import { CheckCircle2, Award, Download, FileText, LayoutGrid, Share2, Sparkles, Loader2 } from 'lucide-react';
import { ReceiptStatus } from '../../types';
import type { Receipt } from '../../types';
import { useStore } from '../../services/store';
import { downloadAsCSV } from '../../utils/exportUtils';
import { generateCARStatement } from '../../services/aiService';

type ViewMode = 'PORTFOLIO' | 'CV';

export const UserProfilePage: React.FC = () => {
    const { userId } = useParams();
    const { currentUser } = useStore();
    const [rows, setRows] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('PORTFOLIO');

    // AI CV specific state
    const [aiStatements, setAiStatements] = useState<Record<string, string>>({});
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const isOwner = currentUser?.id === userId;

    useEffect(() => {
        if (!userId) return;

        (async () => {
            const { data } = await supabase
                .from('receipts')
                .select('*')
                .eq('to_user_id', userId) // These are receipts RECEIVED by the user
                .eq('status', ReceiptStatus.ACCEPTED)
                .is('is_public', true)
                .order('created_at', { ascending: false });

            if (data) {
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

    const handleExportCSV = () => {
        downloadAsCSV(rows, `pledge_portfolio_${userId}.csv`);
    };

    const handleGenerateAICV = async () => {
        if (isGeneratingAI) return;
        setIsGeneratingAI(true);

        const newStatements: Record<string, string> = {};

        // Process in small batches or one by one to avoid rate limits
        for (const receipt of rows) {
            if (!aiStatements[receipt.id]) {
                const statement = await generateCARStatement(receipt.description || '', receipt.tags || []);
                newStatements[receipt.id] = statement;
            }
        }

        setAiStatements(prev => ({ ...prev, ...newStatements }));
        setIsGeneratingAI(false);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        // Simple visual feedback could be added here
    };

    if (loading) return (
        <Layout>
            <div className="flex items-center justify-center p-8 text-slate-400 font-bold animate-pulse">Building profile...</div>
        </Layout>
    );

    const receivedCount = rows.length;
    const allTags = rows.flatMap(r => r.tags || []);
    const tagCounts = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag]) => tag);

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-12 py-8 md:py-12 animate-fade-in pb-32">
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
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Trust Portfolio</h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Verified Digital Reputation • {userId?.split('-')[0]}</p>
                    </div>

                    {/* View Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit">
                        <button
                            onClick={() => setViewMode('PORTFOLIO')}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'PORTFOLIO' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <LayoutGrid size={14} />
                            <span>Portfolio</span>
                        </button>
                        <button
                            onClick={() => setViewMode('CV')}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'CV' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <FileText size={14} />
                            <span>Resume / CV</span>
                        </button>
                    </div>
                </header>

                {viewMode === 'PORTFOLIO' ? (
                    <>
                        {/* Impact Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-card p-8 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-900/5 text-center space-y-2">
                                <div className="text-4xl font-black text-slate-900">{receivedCount}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Proofs</div>
                            </div>

                            <div className="md:col-span-2 glass-card p-8 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-900/5">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Core Capabilities</h3>
                                <div className="flex flex-wrap gap-2">
                                    {topTags.length > 0 ? topTags.map(tag => (
                                        <span key={tag} className="px-5 py-2.5 bg-slate-100 text-slate-900 border border-slate-200 rounded-2xl text-xs font-bold hover:bg-slate-900 hover:text-white transition-colors cursor-default">
                                            {tag}
                                        </span>
                                    )) : <span className="text-xs text-slate-400 italic">No public skills listed yet.</span>}
                                </div>
                            </div>
                        </div>

                        {/* Proof Feed */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Verification Wall</h3>
                                <div className="h-px bg-slate-100 flex-1" />
                            </div>

                            {rows.length === 0 ? (
                                <div className="bg-slate-50/50 p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium italic">This user hasn't made any impact proofs public yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {rows.map(r => (
                                        <div key={r.id} className="glass-card p-6 rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-900/5 group hover:-translate-y-1 transition-all">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 border border-emerald-100">
                                                    <CheckCircle2 size={18} />
                                                </div>
                                                <div className="space-y-3 flex-1">
                                                    <div className="text-sm font-bold text-slate-800 leading-relaxed min-h-[3rem]">
                                                        {r.description || "Interaction verified by recipient."}
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-1.5 overflow-hidden">
                                                            {r.tags?.slice(0, 3).map(t => (
                                                                <span key={t} className="text-[8px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase tracking-wider">#{t}</span>
                                                            ))}
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase shrink-0">{new Date(r.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* CV MODE */
                    <div className="space-y-10 animate-slide-up">
                        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 space-y-8 relative overflow-hidden">
                            {/* Decorative dot grid */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 [mask-image:radial-gradient(white,transparent)] flex flex-wrap gap-2 p-4 opacity-50">
                                {[...Array(16)].map((_, i) => <div key={i} className="w-1 h-1 bg-slate-200 rounded-full" />)}
                            </div>

                            <div className="flex justify-between items-start border-b border-slate-100 pb-8">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900">Experience Highlights</h2>
                                    <p className="text-slate-500 font-medium max-w-md italic">AI-generated professional statements backed by verified peer-to-peer data.</p>
                                </div>
                                <button
                                    onClick={handleGenerateAICV}
                                    disabled={isGeneratingAI}
                                    className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isGeneratingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    <span>{Object.keys(aiStatements).length > 0 ? 'Regenerate Highlights' : 'Generate AI Highlights'}</span>
                                </button>
                            </div>

                            <div className="space-y-12">
                                {rows.map((r, idx) => (
                                    <div key={r.id} className="relative pl-8 group">
                                        {/* Timeline Line */}
                                        {idx !== rows.length - 1 && <div className="absolute left-0 top-8 bottom-[-40px] w-0.5 bg-slate-100" />}
                                        {/* Timeline Dot */}
                                        <div className="absolute left-[-4px] top-2 w-2.5 h-2.5 rounded-full bg-slate-900 ring-4 ring-slate-50 transition-transform group-hover:scale-125" />

                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                                <div className="flex gap-2">
                                                    {r.tags?.map(t => (
                                                        <span key={t} className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">#{t}</span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {aiStatements[r.id] ? (
                                                    <p className="text-lg font-bold text-slate-800 leading-tight">
                                                        {aiStatements[r.id]}
                                                    </p>
                                                ) : (
                                                    <p className="text-lg font-bold text-slate-400 italic">
                                                        {r.description}
                                                        <span className="block text-[10px] uppercase mt-1 not-italic opacity-60">Click 'Generate AI Highlights' to polish this point</span>
                                                    </p>
                                                )}
                                                <div className="flex items-center space-x-1.5 text-slate-400 font-bold text-[10px] uppercase italic">
                                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                                    <span>Verified Interaction Log • ID: {r.id.substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {/* Floating Owner Action Bar */}
                {isOwner && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
                        <div className="bg-slate-900/90 backdrop-blur-xl p-2 rounded-[2rem] border border-white/10 shadow-2xl flex items-center space-x-2">
                            <button
                                onClick={() => setViewMode(viewMode === 'PORTFOLIO' ? 'CV' : 'PORTFOLIO')}
                                className="flex items-center space-x-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
                            >
                                {viewMode === 'PORTFOLIO' ? <FileText size={18} /> : <LayoutGrid size={18} />}
                                <span className="text-xs font-bold">Switch to {viewMode === 'PORTFOLIO' ? 'CV View' : 'Portfolio'}</span>
                            </button>

                            <div className="w-px h-8 bg-white/10 mx-2" />

                            <button
                                onClick={handleExportCSV}
                                className="p-3 text-white hover:bg-white/10 rounded-2xl transition-all relative group"
                            >
                                <Download size={20} />
                                <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold">Export CSV</span>
                            </button>

                            <button
                                onClick={handleCopyLink}
                                className="p-3 text-white hover:bg-white/10 rounded-2xl transition-all relative group"
                            >
                                <Share2 size={20} />
                                <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold">Copy Portfolio Link</span>
                            </button>
                        </div>
                    </div>
                )}

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
