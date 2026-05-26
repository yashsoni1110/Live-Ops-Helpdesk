"use client";
import { useStore, useDispatch } from "@/lib/store";
import { getSocket } from "@/lib/socket";

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)", dot: "#ef4444" },
  high: { label: "High", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", dot: "#f59e0b" },
  normal: { label: "Normal", color: "#10b981", bg: "rgba(16,185,129,0.12)", dot: "#10b981" },
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "#6366f1" },
  in_progress: { label: "In Progress", color: "#f59e0b" },
  resolved: { label: "Resolved", color: "#10b981" },
  closed: { label: "Closed", color: "#6b7280" },
};

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TicketRow({ ticket, isNew, index = 0 }) {
  const { locks, currentAgent, selectedTicketId } = useStore();
  const dispatch = useDispatch();

  const lock = locks[ticket.id];
  const isLockedByMe = lock && currentAgent && lock.agentId === currentAgent.agentId;
  const isLockedByOther = lock && currentAgent && lock.agentId !== currentAgent.agentId;
  const isSelected = selectedTicketId === ticket.id;

  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.normal;
  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

  function handleClick() {
    if (isLockedByOther) return;
    dispatch({ type: "SELECT_TICKET", payload: ticket.id });
  }

  function handleUnlock(e) {
    e.stopPropagation();
    const socket = getSocket();
    socket.emit("unlock_ticket", { ticketId: ticket.id });
    dispatch({ type: "CLOSE_TICKET" });
  }

  return (
    <div
      className={[
        "ticket-row",
        isLockedByOther ? "ticket-row--locked" : "",
        isLockedByMe ? "ticket-row--mine" : "",
        isSelected ? "ticket-row--selected" : "",
        isNew ? "ticket-row--new" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={handleClick}
      role="button"
      tabIndex={isLockedByOther ? -1 : 0}
      onKeyDown={(e) => e.key === "Enter" && !isLockedByOther && handleClick()}
      aria-label={`Ticket ${ticket.ticketNumber}: ${ticket.subject}`}
    >
      <div className="ticket-stripe" style={{ backgroundColor: priority.dot }} />

      <div className="ticket-main">
        <div className="ticket-header-row">
          <div className="ticket-meta">
            <span className="ticket-number">{ticket.ticketNumber}</span>
            <span
              className="ticket-priority-badge"
              style={{ color: priority.color, backgroundColor: priority.bg }}
            >
              <span className="priority-dot" style={{ backgroundColor: priority.dot }} />
              {priority.label}
            </span>
            <span
              className="ticket-status-badge"
              style={{ color: status.color, borderColor: status.color }}
            >
              {status.label}
            </span>
            {ticket.category && (
              <span className="ticket-category">{ticket.category}</span>
            )}
          </div>
          <span className="ticket-time">{timeAgo(ticket.createdAt)}</span>
        </div>

        <p className="ticket-subject">{ticket.subject}</p>

        <div className="ticket-footer-row">
          <div className="ticket-customer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{ticket.customer}</span>
          </div>

          {ticket.tags && ticket.tags.length > 0 && (
            <div className="ticket-tags">
              {ticket.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="ticket-tag">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ticket-right">
        {isLockedByOther && (
          <div className="ticket-lock-info">
            <div
              className="ticket-lock-avatar"
              style={{ backgroundColor: lock.avatarColor }}
            >
              {getInitials(lock.agentName)}
            </div>
            <div className="ticket-lock-text">
              <span className="lock-icon">🔒</span>
              <span className="lock-label">Locked by {lock.agentName}</span>
            </div>
          </div>
        )}

        {isLockedByMe && (
          <div className="ticket-lock-mine">
            <span className="lock-mine-badge">✏️ Editing</span>
            <button
              className="ticket-release-btn"
              onClick={handleUnlock}
            >
              Release
            </button>
          </div>
        )}

        {!lock && (
          <button
            className={`ticket-edit-btn ${isLockedByOther ? "disabled" : ""}`}
            disabled={isLockedByOther}
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
