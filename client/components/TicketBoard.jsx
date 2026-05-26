"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useStore, useDispatch } from "@/lib/store";
import TicketRow from "./TicketRow";
import CreateTicketModal from "./CreateTicketModal";
import AgentPresence from "./AgentPresence";

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const PRIORITY_FILTER = [
  { value: "all", label: "Any Priority" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "priority", label: "Priority" },
];

const PRIORITY_ORDER = { critical: 0, high: 1, normal: 2 };

export default function TicketBoard() {
  const { tickets, locks, agents, currentAgent } = useStore();
  const dispatch = useDispatch();
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTicketIds, setNewTicketIds] = useState(new Set());

  function handleLogout() {
    dispatch({ type: "SET_CURRENT_AGENT", payload: null });
    dispatch({ type: "CLOSE_TICKET" });
  }


  const prevTicketIdsRef = useRef(null);
  useEffect(() => {
    const currentIds = new Set(tickets.map((t) => t.id));
    if (prevTicketIdsRef.current !== null) {
      const added = [];
      currentIds.forEach((id) => {
        if (!prevTicketIdsRef.current.has(id)) added.push(id);
      });
      if (added.length > 0) {
        setNewTicketIds((prev) => {
          const next = new Set(prev);
          added.forEach((id) => next.add(id));
          return next;
        });

        const timer = setTimeout(() => {
          setNewTicketIds((prev) => {
            const next = new Set(prev);
            added.forEach((id) => next.delete(id));
            return next;
          });
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
    prevTicketIdsRef.current = currentIds;
  }, [tickets]);


  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    critical: tickets.filter((t) => t.priority === "critical").length,
    locked: Object.keys(locks).length,
  }), [tickets, locks]);


  const filtered = useMemo(() => {
    let list = [...tickets];
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all") list = list.filter((t) => t.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q) ||
          t.customer.toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "newest") list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === "oldest") list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === "priority") list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
    return list;
  }, [tickets, statusFilter, priorityFilter, search, sortBy]);

  return (
    <div className="board">

      <header className="board-header">
        <div className="board-header-left">
          <div className="board-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="#6366f1"/>
              <path d="M9 11h18M9 18h12M9 25h15" stroke="white" strokeWidth="2.8" strokeLinecap="round"/>
              <circle cx="27" cy="25" r="5" fill="#10b981" stroke="white" strokeWidth="1.5"/>
            </svg>
            <div>
              <h1 className="board-brand">OpsCenter</h1>
              <p className="board-sub">Live Ops Helpdesk</p>
            </div>
          </div>
        </div>

        <AgentPresence />

        <div className="board-header-right">
          {currentAgent && (
            <div className="current-agent-badge">
              <div
                className="current-agent-avatar"
                style={{ backgroundColor: currentAgent.avatarColor }}
              >
                {currentAgent.agentName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
              <span>{currentAgent.agentName}</span>
              <button 
                className="agent-logout-btn" 
                onClick={handleLogout}
                title="Sign out of Ops Room"
                aria-label="Logout"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </button>
            </div>
          )}
          <button className="create-btn" onClick={() => setShowCreate(true)} id="create-ticket-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Ticket
          </button>
        </div>
      </header>


      <div className="stats-bar">
        <div className="stat-card" style={{ animationDelay: '0.1s' }}>
          <p className="stat-value">{stats.total}</p>
          <p className="stat-label">Total Tickets</p>
        </div>
        <div className="stat-card stat-card--open" style={{ animationDelay: '0.2s' }}>
          <p className="stat-value" style={{ color: "#6366f1" }}>{stats.open}</p>
          <p className="stat-label">Open</p>
        </div>
        <div className="stat-card stat-card--critical" style={{ animationDelay: '0.3s' }}>
          <p className="stat-value" style={{ color: "#ef4444" }}>{stats.critical}</p>
          <p className="stat-label">Critical</p>
        </div>
        <div className="stat-card stat-card--locked" style={{ animationDelay: '0.4s' }}>
          <p className="stat-value" style={{ color: "#f59e0b" }}>{stats.locked}</p>
          <p className="stat-label">🔒 Locked</p>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.5s' }}>
          <p className="stat-value" style={{ color: "#10b981" }}>{agents.length}</p>
          <p className="stat-label">Agents Online</p>
        </div>
      </div>


      <div className="board-controls">
        <div className="search-bar">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="ticket-search"
            type="text"
            placeholder="Search tickets, customers, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        <div className="filter-group">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              id={`filter-status-${f.value}`}
              className={`filter-btn ${statusFilter === f.value ? "active" : ""}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          id="filter-priority"
          className="filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          {PRIORITY_FILTER.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <select
          id="sort-by"
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <span className="results-count">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>


      <div className="ticket-list" id="ticket-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            <p>No tickets match your filters.</p>
            <button className="filter-btn active" onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); setSearch(""); }}>
              Clear Filters
            </button>
          </div>
        ) : (
          filtered.map((ticket, index) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              isNew={newTicketIds.has(ticket.id)}
              index={index}
            />
          ))
        )}
      </div>

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
