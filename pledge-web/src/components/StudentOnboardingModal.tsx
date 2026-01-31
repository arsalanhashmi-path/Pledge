import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Loader2, GraduationCap, School, MapPin, Users, ShieldCheck, ArrowRight, Check, X, Plus } from 'lucide-react';

const LUMS_SOCIETIES = [
    "LUMS Media Arts (LMA)",
    "LUMS Student Council (LSC)",
    "LUMS Community Service Society (LCSS)",
    "SPADES",
    "LUMS Daily Student",
    "LUMS Entrepreneurial Society (LES)",
    "LUMS Model United Nations (LUMUN)",
    "LUMS Dramatics Society (Dramaline)",
    "LUMS Music Society (LMS)",
    "LUMS Religious Society (LRS)",
    "LUMS Arts Society (LAS)",
    "LUMS Photographic Society (LPS)",
    "LUMS Environmental Action Forum (LEAF)",
    "LUMS Finance Society (LFS)",
    "LUMS Adventure Society (LAS)",
    "LUMS Literary Society (LLS)",
    "LUMS Sports (SLUMS)",
    "FemSoc",
    "PsychSoc",
    "Law & Politics Society (LPS)",
    "Economics Society (LES)",
    "Alpha Analytics Society",
    "IEEE LUMS",
    "LUMS Culinary Society"
].sort();

export const StudentOnboardingModal: React.FC = () => {
    const { currentUser, getInferredIdentity, completeStudentOnboarding, signOut } = useStore();
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [identity, setIdentity] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Step 2 Form State
    const [firstName, setFirstName] = useState(currentUser?.first_name || '');
    const [lastName, setLastName] = useState(currentUser?.last_name || '');
    const [major, setMajor] = useState('');
    const [isHostelite, setIsHostelite] = useState(false);
    const [ghostMode, setGhostMode] = useState(false);
    const [selectedSocieties, setSelectedSocieties] = useState<string[]>([]);
    const [batchYear, setBatchYear] = useState<number | ''>('');
    const [rollNumber, setRollNumber] = useState('');

    // Sync names when currentUser loads
    useEffect(() => {
        if (currentUser) {
            if (!firstName && currentUser.first_name) setFirstName(currentUser.first_name);
            if (!lastName && currentUser.last_name) setLastName(currentUser.last_name);
        }
    }, [currentUser]);

    useEffect(() => {
        const fetchIdentity = async () => {
            setLoading(true);
            const res = await getInferredIdentity();
            if (res.success) {
                setIdentity(res.identity);
                // Auto-pick fields
                if (res.identity.batch_year) setBatchYear(res.identity.batch_year);
                if (res.identity.roll_number) setRollNumber(res.identity.roll_number);
            } else {
                setError(res.error || "Verification failed");
            }
            setLoading(false);
        };
        fetchIdentity();
    }, []);

    const handleComplete = async () => {
        // 1. Basic Field Validation
        const missing = [];
        if (!firstName.trim()) missing.push("First Name");
        if (!lastName.trim()) missing.push("Last Name");
        if (!major) missing.push("Academic Major");
        if (!batchYear) missing.push("Class Year");
        
        if (missing.length > 0) {
            alert(`Please fill in the following required fields: ${missing.join(", ")}`);
            return;
        }

        console.log("Onboarding Modal Submission Data:", {
            firstName, lastName, major, batchYear, identity
        });

        // 2. Identity Check
        if (!identity || !identity.institution_id) {
            alert("Student verification data is missing. Please refresh the page.");
            return;
        }

        setSaving(true);
        try {
            localStorage.setItem('just_onboarded', 'true');
            const payload = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                institution_id: identity.institution_id,
                campus_code: identity.campus_code || 'LUMS-MAIN',
                batch_year: Number(batchYear),
                roll_number: rollNumber || identity.roll_number,
                major,
                is_hostelite: isHostelite,
                societies: selectedSocieties,
                ghost_mode: ghostMode
            };
            const res = await completeStudentOnboarding(payload);
            
            if (!res.success) {
                alert(res.message || "Submission failed. Please try again.");
            }
            // Note: success handling (redirect) is handled by individual page or modal logic
            // In layout it will close the modal once currentUser profile is complete
        } catch (err: any) {
            console.error("Submission crash:", err);
            alert(`A technical error occurred: ${err.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
                    <p className="text-slate-400 font-medium">Verifying Student Credentials...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center border-red-500/30">
                    <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
                    <h2 className="text-2xl font-bold text-white mb-2">Verification Error</h2>
                    <p className="text-slate-400 mb-8">{error}</p>
                    <button 
                        onClick={() => signOut()}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-semibold"
                    >
                        Sign Out
                    </button>
                </Card>
            </div>
        );
    }

    const isLums = identity?.institution_id === 'LUMS';
    const themeColor = isLums ? 'from-red-950/90 via-slate-950 to-slate-950' : 'from-emerald-950/90 via-slate-950 to-slate-950';
    const accentColor = isLums ? 'text-red-500' : 'text-emerald-500';
    const borderColor = isLums ? 'border-red-500/20' : 'border-emerald-500/20';
    const glowColor = isLums ? 'bg-red-500/5' : 'bg-emerald-500/5';

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="max-w-2xl w-full py-8">
                    {step === 1 ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="text-center space-y-2">
                                <Badge variant="outline" className="px-4 py-1 border-emerald-500/50 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10">
                                    Identity Verified
                                </Badge>
                                <h1 className="text-4xl font-black text-white tracking-tight">
                                    The Magic Reveal
                                </h1>
                                <p className="text-slate-400">Our inference engine has mapped your credentials.</p>
                            </div>

                            <div className={`p-8 rounded-[2.5rem] border ${borderColor} bg-gradient-to-br ${themeColor} shadow-2xl relative overflow-hidden group backdrop-blur-md`}>
                                {/* Animated background glow */}
                                <div className={`absolute -top-24 -right-24 w-96 h-96 ${glowColor} rounded-full blur-[100px] animate-pulse`} />
                                
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                    <div className={`w-28 h-28 rounded-3xl bg-white/5 flex items-center justify-center ring-1 ring-white/10 shadow-inner overflow-hidden relative group-hover:scale-105 transition-transform duration-500`}>
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opaicty-50" />
                                        <School className={`w-14 h-14 ${accentColor} relative z-10 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]`} />
                                    </div>
                                    
                                    <div className="flex-1 text-center md:text-left space-y-3">
                                        <div className="flex items-center justify-center md:justify-start gap-3">
                                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{identity?.institution_id}</h2>
                                            <Badge className="bg-white/10 text-white border-white/10 py-1 px-3 backdrop-blur-md">Verified Student</Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 text-slate-400 font-semibold text-sm">
                                            <span className="flex items-center gap-2 group/item"><GraduationCap className="w-5 h-5 text-slate-500 group-hover/item:text-white transition-colors" /> Class of {identity?.batch_year}</span>
                                            <span className="flex items-center gap-2 group/item"><MapPin className="w-5 h-5 text-slate-500 group-hover/item:text-white transition-colors" /> {identity?.campus_code}</span>
                                            <span className="flex items-center gap-2 group/item"><Users className="w-5 h-5 text-slate-500 group-hover/item:text-white transition-colors" /> ID: {identity?.roll_number}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button 
                                    onClick={() => setStep(2)}
                                    className="w-full py-5 bg-white hover:bg-slate-100 text-slate-950 rounded-2xl flex items-center justify-center gap-3 font-black text-xl transition-all active:scale-[0.98] shadow-[0_20px_50px_rgba(255,255,255,0.1)] group"
                                >
                                    Confirm & Continue <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="text-center space-y-3">
                                <h1 className="text-5xl font-black text-white tracking-tighter italic">Personalize</h1>
                                <p className="text-slate-500 font-medium text-lg">Finalize your on-campus identity.</p>
                            </div>

                            <Card className="p-10 border-white/5 bg-slate-900/40 backdrop-blur-2xl space-y-10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-[3rem]">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">First Name</label>
                                            <input 
                                                type="text" 
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="Enter first name"
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all placeholder:text-slate-700 font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Last Name</label>
                                            <input 
                                                type="text" 
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Enter last name"
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all placeholder:text-slate-700 font-semibold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Academic Major</label>
                                        <div className="relative group">
                                            <select 
                                                value={major}
                                                onChange={(e) => setMajor(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all appearance-none cursor-pointer font-semibold"
                                            >
                                                <option value="" className="bg-slate-900">Select major...</option>
                                                <option value="CS" className="bg-slate-900">Computer Science</option>
                                                <option value="Economics" className="bg-slate-900">Economics</option>
                                                <option value="Law" className="bg-slate-900">Law (BA-LLB)</option>
                                                <option value="Management" className="bg-slate-900">Management Sciences</option>
                                                <option value="BSS" className="bg-slate-900">Social Sciences</option>
                                                <option value="SDSB" className="bg-slate-900">MBA / Business</option>
                                            </select>
                                            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Class Of</label>
                                        <input 
                                            type="number" 
                                            value={batchYear}
                                            onChange={(e) => setBatchYear(e.target.value ? parseInt(e.target.value) : '')}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all font-semibold"
                                        />
                                    </div>
                                </div>

                                 <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Societies & Clubs</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {selectedSocieties.map(soc => (
                                            <Badge 
                                                key={soc} 
                                                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 flex items-center gap-2 group hover:bg-emerald-500/20 transition-colors"
                                            >
                                                {soc}
                                                <X 
                                                    className="w-3 h-3 cursor-pointer hover:text-white" 
                                                    onClick={() => setSelectedSocieties(prev => prev.filter(s => s !== soc))}
                                                />
                                            </Badge>
                                        ))}
                                        {selectedSocieties.length === 0 && (
                                            <span className="text-xs text-slate-600 italic px-1 pt-1">No societies selected.</span>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <select 
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val && !selectedSocieties.includes(val)) {
                                                    setSelectedSocieties(prev => [...prev, val]);
                                                }
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">Add a society...</option>
                                            {LUMS_SOCIETIES.filter(s => !selectedSocieties.includes(s)).map(soc => (
                                                <option key={soc} value={soc}>{soc}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Residence Status</label>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div 
                                            onClick={() => setIsHostelite(true)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${isHostelite ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isHostelite ? 'border-emerald-500 bg-emerald-500' : 'border-slate-700'}`}>
                                                {isHostelite && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="font-semibold text-sm">Hostelite</span>
                                        </div>
                                        <div 
                                            onClick={() => setIsHostelite(false)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${!isHostelite ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${!isHostelite ? 'border-emerald-500 bg-emerald-500' : 'border-slate-700'}`}>
                                                {!isHostelite && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="font-semibold text-sm">Day Scholar</span>
                                        </div>
                                     </div>
                                </div>

                                <div className="space-y-4 pt-2 border-t border-slate-800">
                                     <div className="flex items-center justify-between px-1">
                                        <div className="space-y-0.5">
                                            <label className="text-xs font-bold text-white uppercase tracking-widest">Profile Visibility</label>
                                            <p className="text-[10px] text-slate-500">Decide if your profile is visible in the network.</p>
                                        </div>
                                        <div 
                                            onClick={() => setGhostMode(!ghostMode)}
                                            className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center ${ghostMode ? 'bg-slate-700' : 'bg-emerald-500'}`}
                                        >
                                            <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${ghostMode ? 'translate-x-0' : 'translate-x-6'}`} />
                                        </div>
                                     </div>
                                     <div className={`px-4 py-3 rounded-xl border transition-all ${ghostMode ? 'border-amber-500/30 bg-amber-500/5 text-amber-200' : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'}`}>
                                        <p className="text-xs font-medium">
                                            {ghostMode 
                                                ? "PRIVATE MODE: Your profile will be hidden from global searches and rankings." 
                                                : "PUBLIC MODE: You will appear in the campus network and leaderboard."}
                                        </p>
                                     </div>
                                </div>

                                <div className="pt-4 space-y-4">
                                    <button 
                                        onClick={handleComplete}
                                        disabled={saving}
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 rounded-2xl flex items-center justify-center gap-2 font-black text-lg transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                    >
                                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Join the Network'}
                                    </button>
                                    <button 
                                        onClick={() => setStep(1)}
                                        className="w-full py-2 text-slate-500 hover:text-slate-400 font-bold transition-colors"
                                    >
                                        Back
                                    </button>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
