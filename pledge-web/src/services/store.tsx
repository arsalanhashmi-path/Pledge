import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Receipt, User, Connection } from '../types';
import { ReceiptStatus } from '../types';
import { INITIAL_USERS } from '../constants'; // Fallback
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
    rejectConnection: (connectionId: string) => Promise<void>;
    getUser: (id: string) => User | undefined;
    loading: boolean;
    signOut: () => Promise<void>;
    rejectReceipt: (receiptId: string) => Promise<{ success: boolean; message: string }>;
    deleteReceipt: (receiptId: string) => Promise<{ success: boolean; message: string }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const getLowHigh = (id1: string, id2: string) => {
        return id1 < id2 ? [id1, id2] : [id2, id1];
    };

    const fetchData = async (options: { silent?: boolean } = {}) => {
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
                    handle: myProfile.first_name,
                    maskedName: `${myProfile.first_name} ${myProfile.last_name}`
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

            // 3. Fetch Connections
            const { data: connectionsData, error: connError } = await supabase
                .from('connections')
                .select('*')
                .or(`low_id.eq.${authUser.id},high_id.eq.${authUser.id}`);

            if (connError) {
                console.error("Error fetching connections:", connError);
            }
            const conns = (connectionsData || []) as Connection[];
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
                        handle: p.first_name,
                        maskedName: `${p.first_name} ${p.last_name || ''}`.trim()
                    }));
                }
            }
            setUsers(allUsers);


        } catch (err) {
            console.error("fetchData error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                // Only re-fetch on meaningful events to avoid focus-trigger spam
                // or use a silent fetch if we already have data.
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
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const createReceipt = async (email: string, tags: string[], description: string, is_public: boolean): Promise<{ success: boolean; message: string; receipt?: Receipt }> => {
        if (!currentUser) return { success: false, message: "Not authenticated" };

        try {
            const { data, error } = await supabase.from('receipts').insert({
                from_user_id: currentUser.id,
                recipient_email: email.toLowerCase(),
                tags,
                description,
                is_public,
                status: 'AWAITING_SIGNUP'
            }).select().single();

            if (error) throw error;

            const newReceipt: Receipt = {
                id: data.id,
                from_user_id: data.from_user_id,
                to_user_id: data.to_user_id,
                recipient_email: data.recipient_email,
                connection_id: data.connection_id,
                tags: data.tags || [],
                description: data.description,
                is_public: data.is_public,
                status: data.status as ReceiptStatus,
                created_at: data.created_at,
                accepted_at: data.accepted_at,
                accepted_by_user_id: data.accepted_by_user_id
            };

            setReceipts(prev => [newReceipt, ...prev]);
            return { success: true, message: "Receipt created!", receipt: newReceipt };

        } catch (err: any) {
            console.error("createReceipt error:", err);
            return { success: false, message: err.message || "Failed to create receipt" };
        }
    };

    const claimReceipt = async (receiptId: string): Promise<{ success: boolean; message: string }> => {
        try {
            const { error } = await supabase.rpc('accept_connection_then_accept_receipt', {
                p_receipt_id: receiptId
            });

            if (error) throw error;

            await fetchData(); // Refresh everything
            return { success: true, message: "Connection created ✅ Receipt accepted ✅" };
        } catch (err: any) {
            console.error("claimReceipt error:", err);
            return { success: false, message: err.message || "Failed to claim receipt" };
        }
    };

    const addConnection = async (email: string): Promise<{ success: boolean; message: string }> => {
        if (!currentUser) return { success: false, message: "Not authenticated" };

        try {
            const { data: profiles, error: profileError } = await supabase
                .from('public_profiles')
                .select('*')
                .eq('email', email.toLowerCase())
                .maybeSingle();

            if (profileError || !profiles) return { success: false, message: "User not found." };
            const targetId = profiles.user_id;
            if (targetId === currentUser.id) return { success: false, message: "Cannot connect to self." };

            const [low, high] = getLowHigh(currentUser.id, targetId);

            // Check if already exists
            const { data: existing, error: existingError } = await supabase
                .from('connections')
                .select('*')
                .eq('low_id', low)
                .eq('high_id', high)
                .maybeSingle();

            if (existingError && existingError.code !== 'PGRST116') { // PGRST116 means no rows found
                throw existingError;
            }

            if (existing) {
                if (existing.accepted) {
                    return { success: false, message: "Already connected." };
                } else if (existing.requested_by === currentUser.id) {
                    return { success: false, message: "Request already sent." };
                } else {
                    return { success: false, message: "They already sent you a request. Check your inbox!" };
                }
            }

            const { error } = await supabase.from('connections').insert({
                low_id: low,
                high_id: high,
                requested_by: currentUser.id,
                accepted: false,
                requested_at: new Date().toISOString()
            });

            if (error) throw error;
            fetchData(); // Re-fetch to update local state
            return { success: true, message: "Request sent!" };

        } catch (err: any) {
            console.error(err);
            return { success: false, message: "Failed to send request." };
        }
    };

    const acceptConnection = async (connectionId: string) => {
        if (!currentUser) return;
        try {
            await supabase.from('connections').update({
                accepted: true,
                accepted_at: new Date().toISOString()
            }).eq('id', connectionId);
            fetchData(); // Re-fetch to update local state
        } catch (err) {
            console.error("Accept connection error:", err);
        }
    };

    const rejectConnection = async (connectionId: string) => {
        if (!currentUser) return;
        try {
            await supabase.from('connections').delete().eq('id', connectionId);
            fetchData(); // Re-fetch to update local state
        } catch (err) {
            console.error("Reject connection error:", err);
        }
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

    const signOut = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        setConnections([]);
        setUsers([]);
        setReceipts([]);
    };

    const value = useMemo(() => ({
        receipts, connections, users, currentUser, loading,
        createReceipt, claimReceipt, getUser, signOut,
        addConnection, acceptConnection, rejectConnection,
        rejectReceipt, deleteReceipt
    }), [
        receipts, connections, users, currentUser, loading,
        createReceipt, claimReceipt, getUser, signOut,
        addConnection, acceptConnection, rejectConnection,
        rejectReceipt, deleteReceipt
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
