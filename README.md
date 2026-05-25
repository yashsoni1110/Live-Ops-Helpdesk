# OpsCenter — Live Ops Helpdesk

A real-time, highly collaborative support ticket dashboard built to solve concurrent editing race conditions in high-volume operations environments. 

This repository houses a full-stack, push-based application featuring a **Pessimistic Real-Time Lock Protocol** that completely eliminates data overwrites between support agents.

---

## 🚨 The Business Problem (The Race Condition)

In legacy helpdesk applications, support ticket resolution suffers from a critical concurrency flaw:
- **Agent A** opens Ticket #105 and starts typing a detailed customer resolution.
- Simultaneously, **Agent B** opens the same Ticket #105, enters a different resolution, and clicks **Save**.
- Thirty seconds later, **Agent A** finishes writing and clicks **Save**.
- **Result**: Agent A's update silently and permanently overwrites Agent B's work, leading to administrative overhead, duplicate dispatch actions, and billing errors.

---

## 🛠️ The Architectural Solution

To achieve sub-millisecond concurrency protection, **OpsCenter** utilizes a state-of-the-art WebSockets pipeline built with `Socket.io`:

1. **Zero Poll Architecture**: The client avoids periodic database queries or `setInterval` triggers, preserving bandwidth and backend resources. All system modifications are pushed instantly from the server.
2. **Pessimistic Locking**: The second an agent opens a ticket to edit it, the backend locks the ticket inside an in-memory session map. Within milliseconds, this update propagates to every connected screen globally.
3. **Reactive Interlocking UI**: 
   - Non-lock holders see the locked row turn **gray** with a lock emblem (`🔒 Locked by [Agent]`).
   - The **Edit** action is dynamically disabled across all target terminals.
   - Releasing the ticket (by clicking **Save** or **Close**) automatically unlocks the row and restores edit capability for the rest of the floor.
4. **Graceful Network Degradation**: The client listens directly to Socket.io connection state shifts. If a user loses network access, a red warning banner appears instantly (`🔴 Connection Lost: Reconnecting...`) to protect current inputs.
5. **Session Persistence**: Agent identities are securely stored inside `localStorage` and rehydrated upon reload. Refreshes immediately rejoin the active socket channel without throwing the agent back to the sign-in screen.

---

## 📡 WebSockets Event Specification

Below is the complete messaging protocol defined between the client-side store and the Socket.io backend:

### Outbound Events (Client $\rightarrow$ Server)
| Event | Payload | Description |
| :--- | :--- | :--- |
| `join` | `{ agentId, agentName, avatarColor }` | Registers the agent session inside the memory table. |
| `lock_ticket` | `{ ticketId }` | Requests an exclusive edit lock on a specific support ticket. |
| `unlock_ticket` | `{ ticketId }` | Releases the held lock, returning the ticket to the open pool. |
| `create_ticket` | `{ subject, priority, customer, customerEmail, category, description }` | Inserts a new ticket, increments the sequence, and triggers a board-wide broadcast. |
| `update_ticket` | `{ ticketId, updates: { ... } }` | Updates ticket details. Requires lock ownership to proceed. |

### Inbound Events (Server $\rightarrow$ Client)
| Event | Payload | Description |
| :--- | :--- | :--- |
| `initial_state` | `{ tickets: [], locks: {}, agents: [] }` | Sent on registration to synchronize the client board with active memory states. |
| `ticket_created` | `{ ticket }` | Broadcasts a new ticket. Triggers a slide-in animation on all online screens. |
| `ticket_updated` | `{ ticket }` | Broadcasts edited ticket details to synchronize layout views. |
| `ticket_locked` | `{ ticketId, lock: { ... } }` | Broadcasts that a ticket has been locked by a specific agent. |
| `ticket_unlocked` | `{ ticketId }` | Broadcasts that a ticket is now free for edit access. |
| `agent_joined` | `{ agent, agents: [] }` | Broadcasts that a new agent has entered the room. |
| `agent_left` | `{ agentId, agentName, agents: [] }` | Broadcasts that an agent has logged out or disconnected. |
| `lock_denied` | `{ ticketId, lockedBy: { ... } }` | Emitted only to a requesting client if the target lock is already claimed. |

---

## 🎨 Premium Glassmorphic Styling

The application's theme is defined completely in plain, highly optimized CSS variables. It does not use bulky Tailwind packages, resulting in ultra-fast load times:
- **Design Tokens**: Centralized custom properties (e.g., `--bg-base: #0f172a`, `--bg-card: #1e293b`, `--border-strong: rgba(255, 255, 255, 0.08)`) drive the dark-mode theme.
- **Glassmorphism**: Backdrop filters (`backdrop-filter: blur(8px)`) and subtle neon-glow borders give the sidebar draws, create modals, and toasts a state-of-the-art SaaS product feel.
- **Micro-Animations**: Custom cubic-bezier animations (`cubic-bezier(0.34, 1.56, 0.64, 1)`) power smooth login fades, drawer pop-outs, and slide-in toast notifications.

---

## 📂 Repository Layout

```text
├── client/
│   ├── app/
│   │   ├── globals.css         # Modern glassmorphic dark-mode CSS tokens
│   │   ├── layout.jsx          # Next.js global frame layout
│   │   └── page.jsx            # Routing manager
│   ├── components/
│   │   ├── AgentLoginModal.jsx # Quick agent logins & custom color presets
│   │   ├── AgentPresence.jsx   # Live online agent avatar list
│   │   ├── ConnectionBanner.jsx# Status banner for network losses
│   │   ├── CreateTicketModal.jsx # Slide-out creation modal
│   │   ├── TicketBoard.jsx     # Main stats & search/filter bar
│   │   ├── TicketDetailPanel.jsx # Side-drawer editor (lock-protected)
│   │   ├── TicketRow.jsx       # Individual ticket row item
│   │   └── Toast.jsx           # Self-dismissing toast notifications
│   ├── lib/
│   │   ├── socket.js           # Client-side socket connection manager
│   │   ├── store.js            # Unified dispatch reducer store
│   │   └── useSocketEvents.js  # WebSocket event hub hook
│   └── package.json
└── server/
    ├── index.js                # Express + Socket.io backend
    └── package.json
```

---

## 🚀 Installation & Setup

Ensure you have **Node.js** (v18+) installed.

### 1. Fire Up the Server
```bash
cd server
npm install
npm run dev
```
The server will run on `http://localhost:3001`.

### 2. Launch the Client
```bash
cd client
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## 🧪 Quick Concurrency Test Plan

To verify pessimistic lock syncs locally:

1. **Initialize Multiple Agents**:
   - Open a standard tab at `http://localhost:3000` (Sign in as **Agent A**).
   - Open an incognito window at `http://localhost:3000` (Sign in as **Agent B**).
2. **Observe Real-Time Sign-ins**:
   - Verify that both agent initials appear instantly in the top-right header presence indicators on both screens.
3. **Verify Lock Actions**:
   - In Window 1 (Agent A), click **Edit** on a ticket.
   - Verify that in Window 2 (Agent B), the row instantly turns gray, displays a padlock symbol (`🔒 Locked by Agent A`), and disables the Edit action button.
4. **Test Collaborative Editing**:
   - In Window 1, update the ticket subject and description.
   - Click **Save**.
   - Verify that Window 2 instantly shows the updated subject on the ticket list, and that the edit lock is freed automatically.
5. **Verify Graceful Failure**:
   - Stop the backend server terminal command (`Ctrl + C`).
   - Confirm that both screens instantly overlay the red connection failure alert.
