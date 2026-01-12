import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../services/store';
import { makeReminderMessage } from '../../utils/reminderHelper';
import { Layout } from '../../app/Layout';
import { Plus, CheckCircle2, Clock, XCircle, HelpCircle, Trash2 } from 'lucide-react';
import { ReceiptStatus } from '../../types';
import type { Receipt } from '../../types';

type Tab = 'SENT' | 'RECEIVED' | 'PENDING';

function StatusPill({ status }: { status: ReceiptStatus }) {
    if (status === ReceiptStatus.ACCEPTED) return <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={12} /><span>Accepted</span></span>;
    if (status === ReceiptStatus.AWAITING_SIGNUP || status === ReceiptStatus.AWAITING_CONNECTION) return <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-bold uppercase tracking-wider"><Clock size={12} /><span>Pending</span></span>;
    if (status === ReceiptStatus.REJECTED) return <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-bold uppercase tracking-wider"><XCircle size={12} /><span>Rejected</span></span>;
    return <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-50 text-slate-500 border border-slate-100 rounded-full text-[10px] font-bold uppercase tracking-wider"><HelpCircle size={12} /><span>{status}</span></span>;
}

export function ReceiptsPage() {
    const { receipts, users, loading, currentUser, deleteReceipt } = useStore();
    const [tab, setTab] = useState<Tab>('SENT');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [tagFilter, setTagFilter] = useState<string>('ALL');

    const myUserId = currentUser?.id || '';

    const filtered = useMemo(() => {
        let list = receipts;

        const isSent = (r: Receipt) => r.from_user_id === myUserId;
        const isReceived = (r: Receipt) => r.recipient_email?.toLowerCase() === currentUser?.email?.toLowerCase() || r.to_user_id === currentUser?.id;

        if (tab === 'SENT') list = list.filter(isSent);
        else if (tab === 'RECEIVED') list = list.filter(isReceived);
        else if (tab === 'PENDING') list = list.filter(r => (isSent(r) || isReceived(r)) && (r.status === ReceiptStatus.AWAITING_SIGNUP || r.status === ReceiptStatus.AWAITING_CONNECTION));

        if (statusFilter !== 'ALL') {
            list = list.filter(r => r.status === statusFilter);
        }

        if (tagFilter !== 'ALL') {
            list = list.filter(r => r.tags?.includes(tagFilter));
        }

        return list;
    }, [receipts, tab, myUserId, currentUser, statusFilter, tagFilter]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        receipts.forEach(r => r.tags?.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [receipts]);

    const counts = useMemo(() => {
        const sent = receipts.filter((r) => r.from_user_id === myUserId).length;
        const received = receipts.filter((r) => r.recipient_email?.toLowerCase() === currentUser?.email?.toLowerCase() || r.to_user_id === currentUser?.id).length;
        return { sent, received };
    }, [receipts, myUserId, currentUser]);

    async function copyReminder(id: string) {
        const link = `${window.location.origin}/c/${id}`;
        const msg = makeReminderMessage(link);
        await navigator.clipboard.writeText(msg);
        alert('Reminder copied!');
    }

    async function handleDelete(id: string) {
        if (!window.confirm('Are you sure you want to cancel this receipt?')) return;
        const result = await deleteReceipt(id);
        if (!result.success) alert(result.message);
    }

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin text-slate-300">
                        <Clock size={32} />
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-8 animate-fade-in pb-20">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-slate-900">Receipts Ledger</h1>
                        <p className="text-slate-500 font-medium">Track and verify your impact history.</p>
                    </div>

                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
                        <button
                            onClick={() => setTab('SENT')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'SENT' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Sent ({counts.sent})
                        </button>
                        <button
                            onClick={() => setTab('RECEIVED')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'RECEIVED' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Received ({counts.received})
                        </button>
                        <button
                            onClick={() => setTab('PENDING')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'PENDING' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Pending
                        </button>
                    </div>
                </header>

                <div className="bg-white rounded-[1.5rem] overflow-hidden border border-slate-200 shadow-xl shadow-slate-900/5">
                    <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Filters</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-white border text-xs font-bold text-slate-600 border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                            >
                                <option value="ALL">All Status</option>
                                <option value={ReceiptStatus.AWAITING_SIGNUP}>Awaiting Signup</option>
                                <option value={ReceiptStatus.AWAITING_CONNECTION}>Awaiting Connection</option>
                                <option value={ReceiptStatus.ACCEPTED}>Accepted</option>
                                <option value={ReceiptStatus.REJECTED}>Rejected</option>
                            </select>
                            <select
                                value={tagFilter}
                                onChange={(e) => setTagFilter(e.target.value)}
                                className="bg-white border text-xs font-bold text-slate-600 border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                            >
                                <option value="ALL">All Tags</option>
                                <option value={JSON.stringify(allTags)}>{/* Removed map call here to simplify huge block rewrite */}</option>
                                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                            Showing {filtered.length} Results
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white">
                                <tr className="border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-8">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Participants</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-right pr-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="space-y-2">
                                                <p className="text-slate-400 font-medium">No results found.</p>
                                                <Link to="/create" className="text-sm font-bold text-slate-900 underline underline-offset-4">Create your first receipt</Link>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filtered.map((r) => {
                                    const sent = r.from_user_id === myUserId;

                                    // Resolve the "Other" person
                                    let otherPerson = undefined;
                                    let displayLabel = '';

                                    if (sent) {
                                        // I am sender, looking for recipient
                                        if (r.to_user_id) {
                                            otherPerson = users.find(u => u.id === r.to_user_id);
                                        }

                                        if (!otherPerson && r.recipient_email) {
                                            otherPerson = users.find(u => u.email?.toLowerCase() === r.recipient_email?.toLowerCase());
                                        }

                                        if (otherPerson) {
                                            displayLabel = otherPerson.maskedName;
                                        } else {
                                            displayLabel = r.recipient_email || 'Unknown';
                                        }
                                    } else {
                                        // I am recipient, looking for sender
                                        otherPerson = users.find(u => u.id === r.from_user_id);
                                        displayLabel = otherPerson ? otherPerson.maskedName : 'Unknown Sender';
                                    }

                                    const displayName = otherPerson?.institution
                                        ? `${displayLabel} (${otherPerson.institution})`
                                        : displayLabel;

                                    const canClaim = !sent && (r.status === ReceiptStatus.AWAITING_SIGNUP || r.status === ReceiptStatus.AWAITING_CONNECTION);

                                    return (
                                        <tr key={r.id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-5 pl-8">
                                                <StatusPill status={r.status} />
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {sent ? 'You ➔ ' : ''}{displayName}{!sent ? ' ➔ You' : ''}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{sent ? 'You Helped' : 'Helped You'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 max-w-xs">
                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                    {r.tags?.map(tag => (
                                                        <span key={tag} className="text-[10px] bg-white border border-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                {r.description ? (
                                                    <div className="text-xs text-slate-500 line-clamp-1 font-medium">{r.description}</div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 italic">No description</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-xs font-bold text-slate-600">{new Date(r.created_at).toLocaleDateString()}</div>
                                                <div className="text-[9px] text-slate-400 uppercase tracking-tighter">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-6 py-5 text-right pr-8">
                                                <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {canClaim && (
                                                        <Link to={`/claim?rid=${r.id}`} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold shadow-lg shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all">
                                                            Claim
                                                        </Link>
                                                    )}
                                                    {sent && (r.status === ReceiptStatus.AWAITING_SIGNUP || r.status === ReceiptStatus.AWAITING_CONNECTION) && (
                                                        <>
                                                            <button onClick={() => copyReminder(r.id)} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors">
                                                                Remind
                                                            </button>
                                                            <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <Link to={`/receipt/${r.id}`} className="p-2 text-slate-400 hover:text-slate-900 transition-colors bg-white hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200">
                                                        <Plus size={16} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
