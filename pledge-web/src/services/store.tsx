import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import type { Receipt, User, Connection } from '../types';
import { ReceiptStatus } from '../types';
import { INITIAL_USERS, API_BASE_URL } from '../constants'; // Fallback
import { supabase } from './supabaseClient';

interface StoreContextType {
    receipts: Receipt[];
    connections: Connection[];
    users: User[];
    currentUser: User | null;
    createReceipt: (email: string, tags: string[], description: string, is_public: boolean) => Promise<{ success: boolean; message: string; receipt?: Receipt }>;
    claimReceipt: (receiptId: string) => Promise<{ success: boolean; message: string }>;
    addConnection: (email: string) => Promise<{ success: boolean; message: string }>;
    acceptConnection: (connectionId: string) => Promise<void>;
    rejectConnection: (connectionId: string) => Promise<void>; // Alias for remove/delete
    removeConnection: (connectionId: string) => Promise<{ success: boolean; message: string }>;
    getUser: (id: string) => User | undefined;
    loading: boolean;
    signOut: () => Promise<void>;
    rejectReceipt: (receiptId: string) => Promise<{ success: boolean; message: string }>;
    deleteReceipt: (receiptId: string) => Promise<{ success: boolean; message: string }>;
    completeStudentOnboarding: (data: Partial<User>) => Promise<{ success: boolean; message: string }>;
    getInferredIdentity: () => Promise<{ success: boolean; identity?: any; error?: string }>;
    unreadCounts: { [key: string]: number };
    setUnreadCount: (userId: string, count: number) => void;
    refreshUnreadCounts: () => Promise<void>;
    setActiveConversationId: (id: string | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});

    // Helper removed as logic moved to backend

    const lastFetchRef = React.useRef<number>(0);

    const fetchData = async (options: { silent?: boolean; force?: boolean } = {}) => {
        const now = Date.now();
        // Debounce: If called within 2 seconds, skip unless forced
        if (!options.force && (now - lastFetchRef.current < 2000)) {
            return;
        }
        lastFetchRef.current = now;

        try {
            if (!options.silent) {
                setLoading(true);
            }
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                setLoading(false);
                setReceipts([]);
                setConnections([]);
                setCurrentUser(null);
                setUsers([]);
                return;
            }

            // 1. Fetch My Profile
            const { data: myProfile } = await supabase
                .from('public_profiles')
                .select('*')
                .eq('user_id', authUser.id)
                .maybeSingle();

            if (myProfile) {
                setCurrentUser({
                    id: myProfile.user_id,
                    email: myProfile.email,
                    first_name: myProfile.first_name,
                    last_name: myProfile.last_name,
                    institution: myProfile.institution,
                    institution_id: myProfile.institution_id,
                    campus_code: myProfile.campus_code,
                    batch_year: myProfile.batch_year,
                    roll_number: myProfile.roll_number,
                    major: myProfile.major,
                    is_hostelite: myProfile.is_hostelite,
                    societies: myProfile.societies,
                    ghost_mode: myProfile.ghost_mode,
                    handle: myProfile.first_name,
                    maskedName: `${myProfile.first_name} ${myProfile.last_name}`,
                    created_at: myProfile.created_at
                });
            } else {
                // Fallback for partially onboarded users
                setCurrentUser({
                    id: authUser.id,
                    email: authUser.email || '',
                    first_name: '',
                    last_name: '',
                    institution: '',
                    handle: authUser.email?.split('@')[0] || 'User',
                    maskedName: authUser.email || 'Anonymous'
                });
            }

            // 2. Fetch Receipts
            const myEmail = authUser.email?.toLowerCase();
            const { data: receiptsData, error: receiptsError } = await supabase
                .from('receipts')
                .select('*')
                .or(`from_user_id.eq.${authUser.id},recipient_email.eq.${myEmail}`)
                .order('created_at', { ascending: false });

            if (receiptsError) {
                console.error("Error fetching receipts:", receiptsError);
            }

            const mappedReceipts: Receipt[] = (receiptsData || []).map((r: any) => ({
                id: r.id,
                from_user_id: r.from_user_id,
                to_user_id: r.to_user_id,
                recipient_email: r.recipient_email,
                connection_id: r.connection_id,
                tags: r.tags || [],
                description: r.description,
                is_public: r.is_public,
                status: r.status as ReceiptStatus,
                created_at: r.created_at,
                accepted_at: r.accepted_at,
                accepted_by_user_id: r.accepted_by_user_id
            }));
            setReceipts(mappedReceipts);

            // 3. Fetch Connections (API)
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            let conns: Connection[] = [];
            
            if (token) {
                 const connRes = await fetch(`${API_BASE_URL}/api/connections`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const connJson = await connRes.json();
                if (connJson.success) {
                    conns = connJson.data;
                }
            }
            setConnections(conns);

            // 4. Fetch Related Profiles (from both connections and receipts)
            const relatedIds = new Set<string>();
            relatedIds.add(authUser.id);
            conns.forEach(c => {
                relatedIds.add(c.low_id);
                relatedIds.add(c.high_id);
            });
            mappedReceipts.forEach(r => {
                relatedIds.add(r.from_user_id);
                if (r.to_user_id) relatedIds.add(r.to_user_id);
            });

            let allUsers: User[] = [];
            if (relatedIds.size > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('public_profiles')
                    .select('*')
                    .in('user_id', Array.from(relatedIds));

                if (profilesError) {
                    console.error("Error fetching profiles:", profilesError);
                }

                if (profiles) {
                    allUsers = profiles.map((p: any) => ({
                        id: p.user_id,
                        email: p.email,
                        first_name: p.first_name,
                        last_name: p.last_name,
                        institution: p.institution,
                        institution_id: p.institution_id,
                        campus_code: p.campus_code,
                        batch_year: p.batch_year,
                        roll_number: p.roll_number,
                        major: p.major,
                        handle: p.first_name,
                        maskedName: `${p.first_name} ${p.last_name || ''}`.trim()
                    }));
                }
            }
            setUsers(allUsers);
            
            // 5. Fetch Unread Counts
            import('./chatService').then(({ chatService }) => {
                chatService.getUnreadCounts().then(setUnreadCounts);
            });

        } catch (err) {
            console.error("fetchData error:", err);
        } finally {
            setLoading(false);
        }
    };

    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const activeConversationIdRef = useRef(activeConversationId);

    // Keep ref in sync
    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const refreshUnreadCounts = React.useCallback(async () => {
        const { chatService } = await import('./chatService');
        const counts = await chatService.getUnreadCounts();
        // Force active conversation to 0
        if (activeConversationIdRef.current) {
            counts[activeConversationIdRef.current] = 0;
        }
        setUnreadCounts(counts);
    }, []); 

    const setUnreadCount = React.useCallback((userId: string, count: number) => {
        if (userId === activeConversationIdRef.current) return; // Don't set non-zero for active
        setUnreadCounts(prev => ({
            ...prev,
            [userId]: count
        }));
    }, []);

    // Centralized Realtime Subscription
    useEffect(() => {
        let channel: any;
        let isMounted = true;

        if (!currentUser) return;

        import('./chatService').then(({ chatService }) => {
            if (!isMounted) return;

            // Subscribe globally
            channel = chatService.subscribeToMessages((msg, eventType) => {
                const isForMe = msg.recipient_id === currentUser.id;
                const isFromMe = msg.sender_id === currentUser.id;

                if (!isForMe && !isFromMe) return;

                // If currently viewing this chat, ignore increments
                if (isForMe && msg.sender_id === activeConversationIdRef.current) {
                    return;
                }

                if (eventType === 'INSERT') {
                    if (isForMe) {
                        // Optimistic Increment
                        setUnreadCounts(prev => ({
                            ...prev,
                            [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
                        }));
                    }
                } else {
                    // UPDATE or DELETE -> Refresh to be safe
                    refreshUnreadCounts();
                }
            }, 'store-global-listener');
        });

        return () => {
             isMounted = false;
             if (channel) supabase.removeChannel(channel);
        };
    }, [currentUser, refreshUnreadCounts]); // Stable dependencies

    useEffect(() => {
        // Initial fetch
        fetchData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    fetchData();
                } else if (event === 'TOKEN_REFRESHED') {
                    fetchData({ silent: true });
                }
            } else {
                setReceipts([]);
                setConnections([]);
                setCurrentUser(null);
                setUsers([]);
                setUnreadCounts({});
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const createReceipt = async (email: string, tags: string[], description: string, is_public: boolean): Promise<{ success: boolean; message: string; receipt?: Receipt }> => {
        if (!currentUser) return { success: false, message: "Not authenticated" };
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return { success: false, message: "No token" };

        try {
            const res = await fetch(`${API_BASE_URL}/api/receipts/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email,
                    tags,
                    description,
                    is_public
                })
            });

            const json = await res.json();
            
            if (!res.ok || !json.success) {
                return { success: false, message: json.error || "Failed to create receipt" };
            }

            await fetchData();
            return { success: true, message: "Receipt created!", receipt: json.receipt };

        } catch (err: any) {
            console.error("createReceipt error:", err);
            return { success: false, message: err.message || "Failed to create receipt" };
        }
    };

    const claimReceipt = async (receiptId: string): Promise<{ success: boolean; message: string }> => {
        if (!currentUser) return { success: false, message: "Not authenticated" };
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return { success: false, message: "No token" };

        try {
            const res = await fetch(`${API_BASE_URL}/api/receipts/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ receipt_id: receiptId })
            });

            const json = await res.json();
            
            if (!res.ok || !json.success) {
                return { success: false, message: json.error || "Failed to claim receipt" };
            }

            await fetchData();
            return { success: true, message: "Receipt accepted!" };

        } catch (err: any) {
            console.error("claimReceipt error:", err);
            return { success: false, message: err.message || "Failed to claim receipt" };
        }
    };

    const addConnection = async (email: string): Promise<{ success: boolean; message: string }> => {
        if (!currentUser) return { success: false, message: "Not authenticated" };
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return { success: false, message: "No token" };

        try {
            const res = await fetch(`${API_BASE_URL}/api/connections/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email })
            });
            
            const json = await res.json();
            if (!json.success && !res.ok) {
                 return { success: false, message: json.error || "Failed to send request" };
            }
            
            fetchData();
            return { success: true, message: "Request sent!" };
        } catch (err: any) {
            console.error(err);
            return { success: false, message: "Failed to send request." };
        }
    };

    const acceptConnection = async (connectionId: string) => {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;

        // 1. Optimistic Update
        const previousConnections = [...connections];
        setConnections(prev => prev.map(c => 
            c.id === connectionId 
                ? { ...c, accepted: true, accepted_at: new Date().toISOString() } 
                : c
        ));

        try {
             const res = await fetch(`${API_BASE_URL}/api/connections/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ connection_id: connectionId })
            });

            if (!res.ok) {
                throw new Error("Failed to accept");
            }
            
            // No need to fetchData() since we updated state locally!
        } catch (err) {
            console.error("Accept connection error:", err);
            // Revert on error
            setConnections(previousConnections);
            // Optionally show toast error here
        }
    };

    const removeConnection = async (connectionId: string): Promise<{ success: boolean; message: string }> => {
        if (!currentUser) return { success: false, message: "Not authenticated" };
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return { success: false, message: "No token" };

        // 1. Optimistic Update
        const previousConnections = [...connections];
        setConnections(prev => prev.filter(c => c.id !== connectionId));

        try {
             const res = await fetch(`${API_BASE_URL}/api/connections/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ connection_id: connectionId })
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to remove");
            }
            
            await fetchData();
            return { success: true, message: "Connection removed" };
        } catch (err: any) {
            console.error("removeConnection error:", err);
            // Revert
            setConnections(previousConnections);
            return { success: false, message: err.message || "Failed to remove connection" };
        }
    };

    const rejectConnection = async (connectionId: string) => {
       // Rejection is effectively the same as removing/deleting in this schema
       await removeConnection(connectionId);
    };

    const rejectReceipt = async (receiptId: string): Promise<{ success: boolean; message: string }> => {
        try {
            const { error } = await supabase
                .from('receipts')
                .update({ status: ReceiptStatus.REJECTED })
                .eq('id', receiptId);

            if (error) throw error;
            await fetchData();
            return { success: true, message: "Receipt rejected" };
        } catch (err: any) {
            console.error("rejectReceipt error:", err);
            return { success: false, message: err.message || "Failed to reject receipt" };
        }
    };

    const deleteReceipt = async (receiptId: string): Promise<{ success: boolean; message: string }> => {
        if (!currentUser) return { success: false, message: "Not authenticated" };
        try {
            // Optional: verify ownership before delete since RLS is disabled
            const { data: receipt } = await supabase.from('receipts').select('from_user_id, status').eq('id', receiptId).single();
            if (receipt && receipt.from_user_id !== currentUser.id) {
                return { success: false, message: "You can only delete your own receipts." };
            }

            const { error } = await supabase
                .from('receipts')
                .delete()
                .eq('id', receiptId);

            if (error) throw error;
            await fetchData();
            return { success: true, message: "Receipt deleted" };
        } catch (err: any) {
            console.error("deleteReceipt error:", err);
            return { success: false, message: err.message || "Failed to delete receipt" };
        }
    };

    const getUser = (id: string) => {
        return users.find(u => u.id === id);
    };

    const completeStudentOnboarding = async (onboardingData: Partial<User>): Promise<{ success: boolean; message: string }> => {
        if (!currentUser) return { success: false, message: "Not authenticated" };
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return { success: false, message: "No token" };

        try {
            const res = await fetch(`${API_BASE_URL}/api/onboarding`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(onboardingData)
            });

            const json = await res.json();
            
            if (!res.ok || !json.success) {
                const errMsg = json.error || json.message || "Failed to complete onboarding";
                console.error("Onboarding API Error:", json);
                return { success: false, message: errMsg };
            }

            await fetchData({ force: true });
            return { success: true, message: "Onboarding complete!" };

        } catch (err: any) {
            console.error("completeStudentOnboarding error:", err);
            return { success: false, message: err.message || "Failed to complete onboarding" };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        setConnections([]);
        setUsers([]);
        setReceipts([]);
    };

    const getInferredIdentity = async (): Promise<{ success: boolean; identity?: any; error?: string }> => {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return { success: false, error: "No token" };

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-student`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            return { success: json.success, identity: json.identity, error: json.error };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const value = useMemo(() => ({
        receipts, connections, users, currentUser, loading,
        createReceipt, claimReceipt, getUser, signOut,
        addConnection, acceptConnection, rejectConnection, removeConnection,
        rejectReceipt, deleteReceipt, completeStudentOnboarding, getInferredIdentity,
        unreadCounts, setUnreadCount, refreshUnreadCounts, setActiveConversationId
    }), [
        receipts, connections, users, currentUser, loading,
        createReceipt, claimReceipt, getUser, signOut,
        addConnection, acceptConnection, rejectConnection, removeConnection,
        rejectReceipt, deleteReceipt, completeStudentOnboarding, getInferredIdentity,
        unreadCounts, setUnreadCount, refreshUnreadCounts, setActiveConversationId
    ]);

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};
