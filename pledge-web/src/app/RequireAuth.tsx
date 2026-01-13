import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { supabase } from '../services/supabaseClient';

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const loc = useLocation();

    if (loading) return <div className="p-4 flex items-center justify-center h-screen text-muted font-bold animate-pulse">Loading...</div>;
    if (!user) return <Navigate to="/login" replace state={{ returnTo: loc.pathname + loc.search }} />;

    return <>{children}</>;
}

export function RequireConfirmedEmail({ children }: { children: React.ReactNode }) {
    const { emailConfirmed, loading } = useAuth();

    if (loading) return null;

    if (!emailConfirmed) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                <div className="max-w-md w-full bg-surface p-8 rounded-3xl border border-border shadow-xl text-center">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Confirm your email</h2>
                    <p className="text-muted mb-6">
                        We sent a confirmation link to your inbox. Please click it to continue.
                    </p>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-slate-900/10">
                        I've Confirmed It
                    </button>
                    <div className="mt-4">
                        <a href="/login" className="text-muted text-xs hover:text-foreground font-bold">Back to Login</a>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

function isCompleteProfile(p: any) {
    return Boolean(
        p?.first_name &&
        p?.last_name &&
        p?.institution
    );
}

export function RequireOnboarding({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<'loading' | 'complete' | 'incomplete'>('loading');
    const loc = useLocation();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        (async () => {
            // Check public profile
            const { data: publicProfile } = await supabase
                .from('public_profiles')
                .select('first_name,last_name,institution')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!publicProfile) {
                setState('incomplete');
                return;
            }

            setState(isCompleteProfile(publicProfile) ? 'complete' : 'incomplete');
        })();
    }, [user]);

    if (state === 'loading') return <div className="p-4 flex items-center justify-center h-screen text-muted font-bold animate-pulse">Checking profile...</div>;
    if (state === 'incomplete') return <Navigate to={`/onboarding?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;

    return <>{children}</>;
}
