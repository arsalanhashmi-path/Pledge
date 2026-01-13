import React, { useMemo } from 'react';
import { X, ShieldCheck, Clock, HelpCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { GraphNode, GraphLink } from '../types';
import { ReceiptStatus } from '../types';
import { useStore } from '../services/store';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        type: 'NODE' | 'EDGE';
        node?: GraphNode;
        edge?: GraphLink;
    } | null;
}

const StatusIcon = ({ status }: { status: ReceiptStatus }) => {
    if (status === ReceiptStatus.ACCEPTED) return <ShieldCheck size={14} className="text-verified" />;
    if (status === ReceiptStatus.AWAITING_SIGNUP || status === ReceiptStatus.AWAITING_CONNECTION) return <Clock size={14} className="text-pending" />;
    return <HelpCircle size={14} className="text-slate-400" />;
};

const StatusBadge = ({ status }: { status: ReceiptStatus }) => {
    const config = {
        [ReceiptStatus.ACCEPTED]: { label: 'Verified', classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
        [ReceiptStatus.AWAITING_SIGNUP]: { label: 'Pending Signup', classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
        [ReceiptStatus.AWAITING_CONNECTION]: { label: 'Awaiting Connection', classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
        [ReceiptStatus.REJECTED]: { label: 'Rejected', classes: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
    };

    const s = config[status] || { label: status, classes: 'bg-slate-50 text-slate-600 border-slate-100' };

    return (
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${s.classes}`}>
            {s.label}
        </span>
    );
};

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, data }) => {
    const { receipts, users, currentUser } = useStore();

    if (!isOpen || !data) return null;

    const myId = currentUser?.id || 'me';

    // Filter receipts relevant to selection
    const relevantReceipts = useMemo(() => {
        return receipts.filter(r => {
            if (data.type === 'NODE' && data.node) {
                // Show interactions involving this node and 'me'
                const otherId = data.node.id;
                return (r.from_user_id === otherId && (r.to_user_id === myId || r.recipient_email === currentUser?.email)) ||
                    (r.from_user_id === myId && (r.to_user_id === otherId || r.recipient_email === data.node.id)); // Assuming node ID might be email for new invites
            }
            if (data.type === 'EDGE' && data.edge) {
                const s = data.edge.source;
                const t = data.edge.target;
                const sId = typeof s === 'object' ? (s as any).id : s;
                const tId = typeof t === 'object' ? (t as any).id : t;

                return (r.from_user_id === sId && (r.to_user_id === tId || r.recipient_email === tId)) ||
                    (r.from_user_id === tId && (r.to_user_id === sId || r.recipient_email === sId));
            }
            return false;
        });
    }, [receipts, data.type, data.node?.id, data.edge?.source, data.edge?.target, myId, currentUser?.email]);

    const title = data.type === 'NODE'
        ? (data.node?.id === 'me' ? 'Your Statistics' : data.node?.label)
        : 'Relationship History';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-surface shadow-2xl z-40 transform transition-transform duration-200 ease-in-out flex flex-col border-l border-border">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
                    <div>
                        <h2 className="font-bold text-lg text-foreground">{title}</h2>
                        <p className="text-xs text-muted font-mono">
                            {data.type === 'NODE' ? `ID: ${data.node?.id} ` : 'Interactions'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-border rounded-full transition-colors text-muted"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-background p-3 rounded-lg border border-border text-center">
                            <div className="text-xl font-bold text-verified">
                                {relevantReceipts.filter(r => r.status === ReceiptStatus.ACCEPTED).length}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted">Accepted</div>
                        </div>
                        <div className="bg-background p-3 rounded-lg border border-border text-center">
                            <div className="text-xl font-bold text-pending">
                                {relevantReceipts.filter(r => r.status === ReceiptStatus.AWAITING_SIGNUP || r.status === ReceiptStatus.AWAITING_CONNECTION).length}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted">Pending</div>
                        </div>
                    </div>

                    {/* Tag Cloud */}
                    {data.type === 'NODE' && data.node && (
                        <div>
                            <h3 className="text-xs font-bold uppercase text-muted mb-2 opacity-60">Top Contexts</h3>
                            <div className="flex flex-wrap gap-2">
                                {data.node.topTags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-surface text-foreground text-xs rounded border border-border font-medium">
                                        {tag}
                                    </span>
                                ))}
                                {data.node.topTags.length === 0 && <span className="text-xs text-muted italic">No tags yet</span>}
                            </div>
                        </div>
                    )}

                    {/* Receipt List */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-muted/60 mb-2">History</h3>
                        <div className="space-y-2">
                            {relevantReceipts.length === 0 && (
                                <div className="p-4 text-center text-muted text-sm bg-background rounded-lg border border-dashed border-border text-opacity-60">
                                    No history found.
                                </div>
                            )}
                            {relevantReceipts.map((r) => {
                                const isIncoming = (r.to_user_id === myId || r.recipient_email === currentUser?.email);
                                const otherId = isIncoming ? r.from_user_id : (r.to_user_id || r.recipient_email);
                                const otherUser = users.find(u => u.id === otherId || u.email === otherId);

                                return (
                                    <Link
                                        key={r.id}
                                        to={`/receipt/${r.id}`}
                                        className="block p-3 bg-surface border border-border rounded-lg hover:border-accent hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center space-x-2">
                                                <StatusIcon status={r.status} />
                                                <span className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
                                                    {isIncoming ? 'Received help from' : 'Helped'} {otherUser?.maskedName}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[10px] text-muted font-mono opacity-60">
                                                    {new Date(r.created_at).toLocaleDateString()}
                                                </span>
                                                <StatusBadge status={r.status} />
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-muted line-clamp-1 mt-1 font-medium group-hover:text-foreground transition-colors">
                                            {r.description || 'No description provided.'}
                                        </div>

                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {r.tags.map(t => (
                                                <span key={t} className="text-[10px] px-1.5 py-0.5 bg-background text-muted rounded border border-border">#{t}</span>
                                            ))}
                                        </div>
                                        {(r.status === ReceiptStatus.AWAITING_SIGNUP || r.status === ReceiptStatus.AWAITING_CONNECTION) && !isIncoming && (
                                            <div className="mt-2 pt-2 border-t border-border flex justify-end">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        // Fallback logic for reminder
                                                        const url = `${window.location.origin}/claim?id=${r.id}`;
                                                        navigator.clipboard.writeText(`Hey! Please help me verify our collaboration on Pledge: ${url}`);
                                                    }}
                                                    className="text-xs text-blue-600 font-medium hover:underline flex items-center"
                                                >
                                                    Copy Link <ArrowRight size={10} className="ml-1" />
                                                </button>
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-background">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-surface border border-border rounded text-sm font-medium hover:bg-background transition-colors text-foreground"
                    >
                        Close Panel
                    </button>
                </div>
            </div>
        </>
    );
};
