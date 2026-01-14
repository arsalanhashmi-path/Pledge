import React from 'react';
import { Search, MessageCircle } from 'lucide-react';

interface ChatSidebarProps {
    activeConnections: any[];
    selectedConnectionId: string | null;
    setSelectedConnectionId: (id: string) => void;
    unreadCounts: { [key: string]: number };
    search: string;
    setSearch: (value: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    activeConnections,
    selectedConnectionId,
    setSelectedConnectionId,
    unreadCounts,
    search,
    setSearch
}) => {
    return (
        <div className="w-80 border-r border-border flex flex-col bg-slate-900 text-slate-200">
            <div className="p-4 border-b border-slate-800 space-y-3">
                <h2 className="font-bold text-lg text-white flex items-center gap-2">
                    <MessageCircle size={20} className="text-emerald-400" />
                    Messages
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="text"
                        placeholder="Search connections..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)} 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium placeholder:text-slate-500"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {activeConnections.length === 0 ? (
                    <div className="text-center text-slate-500 text-xs p-4 italic">
                        No connections found. Connect with peers to start chatting!
                    </div>
                ) : (
                    activeConnections.map(c => {
                        const unread = unreadCounts[c.otherId] || 0;
                        return (
                            <button
                                key={c.id}
                                onClick={() => setSelectedConnectionId(c.id)}
                                className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 relative ${
                                    selectedConnectionId === c.id 
                                        ? 'bg-slate-800 border border-slate-700 shadow-md' 
                                        : 'hover:bg-slate-800/50 border border-transparent'
                                }`}
                            >
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-sm ${selectedConnectionId === c.id ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                        {c.user?.maskedName.charAt(0)}
                                    </div>
                                    {unread > 0 && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ring-2 ring-slate-900 animate-bounce-subtle">
                                            {unread}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className={`font-bold text-sm truncate ${unread > 0 ? 'text-white' : 'text-slate-300'}`}>
                                            {c.user?.maskedName}
                                        </div>
                                    </div>
                                    <div className={`text-[10px] truncate ${unread > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                                        {c.user?.institution || 'Unknown Institution'}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
};
