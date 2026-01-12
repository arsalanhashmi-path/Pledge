import React, { useMemo } from 'react';
import { X, ShieldCheck, Clock, HelpCircle, ArrowRight } from 'lucide-react';
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
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-white shadow-2xl z-40 transform transition-transform duration-200 ease-in-out flex flex-col border-l border-slate-200">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="font-bold text-lg text-slate-900">{title}</h2>
                        <p className="text-xs text-slate-500 font-mono">
                            {data.type === 'NODE' ? `ID: ${data.node?.id} ` : 'Interactions'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                            <div className="text-xl font-bold text-verified">
                                {relevantReceipts.filter(r => r.status === ReceiptStatus.ACCEPTED).length}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500">Accepted</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                            <div className="text-xl font-bold text-pending">
                                {relevantReceipts.filter(r => r.status === ReceiptStatus.AWAITING_SIGNUP || r.status === ReceiptStatus.AWAITING_CONNECTION).length}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500">Pending</div>
                        </div>
                    </div>

                    {/* Tag Cloud */}
                    {data.type === 'NODE' && data.node && (
                        <div>
                            <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Top Contexts</h3>
                            <div className="flex flex-wrap gap-2">
                                {data.node.topTags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 font-medium">
                                        {tag}
                                    </span>
                                ))}
                                {data.node.topTags.length === 0 && <span className="text-xs text-slate-400 italic">No tags yet</span>}
                            </div>
                        </div>
                    )}

                    {/* Receipt List */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">History</h3>
                        <div className="space-y-2">
                            {relevantReceipts.length === 0 && (
                                <div className="p-4 text-center text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    No history found.
                                </div>
                            )}
                            {relevantReceipts.map((r) => {
                                const isIncoming = (r.to_user_id === myId || r.recipient_email === currentUser?.email);
                                const otherId = isIncoming ? r.from_user_id : (r.to_user_id || r.recipient_email);
                                const otherUser = users.find(u => u.id === otherId || u.email === otherId);

                                return (
                                    <div key={r.id} className="p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors shadow-sm group">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center space-x-2">
                                                <StatusIcon status={r.status} />
                                                <span className="text-xs font-semibold text-slate-700">
                                                    {isIncoming ? 'Received help from' : 'Helped'} {otherUser?.maskedName} {otherUser?.institution && <span className="opacity-60 text-[10px] font-normal">({otherUser.institution})</span>}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {new Date(r.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {r.tags.map(t => (
                                                <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100">#{t}</span>
                                            ))}
                                        </div>
                                        {(r.status === ReceiptStatus.AWAITING_SIGNUP || r.status === ReceiptStatus.AWAITING_CONNECTION) && !isIncoming && (
                                            <div className="mt-2 pt-2 border-t border-slate-50 flex justify-end">
                                                <button className="text-xs text-blue-600 font-medium hover:underline flex items-center">
                                                    Copy Reminder <ArrowRight size={10} className="ml-1" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-white border border-slate-300 rounded text-sm font-medium hover:bg-slate-100 transition-colors"
                    >
                        Close Panel
                    </button>
                </div>
            </div>
        </>
    );
};
