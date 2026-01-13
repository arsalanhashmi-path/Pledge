# Technical Specification

## 1. System Overview

**Pledge** is a trust-based professional network that enables users to create cryptographic "proofs" (receipts) of their impact and helpfulness. The system creates a real-time trust graph based on these verified interactions.

### Architecture

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS (Shadcn/UI theme).
- **Backend Service**: Python (Flask) API for complex business logic, referrals, and state transitions.
- **Database**: Supabase (PostgreSQL) + Auth.
- **State Management**: React Context + optimistic local updates.

---

## 2. Database Schema (PostgreSQL)

### 2.1 Enum: `receipt_status`

- `AWAITING_SIGNUP`: Recipient has not signed up yet.
- `AWAITING_CONNECTION`: Recipient is signed up but not connected to sender.
- `AWAITING_ACCEPTANCE`: Recipient is connected but hasn't verified the receipt.
- `ACCEPTED`: Recipient has verified the receipt.
- `REJECTED`: Recipient has rejected the receipt.

### 2.2 Table: `public_profiles`

Publicly viewable user information.
| Column | Type | Description |
|---|---|---|
| `user_id` | UUID (PK) | References `auth.users(id)` |
| `email` | TEXT | User email |
| `first_name` | TEXT | First name |
| `last_name` | TEXT | Last name |
| `institution` | TEXT | Organization/School |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### 2.3 Table: `connections`

Represents an undirected edge between two users. Enforced uniqueness via `low_id < high_id`.
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Connection ID |
| `low_id` | UUID | User ID (lexicographically smaller) |
| `high_id` | UUID | User ID (lexicographically larger) |
| `requested_by` | UUID | ID of user who initiated the request |
| `accepted` | BOOLEAN | `true` if fully connected, `false` if pending |
| `requested_at` | TIMESTAMPTZ | Time of request |
| `accepted_at` | TIMESTAMPTZ | Time of acceptance |
**Constraints**: Unique (`low_id`, `high_id`), Check (`low_id < high_id`).

### 2.4 Table: `receipts`

The core atomic unit of "Proof".
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Receipt ID |
| `from_user_id` | UUID | Sender (Creator) ID |
| `to_user_id` | UUID (Nullable) | Recipient ID (null if not on platform) |
| `recipient_email` | TEXT | Email text for late-binding |
| `connection_id` | UUID (FK) | Link to `connections` table |
| `tags` | TEXT[] | Array of tags (e.g. #mentorship) |
| `description` | TEXT | Description of impact |
| `is_public` | BOOLEAN | Visibility flag |
| `status` | receipt_status | Current state |
| `created_at` | TIMESTAMPTZ | Creation time |
| `accepted_at` | TIMESTAMPTZ | Verification time |

---

## 3. Backend API Services (`app.py`)

### 3.1 Authentication

**Middleware**: `@authenticate_user`

- Verifies Supabase JWT token from `Authorization` header.
- Sets `g.user` context for the request.

### 3.2 User Onboarding

**Endpoint**: `POST /api/onboarding`
**Function**: `onboarding()`

1. **Profile Creation**: Upserts `public_profiles` with name/institution.
2. **Referral Handling**:
   - If `referrer_id` is present, automatically creates an `accepted=True` connection between the new user and referrer.
3. **Receipt Recovery (Orphaned Receipts)**:
   - Scans `receipts` table for records where `recipient_email` matches new user's email AND `to_user_id` is null.
   - For each sender of such receipts:
     - Checks/Creates a Connection between New User and Sender.
     - Updates all matching receipts: sets `to_user_id = new_user.id`, `connection_id`, and status `AWAITING_ACCEPTANCE`.

### 3.3 Connection Management

**Endpoint**: `POST /api/connections/request`
**Function**: `request_connection()`

1. Looks up target user by email.
2. Checks for existing connection (rejects if exists).
3. Inserts new `connections` row with `accepted=False`.

**Endpoint**: `POST /api/connections/accept`
**Function**: `accept_connection()`

1. Updates `connections` table: set `accepted=True`, `accepted_at=NOW()`.

**Endpoint**: `POST /api/connections/remove`
**Function**: `remove_connection()`

1. Deletes row from `connections`.

### 3.4 Receipt Lifecycle

**Endpoint**: `POST /api/receipts/create`
**Function**: `create_receipt()`

1. **Recipient Lookup**: Checks `public_profiles` for email.
2. **Status Determination**:
   - No User Found -> `AWAITING_SIGNUP`
   - User Found, No Connection -> `AWAITING_CONNECTION`
   - User Found, Connected -> `AWAITING_ACCEPTANCE`
3. **Persist**: Inserts into `receipts`.

**Endpoint**: `POST /api/receipts/claim`
**Function**: `claim_receipt()`

1. **Authorization**: Checks if `to_user_id == currentUser` OR `recipient_email == currentUser.email` (Late Binding).
2. **Late Linking**:
   - If connection is missing (e.g. email match case), automatically creates/upserts `connections` (accepted=True).
   - Updates `receipts` to link `to_user_id` and `connection_id`.
3. **Verification**: Sets status `ACCEPTED`.

**Endpoint**: `POST /api/receipts/reject`
**Function**: `reject_receipt()`

1. Validates `to_user_id` matches requestor.
2. Sets status `REJECTED`.

---

## 4. Frontend Architecture

### 4.1 State Management (`store.tsx`)

**Context**: `StoreContext`
**Data Sources**:

- **Supabase Direct**: `public_profiles`, `receipts` (Read-only lists, real-time subscriptions).
- **Backend API**: Mutations (Create, Accept, Reject).
  **Functions**:
- `fetchData()`: Aggregates profile, receipt, and connection data. Derives `allUsers` cache.
- `createReceipt(...)`: Calls API -> Optimistic Update.
- `claimReceipt(...)`: Calls API -> Refetches.
- `addConnection(...)`: Calls API -> Refetches.

### 4.2 Graph Visualization (`HomePage.tsx`)

**Logic**:

1. **Node generation**:
   - 'Me' Node (Center)
   - Nodes for every accepted connection.
2. **Edge generation**:
   - Links based on `connections` table.
3. **Metadata Aggregation**:
   - Calculates `sentCount` / `receivedCount` by filtering the `receipts` array for each connection pair.
   - Filters nodes based on `GAVE` vs `RECEIVED` filter state.

### 4.3 Key Components

- **`Layout`**: Global wrapper, manages navigation and responsiveness.
- **`ReceiptDetailPage`**: Displays proof status. Uses conditional styling for states (Green=Accepted, Red=Rejected).
- **`ConnectionsPage`**: Tabs for 'My Network' vs 'Requests'.

---

## 5. Security Model (RLS)

Row Level Security is enabled in PostgreSQL (`schema.sql`).

- **Profiles**: Public read, Owner write.
- **Connections**: Read/Write only if `auth.uid()` is `low_id` or `high_id`.
- **Receipts**:
  - Read: Sender, Recipient, or Email Match (if unassigned).
  - Write: Sender only.
  - Update: Involved parties.
