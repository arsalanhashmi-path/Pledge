import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Loader2 } from 'lucide-react';

export function LoginPage() {
    const nav = useNavigate();
    const loc = useLocation();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [error, setError] = useState<string>('');

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus('loading');
        setError('');

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            setStatus('error');
            return;
        }

        if (data.session) {
            const returnTo = loc.state?.returnTo || searchParams.get('redirect') || '/';
            nav(returnTo);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="glass-card w-full max-w-md p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-white/60 relative z-10 animate-slide-up">
                <div className="text-center mb-10 space-y-2">
                    <div className="w-16 h-16 bg-slate-900 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-slate-900/20">
                        <Lock className="text-white" size={28} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-500 font-medium">Sign in to your Pledge account</p>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 text-slate-400 transition-colors group-focus-within:text-slate-800" size={18} />
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                required
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between pl-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                            <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-slate-800 transition-colors">Forgot?</a>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-slate-400 transition-colors group-focus-within:text-slate-800" size={18} />
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                required
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-start gap-2 animate-shake">
                            <span className="shrink-0">•</span>
                            {error}
                        </div>
                    )}

                    <button
                        disabled={status === 'loading'}
                        type="submit"
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] flex items-center justify-center space-x-2 mt-4"
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm font-medium text-slate-500">
                        Don't have an account?{' '}
                        <Link
                            to={searchParams.get('redirect') ? `/signup?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : "/signup"}
                            className="text-slate-900 font-bold hover:underline underline-offset-4 decoration-2"
                        >
                            Create Proof
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
