import React, { useState, useMemo } from 'react';
import { useStore } from '../../services/store';
import { Users, Network, Inbox, Clock, ArrowRight, UserPlus, X, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '../../app/Layout';
import { GraphCanvas } from '../../components/GraphCanvas';
import type { GraphNode, GraphLink } from '../../types';

type Tab = 'NETWORK' | 'REQUESTS' | 'GRAPH';

export function ConnectionsPage() {
    const { connections, users, currentUser, addConnection, acceptConnection, rejectConnection } = useStore();
    const [tab, setTab] = useState<Tab>('NETWORK');
    const [showAddModal, setShowAddModal] = useState(false);
    const [addEmail, setAddEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleAddConnection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addEmail) return;

        setIsSubmitting(true);
        setFeedback(null);

        const result = await addConnection(addEmail);

        setIsSubmitting(false);
        if (result.success) {
            setFeedback({ type: 'success', message: result.message });
            setAddEmail('');
            setTimeout(() => {
                setShowAddModal(false);
                setFeedback(null);
            }, 1500);
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    // 1. My Network: Connections I have (accepted)
    const myNetwork = useMemo(() => {
        if (!currentUser) return [];
        return connections
            .filter(conn => conn.accepted)
            .map(conn => {
                const otherId = conn.low_id === currentUser.id ? conn.high_id : conn.low_id;
                const otherUser = users.find(u => u.id === otherId);
                return {
                    ...conn,
                    other_user_id: otherId,
                    otherUser: otherUser || { id: otherId, maskedName: 'Unknown', institution: 'Unknown', handle: 'unknown' }
                };
            });
    }, [connections, users, currentUser]);

    // 2. Requests: Incoming connections (requested_by != me && !accepted)
    const requests = useMemo(() => {
        if (!currentUser) return [];
        return connections
            .filter(conn => !conn.accepted && conn.requested_by !== currentUser.id)
            .map(conn => {
                const otherId = conn.low_id === currentUser.id ? conn.high_id : conn.low_id;
                const sender = users.find(u => u.id === otherId);
                return {
                    id: conn.id, // Connection ID
                    fromUserId: otherId,
                    senderName: sender ? sender.maskedName : 'Unknown User',
                    createdAt: conn.requested_at
                };
            });
    }, [connections, users, currentUser]);

    // 3. Graph Data Generation
    const graphData = useMemo(() => {
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
            const label = otherUser ? otherUser.maskedName : 'Unknown';

            nodes.push({
                id: otherId,
                label: label,
                strength: 10,
                statusMix: {
                    verified: 1,
                    pending: 0,
                    unclear: 0
                },
                lastInteraction: conn.accepted_at || conn.created_at,
                topTags: []
            });

            links.push({
                source: currentUser.id,
                target: otherId,
                verifiedCount: 1,
                pendingCount: 0,
                unclearCount: 0,
                strength: 1
            });
        });

        return { nodes, links };
    }, [connections, users, currentUser]);

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in pb-20">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-slate-900">Connections</h1>
                        <p className="text-slate-500 font-medium">Manage your professional network and incoming requests.</p>
                    </div>

                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
                        <button
                            onClick={() => setTab('NETWORK')}
                            className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'NETWORK' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <Users size={16} />
                            <span>My Network ({myNetwork.length})</span>
                        </button>
                        <button
                            onClick={() => setTab('REQUESTS')}
                            className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'REQUESTS' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <Inbox size={16} />
                            <span>Requests ({requests.length})</span>
                        </button>
                        <button
                            onClick={() => setTab('GRAPH')}
                            className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'GRAPH' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <Network size={16} />
                            <span>Graph</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-1 hover:shadow-xl"
                    >
                        <UserPlus size={18} />
                        <span>Add Connection</span>
                    </button>
                </header>

                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-900/5 min-h-[500px] overflow-hidden">

                    {/* TAB: NETWORK */}
                    {tab === 'NETWORK' && (
                        <div className="p-0">
                            {myNetwork.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                        <Users size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">No connections yet</h3>
                                        <p className="text-slate-500 text-sm max-w-xs mx-auto">Start creating proofs to build your network.</p>
                                    </div>
                                    <Link to="/create" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10 hover:scale-105 transition-transform">
                                        Create Proof
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {myNetwork.map((conn) => (
                                        <div key={conn.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                                    {conn.otherUser.maskedName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{conn.otherUser.maskedName}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{conn.otherUser.institution || 'Unknown Institution'}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</div>
                                                    <div className="text-sm font-bold text-emerald-600">
                                                        Connected
                                                    </div>
                                                </div>
                                                <div className="text-right hidden md:block">
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Since</div>
                                                    <div className="text-sm font-bold text-slate-700">
                                                        {conn.accepted_at ? new Date(conn.accepted_at).toLocaleDateString() : 'Unknown'}
                                                    </div>
                                                </div>
                                                <Link to={`/u/${conn.other_user_id}`} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-colors">
                                                    <ArrowRight size={18} />
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: REQUESTS */}
                    {tab === 'REQUESTS' && (
                        <div className="p-0">
                            {requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                        <Inbox size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
                                        <p className="text-slate-500 text-sm">You have no pending verification requests.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {requests.map((req) => (
                                        <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-start space-x-4">
                                                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0 border border-amber-100">
                                                    <Clock size={18} />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-sm font-bold text-slate-900">
                                                        Request from <span className="text-slate-700">{req.senderName}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium italic">Sent {new Date(req.createdAt).toLocaleDateString()}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3 pl-14 md:pl-0">
                                                <button
                                                    onClick={() => rejectConnection(req.id)}
                                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => acceptConnection(req.id)}
                                                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-md shadow-slate-900/10 hover:scale-105 transition-transform flex items-center space-x-2"
                                                >
                                                    <span>Accept</span>
                                                    <CheckCircle2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: GRAPH */}
                    {tab === 'GRAPH' && (
                        <div className="h-[600px] w-full bg-slate-50 relative">
                            <div className="absolute inset-0">
                                <GraphCanvas
                                    data={graphData}
                                    onNodeClick={() => { }}
                                    onEdgeClick={() => { }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Connection Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-scale-up">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-900">Add Connection</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-500 text-sm mb-6">
                                Enter the email address of the person you'd like to add to your network. They must already have a Pledge account.
                            </p>

                            <form onSubmit={handleAddConnection} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={addEmail}
                                        onChange={(e) => setAddEmail(e.target.value)}
                                        placeholder="friend@example.com"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-medium"
                                        autoFocus
                                    />
                                </div>

                                {feedback && (
                                    <div className={`p-4 rounded-xl text-sm font-medium flex items-center space-x-2 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        <div className={`w-2 h-2 rounded-full ${feedback.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <span>{feedback.message}</span>
                                    </div>
                                )}

                                <div className="pt-2 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!addEmail || isSubmitting}
                                        className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Adding...' : 'Add Connection'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

        </Layout>
    );
}
