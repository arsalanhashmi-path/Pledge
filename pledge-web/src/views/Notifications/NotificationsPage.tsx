import React, { useEffect, useState } from 'react';
import { Layout } from '../../app/Layout';
import { useStore } from '../../services/store';
import { chatService } from '../../services/chatService';
import { CheckCircle2, XCircle, UserPlus, FileText, Bell, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { NotificationSection } from './NotificationSection';
import { Badge } from '../../components/ui/Badge';

export const NotificationsPage: React.FC = () => {
    const { receipts, connections, currentUser, users, acceptConnection, removeConnection } = useStore();
    const [filter, setFilter] = useState<'ALL' | 'MESSAGES' | 'RECEIPTS' | 'CONNECTIONS'>('ALL');
    const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        chatService.getUnreadCounts().then(setUnreadCounts);
    }, []);

    // 1. Unread Messages
    const unreadMessages = Object.entries(unreadCounts).map(([senderId, count]) => {
        const sender = users.find(u => u.id === senderId);
        return { senderId, count, sender };
    }).filter(item => item.count > 0);

    // 2. Filter Pending Receipts
    const pendingReceipts = receipts.filter(r => 
        (r.status === 'AWAITING_ACCEPTANCE' || r.status === 'AWAITING_CONNECTION' || r.status === 'AWAITING_SIGNUP') &&
        (r.to_user_id === currentUser?.id || r.recipient_email === currentUser?.email)
    );

    // 3. Receipt Updates
    const receiptUpdates = receipts
        .filter(r => r.from_user_id === currentUser?.id && (r.status === 'ACCEPTED' || r.status === 'REJECTED'))
        .sort((a, b) => new Date(b.accepted_at || b.created_at).getTime() - new Date(a.accepted_at || a.created_at).getTime())
        .slice(0, 5);

    // 4. Filter Connection Requests
    const pendingConnections = connections.filter(c => 
        !c.accepted && c.requested_by !== currentUser?.id
    );

    const hasNotifications = pendingReceipts.length > 0 || pendingConnections.length > 0 || unreadMessages.length > 0 || receiptUpdates.length > 0;

    const FilterTab = ({ label, value, icon: Icon }: { label: string, value: typeof filter, icon?: any }) => (
        <button 
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                filter === value 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md transform scale-105' 
                    : 'bg-surface text-muted hover:bg-background hover:text-foreground'
            }`}
        >
            {Icon && <Icon size={14} />}
            {label}
        </button>
    );

    const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
         <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-[2rem] border border-border border-dashed text-center space-y-3 animate-fade-in">
            <div className="p-3 bg-background rounded-full text-muted">
                <Icon size={24} className="opacity-50" />
            </div>
            <p className="text-muted font-medium text-sm">{message}</p>
        </div>
    );

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-8 py-8 md:py-12 animate-fade-in pb-32">
                
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

                {/* Filter Tabs */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                    <FilterTab label="All" value="ALL" />
                    <FilterTab label={`Messages ${unreadMessages.length > 0 ? `(${unreadMessages.length})` : ''}`} value="MESSAGES" icon={MessageCircle} />
                    <FilterTab label={`Receipts ${pendingReceipts.length + receiptUpdates.length > 0 ? `(${pendingReceipts.length + receiptUpdates.length})` : ''}`} value="RECEIPTS" icon={FileText} />
                    <FilterTab label={`Connections ${pendingConnections.length > 0 ? `(${pendingConnections.length})` : ''}`} value="CONNECTIONS" icon={UserPlus} />
                </div>

                {!hasNotifications && <EmptyState icon={Bell} message="No pending actions at the moment." />}

                {/* Empty State for Messages Filter */}
                {filter === 'MESSAGES' && unreadMessages.length === 0 && <EmptyState icon={MessageCircle} message="You have no unread messages." />}

                {/* Unread Messages Section */}
                {(filter === 'ALL' || filter === 'MESSAGES') && (
                    <NotificationSection title="Unread Messages" count={unreadMessages.length}>
                        {unreadMessages.map(({ senderId, count, sender }) => (
                            <Link to={`/messages`} key={senderId} className="group">
                                <Card hoverEffect className="flex items-center justify-between hover:border-emerald-500/30">
                                    <div className="flex items-center space-x-4">
                                        <Avatar 
                                            initials={sender?.maskedName.charAt(0) || '?'} 
                                            bgColor="bg-emerald-500 text-white" 
                                            size="lg"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors">
                                                {sender?.maskedName || 'Unknown User'}
                                            </div>
                                            <div className="text-xs text-muted font-medium">
                                                {count} unread message{count > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 create-new-receipt-button flex items-center justify-center rounded-full">
                                        <MessageCircle size={16} className="text-white" />
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </NotificationSection>
                )}

                {/* Empty State for Connections Filter */}
                {filter === 'CONNECTIONS' && pendingConnections.length === 0 && <EmptyState icon={UserPlus} message="No pending connection requests." />}

                {/* Connection Requests Section */}
                {(filter === 'ALL' || filter === 'CONNECTIONS') && (
                    <NotificationSection title="Connection Requests" count={pendingConnections.length}>
                        {pendingConnections.map(c => (
                            <Card key={c.id} className="flex items-center justify-between group hover:-translate-y-1 transition-all">
                                <div className="flex items-center space-x-3">
                                    <Avatar 
                                        initials={<UserPlus size={18} /> as any} 
                                        bgColor="bg-indigo-500/10 text-indigo-500"
                                        size="md"
                                    />
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
                            </Card>
                        ))}
                    </NotificationSection>
                )}

                {/* Empty State for Receipts Filter */}
                {filter === 'RECEIPTS' && pendingReceipts.length === 0 && receiptUpdates.length === 0 && <EmptyState icon={FileText} message="No receipt updates or pending verifications." />}

                {/* Pending Receipts Section */}
                {(filter === 'ALL' || filter === 'RECEIPTS') && (
                    <NotificationSection title="Receipts to Verify" count={pendingReceipts.length} gridClass="grid-cols-1">
                        {pendingReceipts.map(r => (
                            <Link to={`/receipt/${r.id}`} key={r.id} className="block group">
                                <Card hoverEffect className="flex items-start gap-4 hover:border-emerald-500/30">
                                    <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                                        <FileText size={24} />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-foreground text-sm line-clamp-2 md:line-clamp-1 group-hover:text-emerald-500 transition-colors">
                                                {r.description || "No description provided"}
                                            </h4>
                                            <Badge variant="warning">Verify</Badge>
                                        </div>
                                        <div className="flex gap-2">
                                            {r.tags?.map(t => (
                                                <span key={t} className="text-[9px] font-bold text-muted bg-background px-2 py-1 rounded-lg uppercase tracking-wider">#{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </NotificationSection>
                )}
                
                {/* Receipt Updates (My Proofs) */}
                {(filter === 'ALL' || filter === 'RECEIPTS') && (
                    <NotificationSection title="Recent Updates on Your Proofs" count={receiptUpdates.length} gridClass="grid-cols-1">
                        {receiptUpdates.map(r => (
                            <Link to={`/receipt/${r.id}`} key={r.id} className="block group">
                                <Card hoverEffect className="flex items-start gap-4 opacity-75 hover:opacity-100 hover:border-accent/30">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                        r.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                        {r.status === 'ACCEPTED' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors">
                                                {r.description || "Proof"}
                                            </h4>
                                            <Badge variant={r.status === 'ACCEPTED' ? 'success' : 'destructive'}>
                                                {r.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted">
                                            {r.status === 'ACCEPTED' ? 'Your proof has been verified!' : 'Your proof was rejected.'}
                                        </p>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </NotificationSection>
                )}
            </div>
        </Layout>
    );
};
