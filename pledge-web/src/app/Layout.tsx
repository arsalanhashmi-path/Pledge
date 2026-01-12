import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, User, LogOut, Network, PlusCircle, Receipt } from 'lucide-react';
import { useStore } from '../services/store';

interface LayoutProps {
    children?: React.ReactNode;
}

const NavItem = ({ to, icon: Icon, label, active, onClick, className }: { to?: string; icon: any; label: string; active?: boolean; onClick?: () => void, className?: string }) => {
    const content = (
        <>
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] md:text-sm mt-1 md:mt-0">{label}</span>
        </>
    );

    const baseClass = `flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-3 rounded-lg transition-colors ${className || ''}`;
    const activeClass = active ? 'text-slate-900 bg-slate-200 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100';

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
    const { currentUser, signOut } = useStore();

    const handleSignOut = async () => {
        await signOut();
        // Redirect handled by Router/RequireAuth
    };

    const userInitial = currentUser?.email?.substring(0, 1).toUpperCase() || 'U';

    return (
        <div className="flex flex-col h-screen bg-background text-slate-800">
            {/* Top Mobile / Desktop Header */}
            <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 z-20">
                <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full border-2 border-slate-800 bg-transparent flex items-center justify-center">
                        <div className="w-2 h-2 bg-slate-800 rounded-full" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Pledge</span>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                        {userInitial}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Desktop Sidebar */}
                <nav className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-slate-50 p-4 space-y-2 shrink-0">
                    <NavItem to="/" icon={Home} label="Network" active={path === '/'} />
                    <NavItem to="/connections" icon={Network} label="Connections" active={path === '/connections'} />
                    <NavItem to="/receipts" icon={Receipt} label="Receipts" active={path === '/receipts'} />
                    <NavItem to="/create" icon={PlusCircle} label="Create Proof" active={path === '/create'} />
                    <NavItem to="/portfolio" icon={User} label="Profile" active={path === '/portfolio'} />

                    <div className="flex-1" />

                    <button
                        onClick={handleSignOut}
                        className="flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-3 rounded-lg transition-colors text-slate-400 hover:text-red-600 hover:bg-red-50 w-full"
                    >
                        <LogOut size={20} />
                        <span className="text-[10px] md:text-sm mt-1 md:mt-0 font-medium">Sign Out</span>
                    </button>
                </nav>

                {/* Main Content Area */}
                <main className="flex-1 overflow-auto relative">
                    <div className="max-w-[1360px] mx-auto h-full p-4 md:p-6 pb-20 md:pb-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Tab Bar */}
            <nav className="md:hidden h-16 border-t border-slate-200 bg-white flex justify-around items-center px-2 fixed bottom-0 w-full z-50 pb-safe">
                <NavItem to="/" icon={Home} label="Network" active={path === '/'} />
                <NavItem to="/connections" icon={Network} label="Connections" active={path === '/connections'} />
                <NavItem to="/receipts" icon={Receipt} label="Receipts" active={path === '/receipts'} />
                <NavItem to="/create" icon={PlusCircle} label="Create" active={path === '/create'} />
                <NavItem to="/portfolio" icon={User} label="Profile" active={path === '/portfolio'} />
                <NavItem onClick={handleSignOut} icon={LogOut} label="Log Out" active={false} className="text-slate-400 hover:text-red-600" />
            </nav>
        </div>
    );
};
