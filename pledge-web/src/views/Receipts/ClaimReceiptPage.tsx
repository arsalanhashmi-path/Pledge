import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link, useParams } from 'react-router-dom';
import { useStore } from '../../services/store';
import { useAuth } from '../../app/AuthProvider';
import { Layout } from '../../app/Layout';
import { supabase } from '../../services/supabaseClient';
import { CheckCircle2, AlertCircle, Loader2, Network, UserPlus } from 'lucide-react';
import type { Receipt } from '../../types';

export function ClaimReceiptPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { claimReceipt } = useStore();
    const { user: authUser, loading: authLoading, signOut } = useAuth();

    const { id: routeId } = useParams();
    const receiptId = searchParams.get('rid') || routeId;

    const [loading, setLoading] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [profileIncomplete, setProfileIncomplete] = useState(false);

    useEffect(() => {
        if (authLoading || !receiptId) return;

        // If we have an authUser, we fetch. If not, the UI will show the login prompt.
        if (!authUser) return;

        async function fetchReceiptAndCheckProfile() {
            setLoading(true);
            try {
                // 1. Fetch Receipt
                const { data, error: fetchError } = await supabase
                    .from('receipts')
                    .select('*')
                    .eq('id', receiptId)
                    .single();

                if (fetchError) throw fetchError;
                setReceipt(data as Receipt);

                // 2. Check Profile
                const { data: profile } = await supabase
                    .from('public_profiles')
                    .select('first_name,last_name,institution')
                    .eq('user_id', authUser!.id)
                    .maybeSingle();

                const isComplete = Boolean(profile?.first_name && profile?.last_name && profile?.institution);
                setProfileIncomplete(!isComplete);
            } catch (err: any) {
                console.error("Fetch error:", err);
                setError(err.message || "Failed to load receipt details.");
            } finally {
                setLoading(false);
            }
        }

        fetchReceiptAndCheckProfile();
    }, [receiptId, authUser, authLoading]);

    const handleClaim = async () => {
        if (!receiptId) return;
        setClaiming(true);
        setError(null);

        const result = await claimReceipt(receiptId);
        if (result.success) {
            setSuccess(true);
        } else {
            setError(result.message);
        }
        setClaiming(false);
    };

    if (loading || authLoading) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    <p className="text-slate-500 font-medium">
                        {authLoading ? "Initializing session..." : "Validating receipt..."}
                    </p>
                </div>
            </Layout>
        );
    }

    if (!authUser) {
        return (
            <Layout>
                <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
                        <UserPlus size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900">Sign in to Claim</h2>
                        <p className="text-slate-500 text-sm">You've received a proof of impact! Create an account or log in to claim it and connect with the sender.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Link
                            to={`/signup?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 text-center"
                        >
                            Create Account
                        </Link>
                        <Link
                            to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                            className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all text-center"
                        >
                            Log In
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    if (success) {
        return (
            <Layout>
                <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl text-center space-y-6 animate-slide-up">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900">Successfully Claimed!</h2>
                        <p className="text-slate-500 text-sm">You are now connected and the proof has been added to your ledger.</p>
                    </div>
                    <button
                        onClick={() => navigate('/receipts')}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all"
                    >
                        View My Ledger
                    </button>
                </div>
            </Layout>
        );
    }

    if (error && !success) {
        return (
            <Layout>
                <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl text-center space-y-6">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900">Oops!</h2>
                        <p className="text-slate-500 text-sm">{error}</p>
                    </div>
                    <Link to="/" className="inline-block py-3 px-8 bg-slate-900 text-white rounded-xl font-bold transition-transform hover:scale-105 active:scale-95">
                        Back to Home
                    </Link>
                </div>
            </Layout>
        );
    }

    // Checking email mismatch
    const isCorrectAccount = authUser.email?.toLowerCase() === receipt?.recipient_email?.toLowerCase();

    if (!isCorrectAccount) {
        return (
            <Layout>
                <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl text-center space-y-6">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900">Wrong Account</h2>
                        <p className="text-slate-500 text-sm">This receipt was sent to <strong>{receipt?.recipient_email}</strong>, but you are logged in as <strong>{authUser.email}</strong>.</p>
                    </div>
                    <p className="text-xs text-slate-400">Please switch accounts to claim this receipt.</p>
                    <Link to="/" className="inline-block py-3 px-8 bg-slate-900 text-white rounded-xl font-bold transition-transform hover:scale-105 active:scale-95">
                        Back to Home
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-md mx-auto mt-20 p-8 bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-2xl space-y-8 animate-slide-up">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-lg mb-4">
                        <Network size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Claim Impact Proof</h2>
                    <p className="text-slate-500 text-sm font-medium">Someone wants to verify their impact with you.</p>
                </div>

                <div className="p-6 bg-white/50 rounded-3xl border border-white border-b-slate-200/50 space-y-4 shadow-sm">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</p>
                        <p className="text-sm text-slate-700 font-semibold">{receipt?.description || "A favor was documented."}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {receipt?.tags?.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    {profileIncomplete ? (
                        <Link
                            to={`/onboarding?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                            className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-xl shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all hover:bg-amber-600 active:scale-95"
                        >
                            <span>Complete Your Profile to Claim</span>
                        </Link>
                    ) : (
                        <button
                            disabled={claiming}
                            onClick={handleClaim}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/10 flex items-center justify-center space-x-2 transition-all hover:bg-slate-800 disabled:opacity-50 active:scale-95"
                        >
                            {claiming ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <span>Claim & Connect</span>
                            )}
                        </button>
                    )}
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed px-4">
                            {profileIncomplete
                                ? "You need to finish setting up your profile before you can verify your impact."
                                : "By claiming, you confirm the details above and will automatically connect with the sender."}
                        </p>
                        {authUser && (
                            <button
                                onClick={() => signOut()}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                            >
                                Not {authUser.email}? Log out
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
