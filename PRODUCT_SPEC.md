# Pledge: The Infrastructure of Trust

Pledge is a professional networking platform that moves beyond social endorsements to **verifiable proof**. It allows users to create, claim, and showcase "Pledges" (receipts) of professional interactions, collaborations, and help, backed by a decentralized trust graph and AI-driven career insights.

## 1. Product Vision
Traditional resumes are self-reported and LinkedIn endorsements are often low-signal. Pledge creates a high-fidelity alternative: a **Verified Digital Reputation** where every skill is backed by a specific, peer-verified receipt.

## 2. Core Features

### A. The Proof Engine
- **Receipt Creation**: Users can generate "Impact Receipts" for peers by specifying the nature of help, skills used (tags), and a brief description.
- **Email-First Discovery**: Proofs can be sent to non-users via email. Recipients can then "Claim" their reputation by onboarding.
- **Verification Flow**: Real-time notification and acceptance flow ensures all "Proofs" on a user's profile are mutual and verified.

### B. Trust Portfolio (Public Profile)
- **Wall of Proof**: A visual feed prioritizing **Received Proofs**. It showcases "what the world says about you" rather than what you say about yourself.
- **Skills Bento-Box**: Automatically aggregates the most frequent tags into a skill-strength dashboard.
- **Dual-Mode View**: 
    - *Portfolio Mode*: Visual, card-based interaction wall.
    - *CV Mode*: Professional, list-based layout optimized for career applications.

### C. AI CV Engine (Gemini-Powered)
- **CAR Framework**: Uses Gemini 1.5 Flash to heuristically transform raw receipt descriptions into high-impact **Challenge, Action, and Result** (CAR) bullet points.
- **Resume-Ready**: One-click generation of professional highlights that can be copied directly into traditional resumes.

### D. The Trust Graph
- **Network Visualization**: A D3.js powered interactive graph showing the "strength" of professional ties.
- **Dynamic Link Coloring**: Real-time visual feedback on connection status:
    - **Yellow**: Indicates pending receipts requiring action.
    - **Green**: Represents a fully verified professional bond.
- **Filtering**: Dynamic toggles for "Gave Help" vs "Received Help" to visualize bidirectional impact.
- **Connection Logic**: Secure "low_id/high_id" relationship schema prevents duplicate connections.

### E. Professional Theming
- **Adaptive Interface**: Native support for **Dark Mode** and **Light Mode**, respecting system preferences.
- **Glassmorphism Design**: Specialized "Surface" tokens for premium, high-transparency UI components.

### F. Data Sovereignty
- **CSV Export**: Users "own" their reputation and can download their entire verified ledger in one click.

## 3. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript |
| **Theming** | CSS Variables + Tailwind CSS (Adaptive Design System) |
| **State** | Zustand (Global Store) + React Context (Auth/Theming) |
| **Visuals** | D3.js (Interactive Graph Canvas) |
| **Icons** | Lucide React |
| **AI** | Google Gemini 1.5 Flash SDK |
| **Backend** | Supabase (Auth, Postgres, Real-time) |
| **Animation** | CSS keyframe transitions & Tailwind utilities |

## 4. Key Architectural Decisions

1. **Theme-Aware Tokens**: Use of semantic CSS variables (`--background`, `--surface`, `--accent`) instead of hardcoded hex values to support instant theme switching.
2. **Silent Background Fetching**: To avoid "Loading..." flickering, data is refreshed in the background using hidden state updates, ensuring the UI remains snappy.
3. **Component Memoization**: Heavy components like the `GraphCanvas` are memoized (`React.memo`) to prevent re-renders during side-panel transitions.
4. **Email-as-Identity**: Use of emails for the initial "Proof" flow allows the platform to grow virally before users even sign up.
5. **Ownership-Aware UI**: Floating action bars and admin tools only appear for physical owners of the profile/receipt.

## 5. Future Roadmap
- **Institutional Authentication**: Verification through university/email domains.
- **Trust Circles**: Group-based trust verification (e.g., "Verified Founder Network").
- **API Integration**: Connectors for Github, Luma, and LinkedIn.
| **End of Specification** |
