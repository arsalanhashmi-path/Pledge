import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, User, LogOut, Network, PlusCircle, Receipt, Sun, Moon, Bell, Trophy, Landmark, MessageCircle, ShieldCheck } from 'lucide-react';
import { useStore } from '../services/store';
import { useTheme } from './ThemeProvider';
import { StudentOnboardingModal } from '../components/StudentOnboardingModal';
import { supabase } from '../services/supabaseClient';

interface LayoutProps {
    children?: React.ReactNode;
}

const NavItem = ({ to, icon: Icon, label, active, onClick, className, badge }: { to?: string; icon: any; label: string; active?: boolean; onClick?: () => void, className?: string, badge?: number }) => {
    const content = (
        <>
            <Icon size={20} strokeWidth={active ? 2.5 : 2} className="relative" />
            <span className="text-[10px] md:text-sm mt-1 md:mt-0 flex-1">{label}</span>
            {badge && badge > 0 && (
                <span className="hidden md:flex bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] justify-center items-center shadow-sm">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
            {/* Mobile badge overlay on icon */}
            {badge && badge > 0 ? (
                <span className="md:hidden absolute top-0 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-surface animate-pulse" />
            ) : null}
        </>
    );

    const baseClass = `flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-3 rounded-lg transition-all duration-200 relative ${className || ''}`;
    const activeClass = active
        ? 'text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 font-medium'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800';

    if (to) {
        return (
            <Link to={to} className={`${baseClass} ${activeClass}`}>
                {content}
            </Link>
        );
    }

    return (
        <button onClick={onClick} className={`${baseClass} ${activeClass} w-full`}>
            {content}
        </button>
    );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const path = location.pathname;
    const { currentUser, signOut, receipts, connections, unreadCounts, refreshUnreadCounts } = useStore();
    const [showToast, setShowToast] = React.useState(false);
    
    // Subscribe to changes
    React.useEffect(() => {
        let channel: any;

        // Initial fetch handled by Store, but we might want to ensure it's fresh? Store does it on auth change.
        // We just handle realtime updates here.

        import('../services/chatService').then(({ chatService }) => {
             // Subscribe to new messages with a UNIQUE channel name so MessagesPage doesn't kill it
             channel = chatService.subscribeToMessages((msg, eventType) => {
                 console.log(`🔔 Realtime Message ${eventType}:`, msg);
                 
                 // If the message is intended for us (INSERT or UPDATE), refresh counts
                 if (msg.recipient_id === currentUser?.id) {
                     console.log("🔔 It's for me! Refreshing counts...");
                     refreshUnreadCounts();
                 }
             }, 'layout-notifications'); 
             
             console.log("🔔 Subscribed to public:messages channel");
        });

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [currentUser, refreshUnreadCounts]);

    const handleSignOut = async (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        await signOut();
        // Redirect handled by Router/RequireAuth
    };

    const userInitial = currentUser?.email?.substring(0, 1).toUpperCase() || 'U';

    const { theme, toggleTheme } = useTheme();

    // Calculate Stats
    const helpGiven = receipts.filter(r => r.from_user_id === currentUser?.id && r.status === 'ACCEPTED').length;
    const helpReceived = receipts.filter(r => r.to_user_id === currentUser?.id && r.status === 'ACCEPTED').length;

    // Calculate Badge Counts
    const pendingReceiptsCount = receipts.filter(r => 
        (r.status === 'AWAITING_ACCEPTANCE' || r.status === 'AWAITING_CONNECTION' || r.status === 'AWAITING_SIGNUP') &&
        (r.to_user_id === currentUser?.id || r.recipient_email === currentUser?.email)
    ).length;

    const pendingConnectionsCount = connections.filter(c => 
        !c.accepted && c.requested_by !== currentUser?.id
    ).length;

    const unreadMessagesCount = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

    const totalNotifications = pendingReceiptsCount + pendingConnectionsCount + unreadMessagesCount;

    const [hasBeenOnboarded, setHasBeenOnboarded] = React.useState(false);

    const showOnboarding = currentUser && !currentUser.institution_id;

    React.useEffect(() => {
        if (currentUser?.institution_id && !hasBeenOnboarded && localStorage.getItem('just_onboarded')) {
            setShowToast(true);
            setHasBeenOnboarded(true);
            localStorage.removeItem('just_onboarded');
            setTimeout(() => setShowToast(false), 5000);
        }
    }, [currentUser, hasBeenOnboarded]);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300">
            {/* Top Mobile / Desktop Header */}
            <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-surface shrink-0 z-20">
                <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full border-2 border-foreground bg-transparent flex items-center justify-center">
                        <div className="w-2 h-2 bg-foreground rounded-full" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Pledge</span>
                    {currentUser?.institution_id && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 ml-2">
                             <ShieldCheck size={12} className="text-emerald-500" />
                             <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-500">Campus Verified</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg bg-background border border-border text-muted hover:text-foreground transition-all hover:scale-105 active:scale-95"
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                    {/* Profile Dropdown */}
                    <div className="relative group">
                        <Link to="/settings" className="block relative z-10">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 hover:scale-105 transition-transform cursor-pointer">
                                {userInitial}
                            </div>
                        </Link>
                        
                        {/* Hover Content */}
                        <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 translate-y-2 z-50 w-64">
                            <div className="bg-surface rounded-2xl border border-border shadow-2xl p-4 space-y-4">
                                {/* User Info */}
                                <div className="border-b border-border pb-3">
                                    <h3 className="font-bold text-foreground text-sm truncate">{currentUser?.first_name} {currentUser?.last_name}</h3>
                                    <p className="text-[10px] text-muted truncate font-medium">{currentUser?.email}</p>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-center">
                                        <div className="text-emerald-500 font-black text-lg leading-tight">{helpGiven}</div>
                                        <div className="text-[8px] uppercase tracking-wider font-bold text-muted">Given</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-center">
                                        <div className="text-amber-500 font-black text-lg leading-tight">{helpReceived}</div>
                                        <div className="text-[8px] uppercase tracking-wider font-bold text-muted">Recvd</div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <button 
                                    onClick={handleSignOut}
                                    className="w-full flex items-center justify-center space-x-2 p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors text-xs font-bold"
                                >
                                    <LogOut size={14} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Desktop Sidebar */}
                <nav className="hidden md:flex w-64 flex-col border-r border-border bg-surface p-4 space-y-2 shrink-0">
                    <NavItem to="/" icon={Home} label="Network" active={path === '/'} />
                    <NavItem to="/connections" icon={Network} label="Connections" badge={pendingConnectionsCount} active={path === '/connections'} />
                    <NavItem to="/receipts" icon={Receipt} label="Receipts" badge={pendingReceiptsCount} active={path === '/receipts'} />
                    <NavItem to="/institutions" icon={Landmark} label="Institutions" active={path === '/institutions'} />
                    <NavItem to="/leaderboard" icon={Trophy} label="Leaderboard" active={path === '/leaderboard'} />
                    <NavItem to="/messages" icon={MessageCircle} label="Messages" badge={unreadMessagesCount} active={path === '/messages'} />
                    <NavItem to="/notifications" icon={Bell} label="Notifications" badge={totalNotifications} active={path === '/notifications'} />
                    <NavItem to="/create" icon={PlusCircle} label="Create Proof" active={path === '/create'} />
                    <NavItem to="/portfolio" icon={User} label="Profile" active={path === '/portfolio'} />

                    <div className="flex-1" />


                </nav>

                {/* Main Content Area */}
                <main className="flex-1 overflow-auto relative">
                    <div className="max-w-[1360px] mx-auto h-full p-4 md:p-6 pb-20 md:pb-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Tab Bar */}
            <nav className="md:hidden h-16 border-t border-border bg-surface flex justify-around items-center px-2 fixed bottom-0 w-full z-50 pb-safe">
                <NavItem to="/" icon={Home} label="Network" active={path === '/'} />
                <NavItem to="/connections" icon={Network} label="Network" badge={pendingConnectionsCount} active={path === '/connections'} />
                <NavItem to="/create" icon={PlusCircle} label="Create" active={path === '/create'} />
                <NavItem to="/leaderboard" icon={Trophy} label="Top" active={path === '/leaderboard'} />
                <NavItem to="/notifications" icon={Bell} label="Activity" badge={totalNotifications} active={path === '/notifications'} />
                <NavItem to="/portfolio" icon={User} label="Profile" active={path === '/portfolio'} />
                <NavItem onClick={handleSignOut} icon={LogOut} label="Log Out" active={false} className="text-slate-400 hover:text-red-500" />
            </nav>
            {/* Client-side Onboarding Overlay */}
            {showOnboarding && <StudentOnboardingModal />}

            {/* Success Toast */}
            {showToast && (
                <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[110] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl shadow-2xl shadow-emerald-500/40 flex items-center gap-3 font-black">
                        <ShieldCheck className="w-6 h-6" />
                        <span>CAMPUS VERIFIED & READY</span>
                    </div>
                </div>
            )}
        </div>
    );
};
