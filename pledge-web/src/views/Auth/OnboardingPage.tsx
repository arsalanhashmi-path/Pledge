import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const INSTITUTIONS = [
    'LUMS',
    'IBA',
    'NUST',
    'FAST',
    'KU',
    'NED',
    'Other',
];

export const OnboardingPage: React.FC = () => {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    const redirect = searchParams.get('redirect');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        institution: '',
    });

    useEffect(() => {
        (async () => {
            const { data: userRes } = await supabase.auth.getUser();
            const uid = userRes.user?.id;
            if (!uid) return;

            const { data } = await supabase
                .from('public_profiles')
                .select('first_name,last_name,institution')
                .eq('user_id', uid)
                .maybeSingle();

            if (data) {
                setForm({
                    first_name: data.first_name ?? '',
                    last_name: data.last_name ?? '',
                    institution: data.institution ?? '',
                });
            }

            setLoading(false);
        })();
    }, []);

    function validate() {
        if (!form.first_name.trim()) return 'First name is required';
        if (!form.last_name.trim()) return 'Last name is required';
        if (!form.institution.trim()) return 'Institution is required';
        return '';
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        const msg = validate();
        if (msg) {
            setError(msg);
            return;
        }

        setSaving(true);

        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;

        if (!uid) {
            setSaving(false);
            setError('Not logged in');
            return;
        }

        const email = userRes.user?.email;
        if (!email) {
            setSaving(false);
            setError('Could not identify user email.');
            return;
        }

        const { error: publicError } = await supabase.from('public_profiles').upsert({
            user_id: uid,
            email: email,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            institution: form.institution.trim(),
        });

        if (publicError) {
            setSaving(false);
            setError(publicError.message);
            return;
        }

        setSaving(false);
        nav(redirect || '/');
    };

    if (loading) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                <div className="text-muted font-bold animate-pulse">Initializing Identity...</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg p-8 rounded-3xl shadow-xl bg-surface border border-border animate-fade-in relative overflow-hidden">
                {/* Decorative background gradients */}
                <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-emerald-400/20 rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute bottom-[-20%] left-[-20%] w-64 h-64 bg-blue-400/10 rounded-full blur-[60px] pointer-events-none" />

                <div className="relative z-10 space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Finish setup</h1>
                        <p className="text-muted font-medium">
                            This helps make receipts more credible on campus.
                        </p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
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

                        {error && (
                            <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-500/20 flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" /><path d="M8 5V8M8 11H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                {error}
                            </div>
                        )}

                        <button
                            disabled={saving}
                            className="w-full py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
