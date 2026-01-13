import { useMemo, useState, useCallback, useRef } from 'react';
import { Layout } from '../../app/Layout';
import { GraphCanvas } from '../../components/GraphCanvas';
import type { GraphCanvasRef } from '../../components/GraphCanvas';
import { Drawer } from '../../components/Drawer';
import { useStore } from '../../services/store';
import type { GraphPayload, GraphNode, GraphLink } from '../../types';

import { Link } from 'react-router-dom';
import { Plus, Focus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export function HomePage() {
    const { connections, users, currentUser, receipts } = useStore();
    const [selectedItem, setSelectedItem] = useState<{ type: 'NODE' | 'EDGE', node?: GraphNode, edge?: GraphLink } | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'GAVE' | 'RECEIVED'>('ALL');
    const graphRef = useRef<GraphCanvasRef>(null);

    const graphData: GraphPayload = useMemo(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        if (!currentUser) return { nodes, links };

        // 1. Pre-calculate all connection data
        const connectionResults = connections
            .filter(conn => conn.accepted)
            .map(conn => {
                const otherId = conn.low_id === currentUser.id ? conn.high_id : conn.low_id;
                const otherUser = users.find(u => u.id === otherId);
                const sentToOther = receipts.filter(r => r.from_user_id === currentUser.id && (r.to_user_id === otherId || r.recipient_email === otherUser?.email));
                const receivedFromOther = receipts.filter(r => (r.to_user_id === currentUser.id || r.recipient_email === currentUser.email) && r.from_user_id === otherId);

                return {
                    otherId,
                    otherUser,
                    sentCount: sentToOther.length,
                    receivedCount: receivedFromOther.length,
                    verifiedSent: sentToOther.filter(r => r.status === 'ACCEPTED').length,
                    verifiedRec: receivedFromOther.filter(r => r.status === 'ACCEPTED').length,
                    pendingSent: sentToOther.filter(r => r.status === 'AWAITING_SIGNUP' || r.status === 'AWAITING_CONNECTION').length,
                    pendingRec: receivedFromOther.filter(r => r.status === 'AWAITING_SIGNUP' || r.status === 'AWAITING_CONNECTION').length,
                    rejectedSent: sentToOther.filter(r => r.status === 'REJECTED').length,
                    rejectedRec: receivedFromOther.filter(r => r.status === 'REJECTED').length,
                    lastInteraction: conn.accepted_at || conn.created_at
                };
            });

        // 2. Filter nodes based on active filter
        const visibleConnections = connectionResults.filter(c => {
            if (filter === 'ALL') return true;
            if (filter === 'GAVE') return c.sentCount > 0;
            if (filter === 'RECEIVED') return c.receivedCount > 0;
            return false;
        });

        // 3. Add "Me" node with aggregated stats from VISIBLE nodes
        nodes.push({
            id: currentUser.id,
            label: 'You',
            isMe: true, // Tag for anchoring
            strength: 10,
            statusMix: { verified: 0, pending: 0, unclear: 0, rejected: 0 },
            lastInteraction: new Date().toISOString(),
            connectedAt: currentUser.created_at, // Use account creation for "Me"
            topTags: [],
            interactionStats: {
                sent: (filter === 'ALL' || filter === 'GAVE') ? visibleConnections.reduce((acc, c) => acc + c.sentCount, 0) : 0,
                received: (filter === 'ALL' || filter === 'RECEIVED') ? visibleConnections.reduce((acc, c) => acc + c.receivedCount, 0) : 0
            }
        });

        // 4. Add child nodes and links
        visibleConnections.forEach(c => {
            nodes.push({
                id: c.otherId,
                label: c.otherUser ? c.otherUser.maskedName : 'Unknown',
                strength: 5 + (c.sentCount + c.receivedCount),
                statusMix: {
                    verified: c.verifiedSent + c.verifiedRec,
                    pending: c.pendingSent + c.pendingRec,
                    rejected: c.rejectedSent + c.rejectedRec,
                    unclear: 0
                },
                lastInteraction: c.lastInteraction,
                connectedAt: connectionResults.find(cr => cr.otherId === c.otherId)?.lastInteraction, // Using last interaction or connection date
                topTags: [],
                interactionStats: {
                    sent: (filter === 'ALL' || filter === 'RECEIVED') ? c.receivedCount : 0, // Other's OUT is what Me RECEIVED
                    received: (filter === 'ALL' || filter === 'GAVE') ? c.sentCount : 0      // Other's IN is what Me GAVE
                }
            });

            links.push({
                source: currentUser.id,
                target: c.otherId,
                verifiedCount: c.verifiedSent + c.verifiedRec,
                pendingCount: c.pendingSent + c.pendingRec,
                unclearCount: 0,
                sentCount: c.sentCount,
                receivedCount: c.receivedCount,
                strength: 1
            });
        });

        return { nodes, links };
    }, [connections, users, currentUser, receipts, filter]);

    const handleNodeClick = useCallback((node: GraphNode) => setSelectedItem({ type: 'NODE', node }), []);
    const handleEdgeClick = useCallback((edge: GraphLink) => setSelectedItem({ type: 'EDGE', edge }), []);

    const pendingCount = useMemo(() => receipts.filter(r => r.status.startsWith('AWAITING')).length, [receipts]);
    const acceptedCount = useMemo(() => receipts.filter(r => r.status === 'ACCEPTED').length, [receipts]);
    const rejectedCount = useMemo(() => receipts.filter(r => r.status === 'REJECTED').length, [receipts]);
    const connCount = connections.filter(c => c.accepted).length;

    return (
        <Layout>
            <div className="relative w-full h-[calc(100vh-6rem)] overflow-hidden rounded-[2.5rem] border border-border/50 bg-surface shadow-2xl shadow-slate-900/10 dark:shadow-black/50 ring-1 ring-white/20 dark:ring-slate-800">
                
                 {/* Background Grid */}
                 <div className="absolute inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(128, 128, 128, 0.12) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(128, 128, 128, 0.12) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)'
                    }}
                />

                {/* Graph Layer */}
                <div className="absolute inset-0 z-10">
                    <GraphCanvas 
                        ref={graphRef}
                        data={graphData}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={handleEdgeClick}
                        filter={filter}
                    />
                </div>

                {/* Header Information */}
                <div className="absolute top-10 left-10 z-20 pointer-events-none select-none">
                    <div className="space-y-1">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground"
                            style={{ WebkitTextStroke: '1px var(--foreground)', paintOrder: 'stroke fill' }}>
                            Your Orbit
                        </h2>
                        <div className="flex items-center gap-2 text-muted-foreground/80">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Real-time Trust Graph</p>
                        </div>
                    </div>
                </div>

                {/* Top Right Controls */}
                <div className="absolute top-10 right-10 z-20 flex items-center gap-4">
                    {/* Filter Pill */}
                    <div className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl p-1.5 rounded-2xl shadow-xl ring-1 ring-border/50 flex items-center gap-1 transition-all hover:ring-border/80">
                        <button 
                             onClick={() => setFilter('ALL')}
                             className={`px-4 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 ${filter === 'ALL' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}
                        >
                            All
                        </button>
                        <div className="w-px h-4 bg-border/50 mx-1 opacity-50"></div>
                        <button 
                             onClick={() => setFilter('GAVE')}
                             className={`px-4 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${filter === 'GAVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm' : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5'}`}
                             title="You helped them"
                        >
                            <ArrowUpRight size={14} strokeWidth={3} />
                            <span>Gave</span>
                        </button>
                        <button 
                             onClick={() => setFilter('RECEIVED')}
                             className={`px-4 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${filter === 'RECEIVED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm' : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/5'}`}
                             title="They helped you"
                        >
                            <ArrowDownLeft size={14} strokeWidth={3} />
                            <span>Recv</span>
                        </button>
                    </div>

                    {/* Center Button */}
                    <button 
                        onClick={() => graphRef.current?.centerOnUser()}
                        className="p-3.5 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl border border-border/50 text-foreground rounded-2xl shadow-xl ring-1 ring-border/50 transition-all hover:scale-110 active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-900 group"
                        title="Center on Me"
                    >
                        <Focus size={20} className="group-hover:rotate-45 transition-transform duration-500" strokeWidth={2.5} />
                    </button>
                </div>

                 {/* Create Proof Button (Bottom Left) */}
                 <div className="absolute bottom-10 left-10 z-20">
                     <Link to="/create" className="flex items-center space-x-3 px-8 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-[2rem] font-bold shadow-2xl shadow-slate-900/30 dark:shadow-white/10 hover:shadow-slate-900/40 hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all duration-300 group ring-4 ring-white/20 dark:ring-black/20">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500" strokeWidth={3} />
                        <span className="text-sm tracking-wide">Create Proof</span>
                     </Link>
                </div>

                {/* Stats Dashboard (Bottom Right) */}
                <div className="absolute bottom-10 right-10 z-20 animate-slide-up">
                    <div className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl p-7 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] min-w-[240px] hover:scale-[1.02] transition-transform duration-500">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1.5 group cursor-default">
                                <div className="text-3xl font-black text-slate-900 dark:text-white group-hover:scale-105 transition-transform origin-left">{connCount}</div>
                                <div className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none group-hover:opacity-100 transition-opacity">Connections</div>
                            </div>
                            <div className="space-y-1.5 group cursor-default">
                                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform origin-left">{acceptedCount}</div>
                                <div className="text-[9px] font-extrabold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-widest leading-none group-hover:opacity-100 transition-opacity">Accepted</div>
                            </div>
                            <div className="space-y-1.5 group cursor-default">
                                <div className="text-3xl font-black text-amber-500 dark:text-amber-400 group-hover:scale-105 transition-transform origin-left">{pendingCount}</div>
                                <div className="text-[9px] font-extrabold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-widest leading-none group-hover:opacity-100 transition-opacity">Pending</div>
                            </div>
                            <div className="space-y-1.5 group cursor-default">
                                <div className="text-3xl font-black text-rose-500 dark:text-rose-400 group-hover:scale-105 transition-transform origin-left">{rejectedCount}</div>
                                <div className="text-[9px] font-extrabold text-rose-600/80 dark:text-rose-400/80 uppercase tracking-widest leading-none group-hover:opacity-100 transition-opacity">Rejected</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Drawer
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                data={selectedItem}
            />
        </Layout>
    );
}
