import React from 'react';
import { createBrowserRouter, Navigate, useLocation, Outlet } from 'react-router-dom';
import { HomePage } from '../views/Home/HomePage';
import { LoginPage } from '../views/Auth/LoginPage';
import { OnboardingPage } from '../views/Auth/OnboardingPage';
import { SignUpPage } from '../views/Auth/SignUpPage';
import { CreateReceiptPage } from '../views/Receipts/CreateReceiptPage.tsx';
import { VerifyReceiptPage } from '../views/Receipts/VerifyReceiptPage.tsx';
import { ReceiptsPage } from '../views/Receipts/ReceiptsPage';
import { ReceiptDetailPage } from '../views/Receipts/ReceiptDetailPage';
import { ClaimReceiptPage } from '../views/Receipts/ClaimReceiptPage';
import { UserProfilePage } from '../views/Profile/UserProfilePage';
import { ConnectionsPage } from '../views/Connections/ConnectionsPage.tsx';
import { SettingsPage } from '../views/Settings/SettingsPage';
import { RequireAuth, RequireConfirmedEmail, RequireOnboarding } from './RequireAuth';
import { supabase } from '../services/supabaseClient';

/**
 * Detects legacy hash-based URLs (e.g., /#/claim) and redirects them
 * to the corresponding clean URL path. This ensures deep links from
 * older versions of the app continue to work.
 */
function HashRedirect() {
    const loc = useLocation();
    React.useEffect(() => {
        if (window.location.hash.startsWith('#/')) {
            const path = window.location.hash.replace('#/', '/');
            // Remove the hash and navigate to the clean path
            window.history.replaceState(null, '', path);
            window.location.reload(); // Force reload to re-initialize router with clean path
        }
    }, [loc]);

    return null;
}

export const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <>
                <HashRedirect />
                <Outlet />
            </>
        ),
        children: [
            {
                path: '/',
                element: (
                    <RequireAuth>
                        <RequireConfirmedEmail>
                            <RequireOnboarding>
                                <HomePage />
                            </RequireOnboarding>
                        </RequireConfirmedEmail>
                    </RequireAuth>
                ),
            },
            { path: 'u/:userId', element: <UserProfilePage /> },
            {
                path: 'connections',
                element: (
                    <RequireAuth>
                        <RequireConfirmedEmail>
                            <RequireOnboarding>
                                <ConnectionsPage />
                            </RequireOnboarding>
                        </RequireConfirmedEmail>
                    </RequireAuth>
                ),
            },
            {
                path: 'portfolio',
                element: (
                    <RequireAuth>
                        <PortfolioRedirect />
                    </RequireAuth>
                ),
            },
            {
                path: 'settings',
                element: (
                    <RequireAuth>
                        <RequireConfirmedEmail>
                            <RequireOnboarding>
                                <SettingsPage />
                            </RequireOnboarding>
                        </RequireConfirmedEmail>
                    </RequireAuth>
                ),
            },
            {
                path: 'onboarding',
                element: (
                    <RequireAuth>
                        <RequireConfirmedEmail>
                            <OnboardingPage />
                        </RequireConfirmedEmail>
                    </RequireAuth>
                ),
            },
            { path: 'login', element: <LoginPage /> },
            { path: 'signup', element: <SignUpPage /> },

            {
                path: 'create',
                element: (
                    <RequireAuth>
                        <RequireConfirmedEmail>
                            <RequireOnboarding>
                                <CreateReceiptPage />
                            </RequireOnboarding>
                        </RequireConfirmedEmail>
                    </RequireAuth>
                ),
            },
            {
                path: 'verify/:id',
                element: (
                    <RequireAuth>
                        <RequireOnboarding>
                            <VerifyReceiptPage />
                        </RequireOnboarding>
                    </RequireAuth>
                ),
            },
            { path: 'claim', element: <ClaimReceiptPage /> },
            { path: 'c/:id', element: <ClaimReceiptPage /> },
            {
                path: 'receipt/:id',
                element: (
                    <RequireAuth>
                        <RequireConfirmedEmail>
                            <RequireOnboarding>
                                <ReceiptDetailPage />
                            </RequireOnboarding>
                        </RequireConfirmedEmail>
                    </RequireAuth>
                ),
            },
            {
                path: 'receipts',
                element: (
                    <RequireAuth>
                        <RequireConfirmedEmail>
                            <RequireOnboarding>
                                <ReceiptsPage />
                            </RequireOnboarding>
                        </RequireConfirmedEmail>
                    </RequireAuth>
                ),
            },
        ],
    },
]);

function PortfolioRedirect() {
    const [userId, setUserId] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id || null);
            setLoading(false);
        });
    }, []);

    if (loading) return null;
    if (!userId) return <Navigate to="/login" />;
    return <Navigate to={`/u/${userId}`} replace />;
}
