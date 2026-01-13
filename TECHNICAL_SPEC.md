# Technical Specification

## 1. System Overview

**Pledge** is a trust-based professional network. This document details the full technical stack, database schema, API services, and page-level implementation details.

### Architecture Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (Zinc Theme).
- **Backend Service**: Flask (Python) on Port 5000. Handles complex business logic (e.g., email-based late binding, referrals).
- **Database**: Supabase (PostgreSQL 15) with Row Level Security (RLS).
- **Auth**: Supabase Auth (JWT).

---

## 2. Database Schema (PostgreSQL)

### 2.1 Core Tables

| Table             | RLS Policy                                              | Description                                             |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| `public_profiles` | **SELECT**: Public. **UPDATE**: Owner.                  | User identity (Name, Inst., Email).                     |
| `connections`     | **SELECT/ALL**: Involved parties (`low_id`, `high_id`). | Undirected graph edges. `accepted=true` means verified. |
| `receipts`        | **SELECT**: Sender OR Recipient OR Email Match.         | The proof unit. Links to `connections`.                 |

(See `schema.sql` for full constraints and triggers).

---

## 3. Backend API Services (`app.py`)

Flask API handles operations that require atomic checks across multiple tables or "Late Binding" logic (interacting with non-users).

### 3.1 Authentication

**Middleware**: `@authenticate_user`

- Validates the `Authorization: Bearer <token>` header against Supabase Auth.
- Injects `g.user` (UUID, Email) into the request context.

### 3.2 Key Endpoints

- **`POST /api/onboarding`**: Upserts profile, auto-accepts referral connection, and executes "Receipt Recovery" (linking orphaned receipts sent to this email before signup).
- **`POST /api/receipts/create`**: Logic:
  - Finds Recipient via Email.
  - Determines Status (`AWAITING_SIGNUP` vs `AWAITING_ACCEPTANCE`).
  - Inserts Receipt.
- **`POST /api/receipts/claim`**:
  - Verifies ownership (ID match or Email match).
  - **Auto-Connect**: If no connection exists, creates one instantly.
  - Updates status to `ACCEPTED`.

---

## 4. Detailed Page Implementations

### 4.1 Home Dashboard (`HomePage.tsx`)

**Route**: `/`
**Primary Component**: `GraphCanvas.tsx`

- **Data Source**: `useStore().connections` (Nodes), `useStore().receipts` (Edges/Metadata).
- **Visualization Logic**:
  - Uses `react-force-graph-2d` (or custom canvas implementation).
  - **Nodes**: Central 'Me' node + all `connections` where `accepted=true`.
  - **Node Size**: Calculated based on interaction volume (count of receipts).
  - **Physics**: Nodes repel each other; links act as springs.
- **State**: Local `filter` state ('ALL', 'GAVE', 'RECEIVED') filters the visible nodes.

### 4.2 Create Receipt Flow (`CreateReceiptPage.tsx`)

**Route**: `/receipts/create`

- **Form State**: `currentStep`, `formData` (email, description, tags, is_public).
- **Interaction**:
  1.  User enters email -> Debounced lookup (optional UI hint).
  2.  User submits -> call `store.createReceipt()`.
  3.  `createReceipt` calls `POST /api/receipts/create`.
  4.  **Optimistic Update**: Not needed; detailed response includes the new receipt, store re-fetches.

### 4.3 Receipt Detail & Verification (`ReceiptDetailPage.tsx`)

**Route**: `/receipts/:id`

- **Data Fetching**:
  - `useParams()` gets ID.
  - `supabase.from('receipts').select('*, from:..., to:...')` fetches specific receipt details.
- **Dynamic UI**:
  - **Status Indicators**: Color-coded banners (Green/Red/Amber) based on `row.status`.
  - **Action Panel**:
    - If `currentUser.id === row.to_user_id` AND `status !== ACCEPTED`: Show **Claim/Reject** buttons.
  - **Print Mode**: CSS `@media print` hides sidebar/nav, isolates `#printable-proof-card`.
- **Actions**:
  - **Claim**: Calls `store.claimReceipt(id)` -> `POST /api/receipts/claim`.
  - **Reject**: Calls `store.rejectReceipt(id)` -> `POST /api/receipts/reject`.

### 4.4 User Profile (`UserProfilePage.tsx`)

**Route**: `/u/:userId` (or `/profile`)

- **Data Fetching**:
  1.  **Profile**: `supabase.from('public_profiles').eq('user_id', userId)` -> Name, Institution, Joined Date.
  2.  **Receipts**: `supabase.from('receipts').eq('to_user_id', userId).eq('status', 'ACCEPTED')` -> The "Portfolio".
  3.  **Last Interaction**: If `currentUser !== userId`, fetch latest receipt between the two for context.
- **Views**:
  - **Portfolio Mode**: Grid of receipt cards.
  - **CV Mode**: Chronological text list.
- **AI Feature**: Client-side loop calls `generateCARStatement(description)` for each receipt to "polish" the text locally.

### 4.5 Connections Manager (`ConnectionsPage.tsx`)

**Route**: `/connections`

- **Logic**:
  - `useStore().connections` contains mix of accepted (`accepted=true`) and pending (`accepted=false`) records.
  - **Tabs**:
    - _My Network_: Filter `c.accepted === true`.
    - _Requests_: Filter `c.accepted === false` AND `c.requested_by !== currentUser.id`.
- **Actions**:
  - **Accept**: `store.acceptConnection(id)` -> `POST /api/connections/accept`.
  - **Remove/Reject**: `store.removeConnection(id)` -> `POST /api/connections/remove`.

---

## 5. Frontend State Architecture (`store.tsx`)

The React Context acts as the "Client-Side Database Replica".

### 5.1 `fetchData()` Strategy

Instead of fetching per-page, the store loads the user's **entire relevant world** on mount:

1.  **User**: `auth.getUser()`.
2.  **Profile**: `public_profiles` (Me).
3.  **Graph**: `receipts` (Where I am sender OR receiver) + `connections` (Where I am involved).
4.  **Derived Cache**: `users` array is populated by extracting all unique user IDs from the receipts/connections and doing a bulk `in` query to `public_profiles`.

### 5.2 Optimistic Updates

For actions like "Accept Connection", the store immediately updates the local array:

```typescript
setConnections((prev) =>
  prev.map((c) => (c.id === id ? { ...c, accepted: true } : c))
);
```

This ensures the UI feels instant, even while the API request processes in the background. If the API fails, the state is reverted.

---

## 6. Security & Permissions

- **RLS** is the primary defense. Even if the Frontend code is modified, users cannot query receipts they are not part of.
- **API Security**: The `getUser` middleware ensures `g.user` is trustworthy (signed by Supabase JWT secret). The backend logic relies on `g.user.id` for all write operations, never trusting a user ID sent in the request body for ownership assertions.
