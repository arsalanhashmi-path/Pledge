import React from 'react';
import { Layout } from '../../app/Layout';
import { useStore } from '../../services/store';
import { CheckCircle2, XCircle, UserPlus, FileText, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
    const { receipts, connections, currentUser, acceptConnection, removeConnection } = useStore();

    // 1. Filter Pending Receipts (Incoming)
    const pendingReceipts = receipts.filter(r => 
        (r.status === 'AWAITING_ACCEPTANCE' || r.status === 'AWAITING_CONNECTION' || r.status === 'AWAITING_SIGNUP') &&
        (r.to_user_id === currentUser?.id || r.recipient_email === currentUser?.email)
    );

    // 2. Filter Connection Requests (Incoming)
    const pendingConnections = connections.filter(c => 
        !c.accepted && c.requested_by !== currentUser?.id
    );

    const hasNotifications = pendingReceipts.length > 0 || pendingConnections.length > 0;

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-12 py-8 md:py-12 animate-fade-in pb-32">
                
                {/* Header */}
                <header className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                        <Bell size={32} />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Notifications</h1>
                        <p className="text-muted font-bold text-xs uppercase tracking-widest">
                            {hasNotifications ? 'Requires your attention' : 'You are all caught up'}
                        </p>
                    </div>
                </header>

                {!hasNotifications && (
                    <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-[2.5rem] border border-border border-dashed text-center space-y-4">
                        <div className="p-4 bg-background rounded-full text-muted">
                            <Bell size={24} className="opacity-50" />
                        </div>
                        <p className="text-muted font-medium italic">No pending actions at the moment.</p>
                        <Link to="/" className="text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl hover:scale-105 transition-transform">
                            Return to Orbit
                        </Link>
                    </div>
                )}

                {/* Connection Requests Section */}
                {pendingConnections.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">Connection Requests ({pendingConnections.length})</h3>
                            <div className="h-px bg-border flex-1" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingConnections.map(c => (
                                <div key={c.id} className="bg-surface p-6 rounded-[2rem] border border-border shadow-lg shadow-slate-900/5 flex items-center justify-between group hover:-translate-y-1 transition-all">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center">
                                            <UserPlus size={18} />
                                        </div>
                                        <div className="text-sm font-bold text-foreground">
                                            New Connection Request
                                            <span className="block text-[10px] text-muted font-normal uppercase mt-0.5">{new Date(c.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button 
                                            onClick={() => acceptConnection(c.id)}
                                            className="p-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-colors"
                                            title="Accept"
                                        >
                                            <CheckCircle2 size={20} />
                                        </button>
                                        <button 
                                            onClick={() => removeConnection(c.id)}
                                            className="p-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                                            title="Reject"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Pending Receipts Section */}
                {pendingReceipts.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">Receipts to Verify ({pendingReceipts.length})</h3>
                            <div className="h-px bg-border flex-1" />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {pendingReceipts.map(r => (
                                <Link to={`/receipt/${r.id}`} key={r.id} className="block group">
                                    <div className="bg-surface p-6 rounded-[2rem] border border-border shadow-lg shadow-slate-900/5 hover:border-emerald-500/30 transition-all flex items-start gap-4">
                                        <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                                            <FileText size={24} />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-foreground text-sm line-clamp-2 md:line-clamp-1 group-hover:text-emerald-500 transition-colors">
                                                    {r.description || "No description provided"}
                                                </h4>
                                                <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-wider shrink-0 ml-2">
                                                    Verify
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                {r.tags?.map(t => (
                                                    <span key={t} className="text-[9px] font-bold text-muted bg-background px-2 py-1 rounded-lg uppercase tracking-wider">#{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </Layout>
    );
};
