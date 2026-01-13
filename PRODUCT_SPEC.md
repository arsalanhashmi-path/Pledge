# Product Specification

## 1. Product Vision

**Pledge** is a professional network built on **verified impact** rather than self-proclaimed skills. Instead of just listing "Mentorship" on a resume, users generate cryptographic "Receipts" of the help they've given or received. These receipts build a real-time **Trust Graph**, visualizing the genuine social capital and orbit of influence around each user.

### Core Value Proposition

- **Show, Don't Tell**: Prove your soft skills and contributions through verified peer attestations.
- **Visualized Influence**: See your professional network as a living, breathing orbit of trust.
- **High-Fidelity Networking**: Connections are meaningful, based on actual interactions rather than random clicks.

---

## 2. Key Concepts & Terminology

### 2.1 The Receipt (Proof)

The atomic unit of value in Pledge. A Receipt is a record of a specific interaction where value was exchanged.

- **Sender**: The person who _gave_ help (and usually creates the receipt).
- **Recipient**: The person who _received_ help (and must verify the receipt).
- **Description**: A brief narrative of what happened (e.g., "Provided code review for Project X").
- **Tags**: Categorization (e.g., #mentorship, #referral, #debugging).

### 2.2 The Trust Graph (Orbit)

The visualization of a user's network.

- **Nodes**: Users in the network.
  - **"You" (Center)**: The current user.
  - **Planets**: People you have connected with. Size indicates "Strength" (frequency of interaction).
- **Edges (Links)**: Represent the connection and flow of value.
  - **Gave (Outbound)**: Help you provided to others.
  - **Received (Inbound)**: Help you received from others.

### 2.3 Connection Status

- **Pending**: One-way request sent.
- **Connected**: Two-way handshake complete. Required before receipts can be fully verified.

---

## 3. User Personas

### 3.1 The Helper (Sender)

- **Goal**: Wants to document their impact and quantify their leadership/mentorship skills.
- **Action**: Creates receipts for people they help.
- **Motivation**: Building a reputation as a generous and capable leader.

### 3.2 The Beneficiary (Recipient)

- **Goal**: Wants to acknowledge help received and build credit for being humble/collaborative.
- **Action**: Accepts (verifies) receipts sent to them.
- **Motivation**: Strengthening relationships and validating their own network usage.

---

## 4. detailed Feature Requirements

### 4.1 Onboarding & Identity

- **Sign-Up Flow**:
  - Users sign up with Email and Password.
  - **Profile**: Must provide First Name, Last Name, and Institution/Organization.
  - **Referral System**: Users can sign up via a unique referral link (`?ref=USER_ID`).
    - _Auto-Connection_: Signing up via a referral link automatically connects the new user to the referrer.
- **Late Binding (The "Magic Link" Effect)**:
  - If someone sent a receipt to `alice@example.com` _before_ Alice signed up, Pledge remembers.
  - When Alice finally signs up with that email, those "orphaned" receipts are automatically recovered and linked to her account.

### 4.2 Creating Receipts

- **User Flow**:
  1.  User clicks "Create Proof".
  2.  Enters Recipient Email, Description, and Tags.
  3.  Toggles "Public/Private".
- **System Logic**:
  - System checks if the email matches an existing user.
  - System checks if a connection exists.
  - **Outcomes**:
    - _Recipient Exists & Connected_ -> Status: `AWAITING_ACCEPTANCE`.
    - _Recipient Exists but Not Connected_ -> Status: `AWAITING_CONNECTION`.
    - _Recipient Doesn't Exist_ -> Status: `AWAITING_SIGNUP` (Email sent to invite them).

### 4.3 Verifying & Managing Receipts

- **Receipt Detail View**:
  - Different colors enable quick status recognition:
    - 🟢 **Green**: Verified/Accepted.
    - 🔴 **Red**: Rejected.
    - 🟡 **Yellow/Amber**: Pending (Signup, Connection, or Acceptance).
  - **Export**: Users can print/export a specific receipt as a formal "Proof of Impact".
- **Claiming (Verification)**:
  - Recipients see a "Verify this Receipt" card.
  - **Actions**: "Claim & Verify" or "Reject".
  - _Implicit Connection_: Verifying a receipt automatically establishes a professional connection if one didn't exist (e.g., in Late Binding scenarios).

### 4.4 Network Management (Connections)

- **My Network Tab**:
  - List of all accepted connections.
  - Shows institution and "Member Since" date.
  - Option to Remove Connection.
- **Requests Tab**:
  - Incoming connection attempts.
  - Action: Accept or Reject.
- **Add Connection**:
  - **Direct Add**: Search by email.
  - **Invite**: Generate a pre-filled email or copy a referral link.

### 4.5 The Trust Graph (Home Dashboard)

- **Interactive Canvas**: A physics-based force graph.
- **Filtering**:
  - **All**: Show full orbit.
  - **Gave**: Highlight only people I have helped (Outbound flow).
  - **Received**: Highlight people who helped me (Inbound flow).
- **Stats Dashboard**:
  - Real-time counters for Connections, Accepted Receipts, Pending Actions.

---

## 5. User Interface (UX/UI) Guidelines

- **Theme**: "Premium Zinc". Clean, minimalist, professional.
  - **Light Mode**: Stark white surfaces, zinc accents.
  - **Dark Mode**: Deep blue/black backgrounds (`#020617`), high-contrast text.
- **Typography**: `Inter` font family. Clean, legible, modern.
- **Motion**:
  - Subtle fade-ins for page loads.
  - Smooth transitions for hover states.
  - Physics simulations for the graph nodes (floating/drifting effect).

---

## 6. Future Roadmap (Out of Scope for v1)

- **skills verification**: Aggregating tags to vouch for specific skills (e.g., "5 people verified Alice for #Python").
- **Organization Accounts**: Companies verifying employee impact.
- **Blockchain Integration**: Anchoring receipts on-chain for permanent immutability.
