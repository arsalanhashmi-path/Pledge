import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Layout } from '../../app/Layout';
import { CheckCircle2, Award, Download, FileText, LayoutGrid, Share2, Sparkles, MapPin, School, Loader2 } from 'lucide-react';
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

    // Profile Details State
    const [userProfile, setUserProfile] = useState<{
        first_name: string;
        last_name: string;
        email: string;
        institution: string;
        institution_id: string;
        batch_year: number;
        major: string;
        campus_code: string;
        is_hostelite: boolean;
        societies: string[];
        roll_number: string;
        created_at: string;
    } | null>(null);
    const [lastInteraction, setLastInteraction] = useState<string | null>(null);

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

            // Fetch User Profile
            const { data: profile } = await supabase
                .from('public_profiles')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (profile) {
                setUserProfile(profile);
            }

            // Calculate Last Interaction (if viewing someone else)
            if (currentUser && currentUser.id !== userId) {
                // Find latest receipt exchanged
                const { data: interaction } = await supabase
                    .from('receipts')
                    .select('created_at')
                    .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${userId}),and(from_user_id.eq.${userId},to_user_id.eq.${currentUser.id})`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (interaction) {
                    setLastInteraction(interaction.created_at);
                }
            }

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
            <div className="flex items-center justify-center p-8 text-muted font-bold animate-pulse">Building profile...</div>
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
            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 pb-32">
                {/* LinkedIn-style Header Card */}
                <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden relative">
                    {/* Banner */}
                    <div className={`h-48 w-full bg-gradient-to-r ${userProfile?.institution_id === 'LUMS' ? 'from-red-950 via-slate-900 to-slate-950' : 'from-emerald-950 via-slate-900 to-slate-950'} relative`}>
                        <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(white,transparent)] flex flex-wrap gap-4 p-4">
                            {[...Array(24)].map((_, i) => <div key={i} className="w-1 h-1 bg-white rounded-full" />)}
                        </div>
                    </div>

                    {/* Profile Header Content */}
                    <div className="px-8 pb-8">
                        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between -mt-16 md:-mt-20 mb-6 gap-6">
                            <div className="relative group shrink-0">
                                <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-900 border-4 border-surface text-white rounded-full flex items-center justify-center text-5xl font-bold shadow-xl overflow-hidden">
                                     {userProfile ? userProfile.first_name.charAt(0).toUpperCase() : userId?.substring(0, 1).toUpperCase()}
                                </div>
                                <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-2.5 rounded-full shadow-lg border-4 border-surface">
                                    <Award size={20} />
                                </div>
                            </div>
                            
                            <div className="flex bg-background p-1 rounded-xl border border-border h-fit">
                                <button
                                    onClick={() => setViewMode('PORTFOLIO')}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'PORTFOLIO' ? 'bg-surface text-foreground shadow-sm border border-border/50' : 'text-muted hover:text-foreground'}`}
                                >
                                    <LayoutGrid size={14} />
                                    <span>Portfolio</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('CV')}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'CV' ? 'bg-surface text-foreground shadow-sm border border-border/50' : 'text-muted hover:text-foreground'}`}
                                >
                                    <FileText size={14} />
                                    <span>Professional CV</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-4">
                                <div className="space-y-1">
                                    <h1 className="text-3xl font-bold text-foreground tracking-tight">
                                        {userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Loading...'}
                                    </h1>
                                    <p className="text-lg text-foreground/80 font-medium">
                                        {userProfile?.major} Student at {userProfile?.institution_id || userProfile?.institution}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted text-sm font-medium pt-1">
                                        <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-500" /> {userProfile?.campus_code || 'LUMS-MAIN'}</span>
                                        <span>•</span>
                                        <button onClick={handleCopyLink} className="text-emerald-500 hover:underline font-bold">Contact info</button>
                                    </div>
                                </div>

                                {lastInteraction && (
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                        <Sparkles size={12} />
                                        Verified Connection • Last seen {new Date(lastInteraction).toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 group">
                                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center shrink-0 border border-border shadow-sm">
                                        <School size={16} className="text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground hover:text-emerald-500 transition-colors cursor-pointer">{userProfile?.institution_id || 'LUMS'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/30 rounded flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                                        <Award size={16} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground hover:text-emerald-500 transition-colors cursor-pointer">{receivedCount} Verified Reputations</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column (Main Content) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* About Section */}
                        <section className="bg-surface rounded-2xl border border-border shadow-sm p-8 space-y-4">
                            <h2 className="text-xl font-bold text-foreground">About</h2>
                            <p className="text-sm text-foreground/70 leading-relaxed font-medium">
                                Verified student at <strong>{userProfile?.institution_id || 'LUMS'}</strong>, currently pursuing studies in <strong>{userProfile?.major || 'Academic Major'}</strong>. 
                                This profile showcases peer-verified interactions and proofs of impact within the campus ecosystem.
                            </p>
                            {userProfile?.societies && userProfile.societies.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {userProfile.societies.map(soc => (
                                        <span key={soc} className="px-3 py-1 bg-background border border-border rounded-full text-[10px] font-bold text-muted uppercase tracking-wider">
                                            {soc}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </section>

                        {viewMode === 'PORTFOLIO' ? (
                            <section className="bg-surface rounded-2xl border border-border shadow-sm p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-foreground">Verified Experience</h2>
                                    <button className="text-emerald-500 hover:text-emerald-400 font-bold text-sm">View Analytics</button>
                                </div>

                                <div className="space-y-8">
                                    {rows.length === 0 ? (
                                        <div className="py-12 text-center text-muted italic font-medium">
                                            No verified proofs have been made public yet.
                                        </div>
                                    ) : (
                                        rows.map((r, idx) => (
                                            <div key={r.id} className="flex gap-4 group">
                                                <div className="flex flex-col items-center shrink-0">
                                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center p-2 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                                        <CheckCircle2 size={24} className="text-emerald-500" />
                                                    </div>
                                                    {idx !== rows.length - 1 && <div className="w-0.5 h-full bg-slate-100 dark:bg-slate-800 my-2" />}
                                                </div>
                                                <div className="pb-8 space-y-2 flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="text-base font-bold text-foreground leading-tight group-hover:text-emerald-500 transition-colors cursor-pointer">{r.description || "Verified Peer Interaction"}</h4>
                                                            <p className="text-sm text-foreground/60 font-semibold">{userProfile?.institution_id} Peer Network</p>
                                                            <p className="text-xs text-muted font-bold uppercase tracking-tight opacity-50">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {r.tags?.map(t => (
                                                            <span key={t} className="text-[9px] font-black text-slate-400 bg-background px-2.5 py-1 rounded border border-border uppercase tracking-widest">#{t}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) )
                                    )}
                                </div>
                            </section>
                        ) : (
                            <section className="bg-surface rounded-2xl border border-border shadow-sm p-10 space-y-8 relative overflow-hidden">
                                <div className="flex justify-between items-start border-b border-border pb-8">
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-foreground">Experience Highlights</h2>
                                        <p className="text-sm text-muted font-medium italic">AI-generated professional statements backed by verified peer-to-peer data.</p>
                                    </div>
                                    <button
                                        onClick={handleGenerateAICV}
                                        disabled={isGeneratingAI}
                                        className="flex items-center space-x-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isGeneratingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        <span>AI Generate</span>
                                    </button>
                                </div>

                                <div className="space-y-12">
                                    {rows.map((r, idx) => (
                                        <div key={r.id} className="relative pl-8 group">
                                            {idx !== rows.length - 1 && <div className="absolute left-0 top-8 bottom-[-40px] w-0.5 bg-slate-100 dark:bg-slate-800" />}
                                            <div className="absolute left-[-4px] top-2 w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white ring-4 ring-surface transition-transform group-hover:scale-125" />
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {aiStatements[r.id] ? (
                                                        <p className="text-base font-bold text-foreground leading-tight">{aiStatements[r.id]}</p>
                                                    ) : (
                                                        <p className="text-base font-bold text-muted italic">{r.description}</p>
                                                    )}
                                                    <div className="flex items-center space-x-1.5 text-muted font-bold text-[10px] uppercase italic">
                                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                                        <span>Verified Interaction • ID: {r.id.substring(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right Column (Sidebar) */}
                    <div className="space-y-6">
                        {/* Education Card */}
                        <section className="bg-surface rounded-2xl border border-border shadow-sm p-8 space-y-6">
                            <h2 className="text-xl font-bold text-foreground">Education</h2>
                            <div className="space-y-6">
                                <div className="flex gap-4 group">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded border border-border flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                        <School size={24} className="text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors cursor-pointer">{userProfile?.institution_id || userProfile?.institution}</h4>
                                        <p className="text-xs text-foreground/70 font-medium">{userProfile?.major}</p>
                                        <p className="text-xs text-muted font-bold opacity-60">2020 - {userProfile?.batch_year}</p>
                                        <div className="pt-2">
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-tighter">Verified Roll: {userProfile?.roll_number}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Stats Section */}
                        <section className="bg-surface rounded-2xl border border-border shadow-sm p-8 space-y-6">
                            <h2 className="text-xl font-bold text-foreground">Analytics</h2>
                            <div className="space-y-6">
                                <div className="space-y-1 group cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-black text-foreground group-hover:text-emerald-500 transition-colors">{receivedCount}</span>
                                        <span className="text-xs font-bold text-muted uppercase tracking-widest">Endorsements</span>
                                    </div>
                                    <p className="text-[10px] text-muted font-medium">Verified student proofs</p>
                                </div>
                                <div className="space-y-1 group cursor-pointer border-t border-border pt-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-black text-foreground group-hover:text-emerald-500 transition-colors">{topTags.length}</span>
                                        <span className="text-xs font-bold text-muted uppercase tracking-widest">Core Skills</span>
                                    </div>
                                    <p className="text-[10px] text-muted font-medium">Based on interactions</p>
                                </div>
                            </div>
                        </section>

                        {/* Top Capabilities */}
                        <section className="bg-surface rounded-2xl border border-border shadow-sm p-8 space-y-6">
                            <h2 className="text-xl font-bold text-foreground">Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {topTags.length > 0 ? topTags.map(tag => (
                                    <div key={tag} className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all cursor-pointer group">
                                        <span>{tag}</span>
                                        <Award size={12} className="text-emerald-500 group-hover:rotate-12 transition-transform" />
                                    </div>
                                )) : <span className="text-xs text-muted italic">No public skills listed.</span>}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Floating Owner Action Bar */}
                {isOwner && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
                        <div className="bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl p-2 rounded-[2rem] border border-white/10 dark:border-slate-900/10 shadow-2xl flex items-center space-x-2">
                            <button
                                onClick={() => setViewMode(viewMode === 'PORTFOLIO' ? 'CV' : 'PORTFOLIO')}
                                className="flex items-center space-x-2 px-5 py-3 bg-white/10 dark:bg-slate-900/10 hover:bg-white/20 dark:hover:bg-slate-900/20 text-white dark:text-slate-900 rounded-2xl transition-all"
                            >
                                {viewMode === 'PORTFOLIO' ? <FileText size={18} /> : <LayoutGrid size={18} />}
                                <span className="text-xs font-bold">Switch to {viewMode === 'PORTFOLIO' ? 'CV View' : 'Portfolio'}</span>
                            </button>

                            <div className="w-px h-8 bg-white/10 dark:bg-slate-900/10 mx-2" />

                            <button
                                onClick={handleExportCSV}
                                className="p-3 text-white dark:text-slate-900 hover:bg-white/10 dark:hover:bg-slate-900/10 rounded-2xl transition-all relative group"
                            >
                                <Download size={20} />
                                <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold">Export CSV</span>
                            </button>

                            <button
                                onClick={handleCopyLink}
                                className="p-3 text-white dark:text-slate-900 hover:bg-white/10 dark:hover:bg-slate-900/10 rounded-2xl transition-all relative group"
                            >
                                <Share2 size={20} />
                                <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold">Copy Portfolio Link</span>
                            </button>
                        </div>
                    </div>
                )}

                <footer className="text-center pt-8 border-t border-border">
                    <Link to="/" className="inline-flex items-center space-x-2 text-muted hover:text-foreground transition-colors">
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
