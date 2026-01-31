import type { Receipt, User, GraphNode, GraphLink } from './types';
import { ReceiptStatus } from './types';

export const CURRENT_USER_ID = 'u-me';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const INITIAL_USERS: User[] = [
    { id: 'u-me', email: 'me@example.com', first_name: 'Me', last_name: '', institution: 'Pledge', handle: '@me', maskedName: 'Me' },
    { id: 'u-1', email: 'alice@example.com', first_name: 'Alice', last_name: 'S.', institution: 'MIT', handle: '@alice', maskedName: 'Alice S.' },
    { id: 'u-2', email: 'bob@example.com', first_name: 'Bob', last_name: 'M.', institution: 'Stanford', handle: '@bob', maskedName: 'Bob M.' },
    { id: 'u-3', email: 'charlie@example.com', first_name: 'Charlie', last_name: '', institution: 'Harvard', handle: '@charlie', maskedName: 'Charlie' },
    { id: 'u-4', email: 'david@example.com', first_name: 'David', last_name: 'K.', institution: 'Oxford', handle: '@david', maskedName: 'David K.' },
];

export const INITIAL_RECEIPTS: Receipt[] = [
    { id: 'r-1', from_user_id: 'u-me', to_user_id: 'u-1', recipient_email: 'alice@example.com', connection_id: 'c-1', tags: ['mentorship', 'career'], status: ReceiptStatus.ACCEPTED, created_at: '2023-10-01T10:00:00Z', accepted_at: '2023-10-02T09:00:00Z', accepted_by_user_id: 'u-1', description: 'Career advice session', is_public: true },
    { id: 'r-2', from_user_id: 'u-1', to_user_id: 'u-me', recipient_email: 'me@example.com', connection_id: 'c-1', tags: ['referral'], status: ReceiptStatus.ACCEPTED, created_at: '2023-10-05T14:30:00Z', accepted_at: '2023-10-05T15:00:00Z', accepted_by_user_id: 'u-me', description: 'Intro to Tech Co', is_public: true },
    { id: 'r-3', from_user_id: 'u-me', to_user_id: null, recipient_email: 'bob@example.com', connection_id: null, tags: ['moving'], status: ReceiptStatus.AWAITING_SIGNUP, created_at: '2023-10-10T09:00:00Z', accepted_at: null, accepted_by_user_id: null, description: 'Helped move couch', is_public: false },
];

export const MOCK_GRAPH_NODES: GraphNode[] = [
    { id: 'u-me', label: 'Me', strength: 1, statusMix: { verified: 3, pending: 1, unclear: 1, rejected: 0 }, lastInteraction: '2023-10-15', topTags: ['mentorship'] },
    { id: 'u-1', label: 'Alice', strength: 0.8, statusMix: { verified: 2, pending: 0, unclear: 0, rejected: 0 }, lastInteraction: '2023-10-05', topTags: ['career'] },
    { id: 'u-2', label: 'Bob', strength: 0.4, statusMix: { verified: 0, pending: 1, unclear: 0, rejected: 0 }, lastInteraction: '2023-10-10', topTags: ['moving'] },
    { id: 'u-3', label: 'Charlie', strength: 0.6, statusMix: { verified: 1, pending: 0, unclear: 0, rejected: 0 }, lastInteraction: '2023-10-12', topTags: ['code'] },
    { id: 'u-4', label: 'David', strength: 0.2, statusMix: { verified: 0, pending: 0, unclear: 1, rejected: 0 }, lastInteraction: '2023-10-15', topTags: ['donation'] },
];

export const MOCK_GRAPH_LINKS: GraphLink[] = [
    { source: 'u-me', target: 'u-1', verifiedCount: 1, pendingCount: 0, unclearCount: 0, strength: 1, sentCount: 1, receivedCount: 0 },
    { source: 'u-1', target: 'u-me', verifiedCount: 1, pendingCount: 0, unclearCount: 0, strength: 1, sentCount: 1, receivedCount: 0 },
    { source: 'u-me', target: 'u-2', verifiedCount: 0, pendingCount: 1, unclearCount: 0, strength: 0.5, sentCount: 0, receivedCount: 0 },
    { source: 'u-3', target: 'u-me', verifiedCount: 1, pendingCount: 0, unclearCount: 0, strength: 0.8, sentCount: 1, receivedCount: 0 },
    { source: 'u-me', target: 'u-4', verifiedCount: 0, pendingCount: 0, unclearCount: 1, strength: 0.3, sentCount: 0, receivedCount: 0 },
];
