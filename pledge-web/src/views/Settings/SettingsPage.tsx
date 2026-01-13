import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Layout } from '../../app/Layout'; // Assuming Layout is in app/Layout
import { useStore } from '../../services/store';

const INSTITUTIONS = [
    'LUMS',
    'IBA',
    'NUST',
    'FAST',
    'KU',
    'NED',
    'Other',
];

export const SettingsPage: React.FC = () => {
    const { currentUser } = useStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        date_of_birth: '',
        institution: '',
    });

    useEffect(() => {
        (async () => {
            if (!currentUser?.id) return;

            const { data } = await supabase
                .from('profiles')
                .select('first_name,last_name,phone,date_of_birth,institution')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (data) {
                setForm({
                    first_name: data.first_name ?? '',
                    last_name: data.last_name ?? '',
                    phone: data.phone ?? '',
                    date_of_birth: data.date_of_birth ?? '',
                    institution: data.institution ?? '',
                });
            }
            setLoading(false);
        })();
    }, [currentUser]);

    function validate() {
        if (!form.first_name.trim()) return 'First name is required';
        if (!form.last_name.trim()) return 'Last name is required';
        if (!form.institution.trim()) return 'Institution is required';
        if (!form.date_of_birth) return 'Date of birth is required';
        if (!form.phone.trim()) return 'Phone is required';
        const p = form.phone.replace(/\s+/g, '');
        if (!/^\+?\d{10,15}$/.test(p)) return 'Phone must be digits (optionally starting with +), 10–15 digits';
        return '';
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);

        const msg = validate();
        if (msg) {
            setMessage({ type: 'error', text: msg });
            return;
        }

        setSaving(true);

        const { error } = await supabase.from('profiles').upsert({
            user_id: currentUser?.id,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            phone: form.phone.trim(),
            date_of_birth: form.date_of_birth,
            institution: form.institution.trim(),
        });

        setSaving(false);

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            // Optionally trigger a re-fetch in store if we want instant UI updates elsewhere
        }
    }

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-full text-muted font-bold animate-pulse">Loading settings...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                    <p className="text-muted font-medium">Manage your personal profile and preferences.</p>
                </div>

                <div className="bg-surface rounded-[1.5rem] border border-border shadow-xl shadow-slate-900/5 p-8">
                    <h2 className="text-xl font-bold text-foreground mb-6 border-b border-border pb-4">Profile Information</h2>

                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="block">
                                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">First name</div>
                                <input
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-medium text-foreground placeholder:text-muted/40"
                                    value={form.first_name}
                                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                />
                            </label>

                            <label className="block">
                                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">Last name</div>
                                <input
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-medium text-foreground placeholder:text-muted/40"
                                    value={form.last_name}
                                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                />
                            </label>
                        </div>

                        <label className="block">
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">Phone</div>
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-medium text-foreground placeholder:text-muted/40"
                                placeholder="+92XXXXXXXXXX"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                        </label>

                        <label className="block">
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">Date of birth</div>
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-medium text-foreground"
                                type="date"
                                value={form.date_of_birth}
                                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                            />
                        </label>

                        <label className="block">
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">Institution</div>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-medium text-foreground appearance-none"
                                    value={form.institution}
                                    onChange={(e) => setForm({ ...form, institution: e.target.value })}
                                >
                                    <option value="">Select...</option>
                                    {INSTITUTIONS.map((x) => (
                                        <option key={x} value={x}>{x}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                        </label>

                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 ${message.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}`}>
                                {message.type === 'error' ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                )}
                                {message.text}
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <button
                                disabled={saving}
                                className="px-8 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};
