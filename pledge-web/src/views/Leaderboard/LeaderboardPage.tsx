import React, { useEffect, useState } from 'react';
import { Layout } from '../../app/Layout';
import { Link } from 'react-router-dom';
import { Trophy, ArrowUpRight, ArrowDownLeft, Medal, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { API_BASE_URL } from '../../constants';

interface LeaderboardEntry {
    user_id: string;
    name: string;
    institution: string;
    count: number;
}

interface LeaderboardData {
    top_givers: LeaderboardEntry[];
    top_receivers: LeaderboardEntry[];
}


// ... (interfaces)

export const LeaderboardPage: React.FC = () => {
    // Removed unused useStore
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'GIVERS' | 'RECEIVERS'>('GIVERS');

    useEffect(() => {
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                
                const res = await fetch(`${API_BASE_URL}/api/leaderboard`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (json.success) {
                    setData({
                        top_givers: json.top_givers,
                        top_receivers: json.top_receivers
                    });
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return (
        <Layout>
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        </Layout>
    );

    const list = activeTab === 'GIVERS' ? data?.top_givers : data?.top_receivers;

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-8 py-8 md:py-12 animate-fade-in pb-32">
                
                {/* Header */}
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="relative">
                        <div className="w-20 h-20 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl">
                            <Trophy size={32} strokeWidth={2.5} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white p-2 rounded-xl shadow-lg border-2 border-surface">
                            <Medal size={16} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight">Global Leaderboard</h1>
                        <p className="text-muted font-bold text-xs uppercase tracking-widest mt-2">Top Performers in the Orbit</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-surface p-1.5 rounded-2xl border border-border shadow-sm">
                        <button
                            onClick={() => setActiveTab('GIVERS')}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'GIVERS' ? 'bg-emerald-500 text-white shadow-md' : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <ArrowUpRight size={16} />
                            <span>Top Givers</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('RECEIVERS')}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'RECEIVERS' ? 'bg-amber-500 text-white shadow-md' : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <ArrowDownLeft size={16} />
                            <span>Top Receivers</span>
                        </button>
                    </div>
                </div>

                {/* Table Layout */}
                <div className="bg-surface rounded-[2rem] border border-border overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                                    <th className="py-5 px-6 text-left text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest w-20">Rank</th>
                                    <th className="py-5 px-6 text-left text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">User</th>
                                    <th className="py-5 px-6 text-left text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Institution</th>
                                    <th className="py-5 px-6 text-right text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                        {activeTab === 'GIVERS' ? 'Helps Given' : 'Helps Received'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {list?.map((entry, index) => (
                                    <tr 
                                        key={entry.user_id} 
                                        className="group hover:bg-[var(--row-hover-bg)] hover:ring-1 hover:ring-[var(--row-hover-ring)] transition-all duration-200"
                                    >
                                        <td className="py-4 px-6">
                                            <div className={`w-8 h-8 flex items-center justify-center rounded-xl font-black text-sm ${
                                                index === 0 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                index === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                                                index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' :
                                                'bg-slate-100 dark:bg-slate-800 text-muted'
                                            }`}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <Link to={`/u/${entry.user_id}`} className="flex items-center space-x-3 group-hover:translate-x-1 transition-transform">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
                                                    {entry.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                                                    {entry.name}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {entry.institution || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-xl font-black tracking-tight ${
                                                    activeTab === 'GIVERS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                                }`}>
                                                    {entry.count}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {list?.length === 0 && (
                        <div className="text-center py-12 text-muted font-medium italic">
                            No data available yet. Start creating proofs!
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};
