import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

type AuthCtx = {
    session: Session | null;
    user: User | null;
    loading: boolean;
    emailConfirmed: boolean;
    signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function initAuth() {
            try {
                // getSession is fast but might return stale data
                const { data: { session: initialSession } } = await supabase.auth.getSession();

                if (initialSession) {
                    // getUser verifies the session with the server (more reliable but slower)
                    const { data: { user: verifiedUser }, error } = await supabase.auth.getUser();
                    if (!error && verifiedUser) {
                        if (mounted) {
                            setSession(initialSession);
                            setUser(verifiedUser);
                        }
                    } else {
                        // Session invalid, clear it
                        if (mounted) {
                            setSession(null);
                            setUser(null);
                        }
                    }
                }
            } catch (err) {
                console.error("Auth init error:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        initAuth();

        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (mounted) {
                setSession(newSession);
                setUser(newSession?.user ?? null);
            }
        });

        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
    };

    const emailConfirmed = Boolean(user?.email_confirmed_at);

    const value = useMemo(() => ({ session, user, loading, emailConfirmed, signOut }), [session, user, loading, emailConfirmed]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
    const v = useContext(Ctx);
    if (!v) throw new Error('useAuth must be used within AuthProvider');
    return v;
}
