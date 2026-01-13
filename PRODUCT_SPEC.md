# Product Specification

## 1. Product Vision

**Pledge** is a professional network built on **verified impact**. Instead of endorsement buttons or self-proclaimed skills, Pledge users generate cryptographic "Receipts" of help given and received. These receipts form a verifiable **Trust Graph**, visualizing the genuine orbit of influence around each professional.

## 2. Sitemap & Screen Flows

This section details the major screens and the user journey through them.

### 2.1 Screen: Home Dashboard (The Orbit)

**Purpose**: The central command center. Visualizes the user's network as a living system.

- **Trust Graph Canvas**:
  - **Center**: "Me" node.
  - **Orbiting Planets**: Connections. Size = Strength of relationship.
  - **Edges**: Arrows indicating flow of value (Gave vs. Received). Used to spot givers vs. takers.
- **Stats Panel (HUD)**:
  - **Connections**: Total validated connections.
  - **Karma/Score**: Aggregated score based on verified helps given.
- **Action Filters**:
  - Filter graph by "Gave Help" only or "Received Help" only.

### 2.2 Screen: Create Receipt (The Proof)

**Purpose**: Document a specific instance of value creation.

- **Input Fields**:
  - **Recipient Email**: The identifier for the person helped.
  - **Description**: Narrative of the help (e.g., "Debugged production outage").
  - **Tags**: Skills involved (e.g., #DevOps, #Mentorship).
  - **Visibility**: Public vs. Private toggle.
- **Logic Flow**:
  1.  User submits form.
  2.  **Scenario A (User exists)**: Receipt created, notification sent.
  3.  **Scenario B (User new)**: Receipt created (Late Binding), invite email sent.

### 2.3 Screen: Receipt Details & Verification

**Purpose**: The "Contract" view where value is verified.

- **Header**:
  - **Status Indicator**:
    - 🟢 **ACCEPTED**: Verified by recipient.
    - 🔴 **REJECTED**: Disputed by recipient.
    - 🟡 **PENDING**: Waiting for signup or acceptance.
- **Content**:
  - Description of the help.
  - Time-stamps (Created, Verified).
- **Actions (For Recipient)**:
  - **Verify/Claim**: Signs the receipt, adding it to the graph.
  - **Reject**: Marks as invalid.
- **Actions (For Everyone)**:
  - **Export Proof**: Generates a printable version for portfolios.

### 2.4 Screen: User Profile (The Portfolio)

**Purpose**: A public resume based on verified facts.

- **Header**:
  - Name, Institution, "Joined [Date]".
  - **Context**: "Last Interaction: [Date]" (visible only to visitors).
- **Views**:
  - **Portfolio Mode**: Grid of verified receipts. Visual proof of work.
  - **CV Mode**: Timeline view of contributions, suitable for PDF export.
- **Feature: AI Highlights**:
  - Users can click "Generate Highlights" to have AI summarize their receipt history into bullet points (e.g., "Consistently provided mentorship in Python").

### 2.5 Screen: Connections Manager

**Purpose**: Managing the "Human Ledger".

- **Tabs**:
  - **My Network**: List of established connections (accepted).
  - **Requests**: Incoming invites.
- **Add Connection Modal**:
  - Input email to send invite.
  - Copy "Referral Link" to share broadly.
  - **Referral Logic**: Anyone signing up with the link is auto-connected.

## 3. Core Mechanics

### 3.1 The Receipt Lifecycle

1.  **Draft**: Created by Sender.
2.  **Escrow (Pending)**: Waiting for Recipient action.
3.  **Verified (Active)**: Accepted by Recipient. Becomes a permanent node in the Trust Graph.
4.  **Rejected**: Denied by Recipient. Hidden from public graph.

### 3.2 Late Binding (The "Magic Link")

- Pledge supports interacting with users _before_ they exist.
- Receipts sent to `new@user.com` are stored in a holding state.
- On signup, `new@user.com` inherits all pending receipts and auto-connects to the senders.

## 4. Design System

- **Aesthetic**: "Premium Zinc". High-contrast, clean, futuristic but professional.
- **Typography**: `Inter`.
- **Color Palette**:
  - **Surface**: `#FFFFFF` / `#020617` (Dark).
  - **Accents**: Emerald (Verified), Amber (Pending), Zinc (Neutral).
- **Motion**:
  - Nodes float in orbit.
  - Cards slide up on entry.

## 5. Technical Constraints

- **Auth**: Supabase Auth (Email/Password).
- **Database**: PostgreSQL with Row-Level Security (RLS).
- **Backend**: Python (Flask) for graph logic and referrals.
