import React, { useState, useMemo } from 'react';
import { useStore } from '../../services/store';
import { Users, Inbox, Clock, UserPlus, X, CheckCircle2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '../../app/Layout';

type Tab = 'NETWORK' | 'REQUESTS';

export function ConnectionsPage() {
    const { connections, users, currentUser, addConnection, acceptConnection, rejectConnection, removeConnection, loading } = useStore();
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



    return (
        <Layout>
            {loading ? (
                <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 animate-fade-in">
                    <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
                    <p className="text-muted font-bold animate-pulse">Syncing your network...</p>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in pb-20">
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-foreground">Connections</h1>
                        <p className="text-muted font-medium">Manage your professional network and incoming requests.</p>
                    </div>

                    <div className="flex bg-surface p-1 rounded-xl border border-border shadow-sm w-fit">
                        <button
                            onClick={() => setTab('NETWORK')}
                            className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'NETWORK' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-muted hover:text-foreground'}`}
                        >
                            <Users size={16} />
                            <span>My Network ({myNetwork.length})</span>
                        </button>
                        <button
                            onClick={() => setTab('REQUESTS')}
                            className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'REQUESTS' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-muted hover:text-foreground'}`}
                        >
                            <Inbox size={16} />
                            <span>Requests ({requests.length})</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center space-x-2 px-6 py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-1 hover:shadow-xl"
                    >
                        <UserPlus size={18} />
                        <span>Add Connection</span>
                    </button>
                </header>

                <div className="bg-surface rounded-[2rem] border border-border shadow-xl shadow-slate-900/5 min-h-[500px] overflow-hidden">

                    {/* TAB: NETWORK */}
                    {tab === 'NETWORK' && (
                        <div className="p-0">
                            {myNetwork.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center text-muted border border-border">
                                        <Users size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground">No connections yet</h3>
                                        <p className="text-muted text-sm max-w-xs mx-auto">Start creating proofs to build your network.</p>
                                    </div>
                                    <Link to="/create" className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10 hover:scale-105 transition-transform">
                                        Create Proof
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {myNetwork.map((conn) => (
                                        <Link 
                                            key={conn.id} 
                                            to={`/u/${conn.other_user_id}`}
                                            className="p-6 flex items-center justify-between hover:bg-background/50 transition-colors group cursor-pointer block"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-background rounded-full border border-border flex items-center justify-center text-muted font-bold text-sm">
                                                    {conn.otherUser.maskedName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground group-hover:text-accent transition-colors">{conn.otherUser.maskedName}</div>
                                                    <div className="text-xs text-muted font-medium">{conn.otherUser.institution || 'Unknown Institution'}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-[10px] uppercase font-bold text-muted opacity-40 tracking-wider">Status</div>
                                                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                        Connected
                                                    </div>
                                                </div>
                                                <div className="text-right hidden md:block">
                                                    <div className="text-[10px] uppercase font-bold text-muted opacity-40 tracking-wider">Since</div>
                                                    <div className="text-sm font-bold text-foreground">
                                                        {conn.accepted_at ? new Date(conn.accepted_at).toLocaleDateString() : 'Unknown'}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={async (e) => {
                                                        e.preventDefault(); // Prevent Link navigation
                                                        e.stopPropagation();
                                                        if (window.confirm("Remove this connection?")) {
                                                            await removeConnection(conn.id);
                                                        }
                                                    }}
                                                    className="p-2 bg-background border border-border rounded-lg text-muted hover:text-red-500 hover:border-red-500 transition-colors"
                                                    title="Remove Connection"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </Link>
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
                                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center text-muted border border-border">
                                        <Inbox size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-foreground">All caught up!</h3>
                                        <p className="text-muted text-sm">You have no pending verification requests.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {requests.map((req) => (
                                        <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-background/50 transition-colors">
                                            <div className="flex items-start space-x-4">
                                                <div className="w-10 h-10 bg-accent/10 text-accent rounded-full flex items-center justify-center shrink-0 border border-accent/20">
                                                    <Clock size={18} />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-sm font-bold text-foreground">
                                                        Request from <span className="opacity-80">{req.senderName}</span>
                                                    </div>
                                                    <div className="text-xs text-muted font-medium italic">Sent {new Date(req.createdAt).toLocaleDateString()}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3 pl-14 md:pl-0">
                                                <button
                                                    onClick={() => rejectConnection(req.id)}
                                                    className="px-4 py-2 bg-surface border border-border text-muted hover:text-red-500 hover:border-red-500/50 text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => acceptConnection(req.id)}
                                                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-md shadow-slate-900/10 hover:scale-105 transition-transform flex items-center space-x-2"
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

                </div>
                </div>
            )}

            {/* Add Connection Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddModal(false)} />
                    <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-scale-up border border-border flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-border flex items-center justify-between bg-background/50 backdrop-blur-md">
                            <div>
                                <h3 className="font-bold text-xl text-foreground">Grow your Network</h3>
                                <p className="text-xs text-muted font-medium mt-1">Connect with people you trust</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-background rounded-full text-muted hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-0 overflow-y-auto">
                            {/* Section 1: Share Link */}
                            <div className="p-6 border-b border-border bg-slate-50/50 dark:bg-slate-900/20">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 block flex items-center gap-2">
                                    <UserPlus size={14} />
                                    <span>Share your referral link</span>
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono text-muted truncate select-all">
                                        {window.location.origin}/signup?ref={currentUser?.id}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const link = `${window.location.origin}/signup?ref=${currentUser?.id}`;
                                            navigator.clipboard.writeText(link);
                                            alert("Link copied!");
                                        }}
                                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold font-sm hover:scale-105 transition-transform shadow-lg shadow-slate-900/10 whitespace-nowrap"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <p className="text-xs text-muted mt-2 ml-1">
                                    Anyone who signs up with this link will auto-connect to you.
                                </p>
                            </div>

                            {/* Section 2: Email Invite */}
                            <div className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-px bg-border flex-1" />
                                    <span className="text-xs font-bold text-muted uppercase">OR</span>
                                    <div className="h-px bg-border flex-1" />
                                </div>

                                <form onSubmit={handleAddConnection} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">Invite by Email</label>
                                        <input
                                            type="email"
                                            value={addEmail}
                                            onChange={(e) => setAddEmail(e.target.value)}
                                            placeholder="friend@university.edu"
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all font-medium text-foreground"
                                        />
                                    </div>

                                    {feedback && (
                                        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${feedback.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            <span>{feedback.message}</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!addEmail) return;
                                                const subject = encodeURIComponent("Join me on Pledge");
                                                const link = `${window.location.origin}/signup?ref=${currentUser?.id}`;
                                                const body = encodeURIComponent(`Hey,\n\nI'd like to add you to my trust network on Pledge. Sign up here:\n\n${link}\n\nThanks!`);
                                                window.location.href = `mailto:${addEmail}?subject=${subject}&body=${body}`;
                                            }}
                                            disabled={!addEmail}
                                            className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                        >
                                            Send Invite
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!addEmail || isSubmitting}
                                            className="px-4 py-3 bg-accent/10 text-accent border border-accent/20 rounded-xl font-bold hover:bg-accent/20 transition-colors disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Adding...' : 'Direct Add'}
                                        </button>
                                    </div>
                                    <p className="text-center text-[10px] text-muted">
                                        "Direct Add" sends a request if they are already on Pledge. "Send Invite" opens your email app.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </Layout>
    );
}
