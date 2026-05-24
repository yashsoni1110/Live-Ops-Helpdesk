const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STATE
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Map<string, {agentId: string, agentName: string, avatarColor: string, socketId: string, connectedAt: string}>} */
const agents = new Map(); // socketId → agent info

/** @type {Map<string, {agentId: string, agentName: string, avatarColor: string, lockedAt: string}>} */
const locks = new Map(); // ticketId → lock info

/** @type {Map<string, object>} */
const tickets = new Map(); // ticketId → ticket object

// Monotonically incrementing counter for ticket numbers — avoids collisions on
// insert/delete because it never relies on the current Map size.
let ticketCounter = 10421;

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA — Realistic Freight Support Tickets
// ─────────────────────────────────────────────────────────────────────────────

const SEED_TICKETS = [
  {
    id: uuidv4(),
    ticketNumber: "LH-10421",
    subject: "Truck #4421 broken down on I-35 — Driver stranded",
    customer: "Steel Manufacturing",
    customerEmail: "ops@steelmanufacturing-co.com",
    priority: "critical",
    status: "open",
    category: "Vehicle Breakdown",
    description:
      "Driver reports truck #4421 engine failure at mile marker 281 on I-35 northbound near Waco, TX. Cargo is time-sensitive pharmaceutical equipment. Roadside assistance dispatched but ETA unknown. Customer requires immediate callback.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    tags: ["breakdown", "urgent", "pharmaceutical"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10418",
    subject: "Customer double-billed for Shipment #TXN-8821",
    customer: "Food Distribution Corp",
    customerEmail: "billing@fooddistcorp.com",
    priority: "high",
    status: "open",
    category: "Billing Issue",
    description:
      "Customer reports two identical charges of $4,280.00 on 05/20 and 05/21 for the same shipment TXN-8821. Requesting immediate refund of duplicate charge. Finance team needs to investigate payment gateway duplication.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    tags: ["billing", "refund", "duplicate"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10415",
    subject: "Missed delivery window — Chicago warehouse refuses goods",
    customer: "Distribution Logistics",
    customerEmail: "receiving@distlogistics.com",
    priority: "high",
    status: "in_progress",
    category: "Delivery Failure",
    description:
      "Truck arrived at warehouse at 09:47 AM. Contracted delivery window was 06:00-08:00 AM. Warehouse dock closed at 09:00 AM. Driver turned away. 14 pallets of retail goods now sitting in truck. Customer threatening contract termination.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 90 * 60000).toISOString(),
    tags: ["missed-delivery", "sla-breach"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10412",
    subject: "Temperature excursion alert — Refrigerated unit #229",
    customer: "ColdChain Pharma",
    customerEmail: "quality@coldchainpharma-qa.com",
    priority: "critical",
    status: "open",
    category: "Temperature Compliance",
    description:
      "IoT sensor alert triggered at 02:14 AM. Reefer unit #229 internal temperature rose from -18°C to -6°C over 40-minute window. Shipment contains 800 units of insulin. Regulatory compliance at risk. Quality team must assess and document excursion report within 4 hours.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    tags: ["cold-chain", "compliance", "pharma", "urgent"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10409",
    subject: "Lost pallet — Shipment TXN-7744 short by 3 units",
    customer: "Auto Parts Supplier",
    customerEmail: "logistics@autopartssupplier.com",
    priority: "normal",
    status: "open",
    category: "Lost/Damaged Goods",
    description:
      "Customer received 12 of 15 pallets for order. Three pallets containing gearbox assemblies unaccounted for. Last scan at Hub on 05/19 at 14:32. Warehouse team needs to conduct physical audit.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    tags: ["lost-goods", "audit"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10407",
    subject: "Driver hours violation — Route compliance flag",
    customer: "Internal — Compliance Dept.",
    customerEmail: "compliance@opscenter-desk.com",
    priority: "high",
    status: "open",
    category: "Compliance",
    description:
      "ELD (Electronic Logging Device) flagged driver Michael Torres for 11.5 hours of drive time on 05/22, exceeding FMCSA 11-hour limit by 0.5 hours. DOT audit risk. Compliance officer must review logbook and issue corrective action within 24 hours.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    tags: ["compliance", "dot", "eld"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10403",
    subject: "Customs clearance delay — International shipment SHP-INT-0042",
    customer: "Global Import-Export Corp",
    customerEmail: "trade@globalimportcorp.com",
    priority: "high",
    status: "in_progress",
    category: "Customs & Border",
    description:
      "Shipment from Monterrey, MX held at Laredo port of entry since 05/21. CBP requires additional documentation — HS code correction needed on commercial invoice. Customs broker engaged but customer demands daily status updates.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 28 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    tags: ["customs", "international", "cbp"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10399",
    subject: "Freight damage claim — Electronics shipment crushed",
    customer: "Electronics Mfg Co",
    customerEmail: "claims@electronicsmfgco.com",
    priority: "normal",
    status: "open",
    category: "Damage Claim",
    description:
      "Customer filed claim for $28,400 in damaged LCD panels. Bill of Lading notes driver signed as 'shipper load and count.' Photos show forklift puncture damage to outer cartons. Insurance adjuster review pending.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    tags: ["damage-claim", "insurance"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10394",
    subject: "Wrong delivery address — Reroute needed ASAP",
    customer: "Construction Infrastructure",
    customerEmail: "site@constinfra.com",
    priority: "normal",
    status: "resolved",
    category: "Routing Error",
    description:
      "Lumber order delivered to office instead of job site 12 miles away. Customer does not have a forklift at office. Driver needs to return and reroute same day. Issue traced to address entry error in dispatch system.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    tags: ["reroute", "address-error"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10389",
    subject: "Port congestion — 6 containers delayed at Houston",
    customer: "Harbor Trade Logistics",
    customerEmail: "ops@harbortradelogistics.com",
    priority: "normal",
    status: "open",
    category: "Port Operations",
    description:
      "6 ocean containers in queue for chassis assignment. Current estimated dwell time: 4-6 days due to port congestion. Demurrage fees beginning to accrue at $250/container/day. Customer requesting container terminal receipt and demurrage mitigation plan.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    tags: ["port", "demurrage", "ocean-freight"],
  },
];

// Seed tickets into Map and advance the counter past every seeded number
SEED_TICKETS.forEach((t) => {
  tickets.set(t.id, t);
  const num = parseInt(t.ticketNumber.replace("LH-", ""), 10);
  if (!isNaN(num) && num >= ticketCounter) ticketCounter = num + 1;
});

// ─────────────────────────────────────────────────────────────────────────────
// REST API — Health Check
// ─────────────────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", tickets: tickets.size, agents: agents.size });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getTicketsArray() {
  return Array.from(tickets.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function getLocksObject() {
  const obj = {};
  locks.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

function getAgentsArray() {
  return Array.from(agents.values());
}

function broadcastState(io) {
  io.emit("state_sync", {
    locks: getLocksObject(),
    agents: getAgentsArray(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET.IO — EVENT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[CONNECT] Socket: ${socket.id}`);

  // ── JOIN ──────────────────────────────────────────────────────────────────
  socket.on("join", ({ agentId, agentName, avatarColor }) => {
    console.log(`[JOIN] ${agentName} (${agentId}) — socket ${socket.id}`);

    agents.set(socket.id, {
      agentId,
      agentName,
      avatarColor: avatarColor || "#6366f1",
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
    });

    // Send this client the full current state
    socket.emit("initial_state", {
      tickets: getTicketsArray(),
      locks: getLocksObject(),
      agents: getAgentsArray(),
    });

    // Broadcast updated agent list to everyone else
    socket.broadcast.emit("agent_joined", {
      agent: agents.get(socket.id),
      agents: getAgentsArray(),
    });
  });

  // ── LOCK TICKET ──────────────────────────────────────────────────────────
  socket.on("lock_ticket", ({ ticketId }) => {
    const agent = agents.get(socket.id);
    if (!agent) return;

    // Check if already locked by someone else
    const existingLock = locks.get(ticketId);
    if (existingLock && existingLock.agentId !== agent.agentId) {
      // Lock acquisition failed
      socket.emit("lock_denied", {
        ticketId,
        lockedBy: existingLock,
      });
      return;
    }

    // Acquire lock
    const lockInfo = {
      agentId: agent.agentId,
      agentName: agent.agentName,
      avatarColor: agent.avatarColor,
      lockedAt: new Date().toISOString(),
    };
    locks.set(ticketId, lockInfo);

    console.log(`[LOCK] Ticket ${ticketId} locked by ${agent.agentName}`);

    // Broadcast to ALL clients (including sender for confirmation)
    io.emit("ticket_locked", { ticketId, lock: lockInfo });
  });

  // ── UNLOCK TICKET ────────────────────────────────────────────────────────
  socket.on("unlock_ticket", ({ ticketId }) => {
    const agent = agents.get(socket.id);
    if (!agent) return;

    const existingLock = locks.get(ticketId);
    if (!existingLock) return;

    // Only the lock owner can release it
    if (existingLock.agentId !== agent.agentId) {
      console.log(
        `[UNLOCK DENIED] ${agent.agentName} tried to unlock ticket ${ticketId} held by ${existingLock.agentName}`
      );
      return;
    }

    locks.delete(ticketId);
    console.log(`[UNLOCK] Ticket ${ticketId} released by ${agent.agentName}`);

    io.emit("ticket_unlocked", { ticketId });
  });

  // ── CREATE TICKET ────────────────────────────────────────────────────────
  socket.on("create_ticket", ({ subject, priority, customer, customerEmail, category, description }) => {
    const agent = agents.get(socket.id);
    if (!agent) return;

    const newTicket = {
      id: uuidv4(),
      ticketNumber: `LH-${ticketCounter++}`,
      subject,
      customer: customer || "Unknown Customer",
      customerEmail: customerEmail || "",
      priority: priority || "normal",
      status: "open",
      category: category || "General",
      description: description || "",
      assignedTo: agent.agentName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    };

    tickets.set(newTicket.id, newTicket);
    console.log(`[CREATE] Ticket ${newTicket.ticketNumber} created by ${agent.agentName}`);

    // Broadcast to all clients
    io.emit("ticket_created", { ticket: newTicket });
  });

  // ── UPDATE TICKET ────────────────────────────────────────────────────────
  socket.on("update_ticket", ({ ticketId, updates }, ack) => {
    const agent = agents.get(socket.id);
    if (!agent) return;

    const ticket = tickets.get(ticketId);
    if (!ticket) return;

    // Must hold the lock to update
    const lock = locks.get(ticketId);
    if (!lock || lock.agentId !== agent.agentId) {
      socket.emit("update_denied", { ticketId, reason: "You do not hold the lock for this ticket." });
      return;
    }

    const updatedTicket = {
      ...ticket,
      ...updates,
      updatedAt: new Date().toISOString(),
      assignedTo: agent.agentName,
    };

    tickets.set(ticketId, updatedTicket);
    console.log(`[UPDATE] Ticket ${ticket.ticketNumber} updated by ${agent.agentName}`);

    io.emit("ticket_updated", { ticket: updatedTicket });

    // Acknowledge back to the calling client so it can safely release its lock
    if (typeof ack === "function") ack({ ok: true });
  });

  // ── DISCONNECT ───────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    const agent = agents.get(socket.id);

    if (agent) {
      console.log(`[DISCONNECT] ${agent.agentName} — Reason: ${reason}`);

      // Release all locks held by this agent
      const releasedTickets = [];
      locks.forEach((lock, ticketId) => {
        if (lock.agentId === agent.agentId) {
          locks.delete(ticketId);
          releasedTickets.push(ticketId);
          console.log(`[AUTO-UNLOCK] Ticket ${ticketId} released due to disconnect`);
        }
      });

      agents.delete(socket.id);

      // Broadcast unlocks
      releasedTickets.forEach((ticketId) => {
        io.emit("ticket_unlocked", { ticketId, reason: "agent_disconnected" });
      });

      // Broadcast updated agent list
      io.emit("agent_left", {
        agentId: agent.agentId,
        agentName: agent.agentName,
        agents: getAgentsArray(),
        releasedLocks: releasedTickets,
      });
    } else {
      console.log(`[DISCONNECT] Unknown socket ${socket.id}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Live Ops Helpdesk Server running on port ${PORT}`);
  console.log(`📦 ${tickets.size} tickets seeded`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health\n`);
});
