import { useMemo, useState, useCallback } from 'react';
import { Layout } from '../../app/Layout';
import { GraphCanvas } from '../../components/GraphCanvas';
import { Drawer } from '../../components/Drawer';
import { useStore } from '../../services/store';
import type { GraphPayload, GraphNode, GraphLink } from '../../types';

import { Link } from 'react-router-dom';
import { Plus, Activity, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export function HomePage() {
    const { connections, users, currentUser, receipts } = useStore();
    const [selectedItem, setSelectedItem] = useState<{ type: 'NODE' | 'EDGE', node?: GraphNode, edge?: GraphLink } | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'GAVE' | 'RECEIVED'>('ALL');

    const graphData: GraphPayload = useMemo(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        if (!currentUser) return { nodes, links };

        // Add "Me" node
        nodes.push({
            id: currentUser.id,
            label: 'You',
            strength: 10,
            statusMix: { verified: 0, pending: 0, unclear: 0 },
            lastInteraction: new Date().toISOString(),
            topTags: []
        });

        connections.forEach(conn => {
            if (!conn.accepted) return;

            const otherId = conn.low_id === currentUser.id ? conn.high_id : conn.low_id;
            const otherUser = users.find(u => u.id === otherId);

            // Filtering logic
            const sentToOther = receipts.filter(r => r.from_user_id === currentUser.id && (r.to_user_id === otherId || r.recipient_email === otherUser?.email));
            const receivedFromOther = receipts.filter(r => (r.to_user_id === currentUser.id || r.recipient_email === currentUser.email) && r.from_user_id === otherId);

            if (filter === 'GAVE' && sentToOther.length === 0) return;
            if (filter === 'RECEIVED' && receivedFromOther.length === 0) return;

            const label = otherUser ? otherUser.maskedName : 'Unknown';

            nodes.push({
                id: otherId,
                label: label,
                strength: 5 + (sentToOther.length + receivedFromOther.length),
                statusMix: {
                    verified: sentToOther.filter(r => r.status === 'ACCEPTED').length + receivedFromOther.filter(r => r.status === 'ACCEPTED').length,
                    pending: sentToOther.filter(r => r.status !== 'ACCEPTED').length + receivedFromOther.filter(r => r.status !== 'ACCEPTED').length,
                    unclear: 0
                },
                lastInteraction: conn.accepted_at || conn.created_at,
                topTags: []
            });

            links.push({
                source: currentUser.id,
                target: otherId,
                verifiedCount: sentToOther.filter(r => r.status === 'ACCEPTED').length + receivedFromOther.filter(r => r.status === 'ACCEPTED').length,
                pendingCount: sentToOther.filter(r => r.status !== 'ACCEPTED').length + receivedFromOther.filter(r => r.status !== 'ACCEPTED').length,
                unclearCount: 0,
                strength: 1
            });
        });

        return { nodes, links };
    }, [connections, users, currentUser, receipts, filter]);

    const handleNodeClick = useCallback((node: GraphNode) => setSelectedItem({ type: 'NODE', node }), []);
    const handleEdgeClick = useCallback((edge: GraphLink) => setSelectedItem({ type: 'EDGE', edge }), []);

    const stats = useMemo(() => ({
        people: graphData.links.length,
        verified: connections.filter(c => c.accepted).length,
        pending: connections.filter(c => !c.accepted && c.requested_by !== currentUser?.id).length
    }), [graphData.links.length, connections, currentUser?.id]);

    return (
        <Layout>
            <div className="relative w-full h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">

                {/* Floating Controls Layer */}
                <div className="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between">

                    {/* Top Bar */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pointer-events-auto">

                        {/* Mode Toggle & Stats */}
                        <div className="flex flex-col gap-4 animate-slide-up">
                            <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 inline-flex flex-col w-fit">
                                <h2 className="text-sm font-bold text-slate-900 mb-1">My Network</h2>
                                <p className="text-xs text-slate-500 font-medium tracking-tight">Visualize your verified campus connections.</p>
                            </div>

                            {/* Quick Stats Widget */}
                            <div className="hidden md:block bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 w-64 animate-fade-in transition-all">
                                <div className="flex items-center space-x-2 mb-3 text-slate-400">
                                    <Activity size={14} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Network Pulse</span>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <div className="text-3xl font-bold text-slate-800 tracking-tight">{stats.people}</div>
                                        <div className="text-[10px] text-slate-500 font-medium mt-1">Unique People</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-slate-800 tracking-tight">{stats.verified}</div>
                                        <div className="text-[10px] text-slate-500 font-medium mt-1">Verified Receipts</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filter Toggle & Primary CTA */}
                        <div className="flex flex-col md:flex-row items-center gap-4 pointer-events-auto">
                            {/* Filter Toggle */}
                            <div className="bg-white/80 backdrop-blur-md p-1 rounded-xl shadow-lg border border-white/20 flex">
                                <button
                                    onClick={() => setFilter('ALL')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('GAVE')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${filter === 'GAVE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <ArrowUpRight size={14} />
                                    <span>Gave Help</span>
                                </button>
                                <button
                                    onClick={() => setFilter('RECEIVED')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${filter === 'RECEIVED' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <ArrowDownLeft size={14} />
                                    <span>Received Help</span>
                                </button>
                            </div>

                            <Link
                                to="/create"
                                className="group flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-xl font-semibold shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-1 hover:shadow-2xl active:translate-y-0"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                <span>Create Proof</span>
                            </Link>
                        </div>
                    </div>

                    {/* Bottom Controls (Legend) */}
                    <div className="flex justify-between items-end pointer-events-auto animate-fade-in">
                        <div className="bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 flex items-center space-x-6 text-xs font-medium text-slate-600">
                            <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                <span>Verified</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></span>
                                <span>Pending</span>
                            </div>
                            <div className="h-4 w-px bg-slate-200"></div>
                            <span className="text-slate-400">Pinch/Scroll to zoom</span>
                        </div>
                    </div>
                </div>

                {/* Graph Canvas Layer */}
                <div className="flex-1 w-full h-full relative z-0">
                    {graphData.nodes.length <= 1 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 backdrop-blur-sm">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100 animate-bounce">
                                <Users size={32} className="text-slate-300" />
                            </div>
                            <p className="font-bold text-xl text-slate-700 mb-1">Your graph is waiting.</p>
                            <p className="text-sm text-slate-500">Recorded interactions will appear here.</p>
                        </div>
                    ) : (
                        <GraphCanvas
                            data={graphData}
                            onNodeClick={handleNodeClick}
                            onEdgeClick={handleEdgeClick}
                        />
                    )}
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
