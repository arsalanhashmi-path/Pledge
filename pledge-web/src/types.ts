export const ReceiptStatus = {
    AWAITING_SIGNUP: 'AWAITING_SIGNUP',
    AWAITING_CONNECTION: 'AWAITING_CONNECTION',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED'
} as const;

export type ReceiptStatus = typeof ReceiptStatus[keyof typeof ReceiptStatus];

export interface User {
    id: string; // user_id in DB
    email: string;
    first_name: string;
    last_name: string;
    institution: string;
    handle: string; // derived
    maskedName: string; // derived
}

export interface Receipt {
    id: string;
    from_user_id: string;
    to_user_id: string | null;
    recipient_email: string;
    connection_id: string | null;
    tags: string[];
    description: string | null;
    is_public: boolean;
    status: ReceiptStatus;
    created_at: string;
    accepted_at: string | null;
    accepted_by_user_id: string | null;
}

export interface GraphNode {
    id: string;
    label: string;
    strength: number; // Based on verified interactions
    statusMix: {
        verified: number;
        pending: number;
        unclear: number;
    };
    lastInteraction: string;
    topTags: string[];
    interactionStats?: {
        sent: number;
        received: number;
    };
    isMe?: boolean;
}

export interface GraphLink {
    source: string;
    target: string;
    verifiedCount: number;
    pendingCount: number;
    unclearCount: number;
    sentCount: number;     // Help sent FROM source TO target
    receivedCount: number; // Help received BY source FROM target
    strength: number;
}

export type ViewMode = 'GRAPH' | 'LIST';

export interface Connection {
    id: string;
    low_id: string;
    high_id: string;
    requested_by: string;
    accepted: boolean;
    requested_at: string;
    accepted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface GraphPayload {
    nodes: GraphNode[];
    links: GraphLink[];
}
