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


const agents = new Map();
const locks = new Map();
const tickets = new Map();

let ticketCounter = 10421;

const SEED_TICKETS = [
  {
    id: uuidv4(),
    ticketNumber: "LH-10421",
    subject: "Truck #4421 broken down on I-35 near Waco",
    customer: "Steel Manufacturing",
    customerEmail: "ops@steelmanufacturing-co.com",
    priority: "critical",
    status: "open",
    category: "Vehicle Breakdown",
    description: "Driver reports engine failure at mile marker 281 near Waco, TX. Time-sensitive pharmaceutical cargo. Roadside dispatched.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    tags: ["breakdown", "urgent", "pharmaceutical"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10418",
    subject: "Customer double-billing issue (Shipment #TXN-8821)",
    customer: "Food Distribution Corp",
    customerEmail: "billing@fooddistcorp.com",
    priority: "high",
    status: "open",
    category: "Billing Issue",
    description: "Duplicate charge of $4,280.00 on bank account. Customer requesting immediate refund.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    tags: ["billing", "refund"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10415",
    subject: "Delivery window missed - Chicago warehouse refusing dock access",
    customer: "Distribution Logistics",
    customerEmail: "receiving@distlogistics.com",
    priority: "high",
    status: "in_progress",
    category: "Delivery Failure",
    description: "Driver arrived at 09:47 instead of 06:00-08:00 window. Pallets sitting in truck. Needs urgent resolution.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 90 * 60000).toISOString(),
    tags: ["missed-delivery", "sla-breach"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10412",
    subject: "Reefer unit temperature excursion alert (#229)",
    customer: "ColdChain Pharma",
    customerEmail: "quality@coldchainpharma-qa.com",
    priority: "critical",
    status: "open",
    category: "Temperature Compliance",
    description: "Reefer internal temp rose from -18C to -6C in 40 minutes. 800 units of insulin onboard.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    tags: ["cold-chain", "compliance", "pharma"],
  },
  {
    id: uuidv4(),
    ticketNumber: "LH-10409",
    subject: "Lost parts pallet on TXN-7744",
    customer: "Auto Parts Supplier",
    customerEmail: "logistics@autopartssupplier.com",
    priority: "normal",
    status: "open",
    category: "Lost/Damaged Goods",
    description: "Customer received 12 of 15 pallets. Short 3 gearbox assemblies. Last scanned in Houston.",
    assignedTo: null,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    tags: ["lost-goods", "audit"],
  },
];


SEED_TICKETS.forEach((t) => {
  tickets.set(t.id, t);
  const num = parseInt(t.ticketNumber.replace("LH-", ""), 10);
  if (!isNaN(num) && num >= ticketCounter) {
    ticketCounter = num + 1;
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true, tickets: tickets.size, agents: agents.size });
});


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

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);


  socket.on("join", ({ agentId, agentName, avatarColor }) => {
    agents.set(socket.id, {
      agentId,
      agentName,
      avatarColor: avatarColor || "#6366f1",
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
    });

    socket.emit("initial_state", {
      tickets: getTicketsArray(),
      locks: getLocksObject(),
      agents: getAgentsArray(),
    });

    socket.broadcast.emit("agent_joined", {
      agent: agents.get(socket.id),
      agents: getAgentsArray(),
    });
  });


  socket.on("lock_ticket", ({ ticketId }) => {
    const agent = agents.get(socket.id);
    if (!agent) return;

    const existingLock = locks.get(ticketId);
    if (existingLock && existingLock.agentId !== agent.agentId) {
      socket.emit("lock_denied", { ticketId, lockedBy: existingLock });
      return;
    }

    const lockInfo = {
      agentId: agent.agentId,
      agentName: agent.agentName,
      avatarColor: agent.avatarColor,
      lockedAt: new Date().toISOString(),
    };
    locks.set(ticketId, lockInfo);
    io.emit("ticket_locked", { ticketId, lock: lockInfo });
  });


  socket.on("unlock_ticket", ({ ticketId }) => {
    const agent = agents.get(socket.id);
    if (!agent) return;

    const existingLock = locks.get(ticketId);
    if (!existingLock) return;

    if (existingLock.agentId !== agent.agentId) return;

    locks.delete(ticketId);
    io.emit("ticket_unlocked", { ticketId });
  });


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
    io.emit("ticket_created", { ticket: newTicket });
  });


  socket.on("update_ticket", ({ ticketId, updates }, ack) => {
    const agent = agents.get(socket.id);
    if (!agent) return;

    const ticket = tickets.get(ticketId);
    if (!ticket) return;

    const lock = locks.get(ticketId);
    if (!lock || lock.agentId !== agent.agentId) {
      socket.emit("update_denied", { ticketId, reason: "Lock ownership required" });
      return;
    }

    const updatedTicket = {
      ...ticket,
      ...updates,
      updatedAt: new Date().toISOString(),
      assignedTo: agent.agentName,
    };

    tickets.set(ticketId, updatedTicket);
    io.emit("ticket_updated", { ticket: updatedTicket });

    if (typeof ack === "function") ack({ ok: true });
  });


  socket.on("disconnect", (reason) => {
    const agent = agents.get(socket.id);
    if (!agent) return;

    const releasedTickets = [];
    locks.forEach((lock, ticketId) => {
      if (lock.agentId === agent.agentId) {
        locks.delete(ticketId);
        releasedTickets.push(ticketId);
      }
    });

    agents.delete(socket.id);

    releasedTickets.forEach((ticketId) => {
      io.emit("ticket_unlocked", { ticketId, reason: "agent_disconnected" });
    });

    io.emit("agent_left", {
      agentId: agent.agentId,
      agentName: agent.agentName,
      agents: getAgentsArray(),
      releasedLocks: releasedTickets,
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
