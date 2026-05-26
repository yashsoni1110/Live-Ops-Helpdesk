"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useStore, useDispatch } from "@/lib/store";
import { getSocket } from "@/lib/socket";
import { useTicketLock } from "@/lib/useTicketLock";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟡 High" },
  { value: "normal", label: "🟢 Normal" },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TicketDetailPanel() {
  const { tickets, locks, selectedTicketId, currentAgent } = useStore();
  const dispatch = useDispatch();
  const [form, setForm] = useState(null);
  const panelRef = useRef(null);

  const ticket = tickets.find((t) => t.id === selectedTicketId);
  const lock = ticket ? locks[ticket.id] : null;
  const isLockedByMe = lock && currentAgent && lock.agentId === currentAgent.agentId;
  const isLockedByOther = lock && currentAgent && lock.agentId !== currentAgent.agentId;

  const onUnlock = useCallback(() => {
    dispatch({ type: "CLOSE_TICKET" });
  }, [dispatch]);

  const { handleClose, handleSave, saving, saved, setSaved } = useTicketLock(
    ticket,
    currentAgent,
    isLockedByMe,
    onUnlock
  );

  useEffect(() => {
    if (!ticket) return;
    setForm({
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      description: ticket.description || "",
      assignedTo: ticket.assignedTo || "",
    });
    setSaved(false);
  }, [ticket, setSaved]);

  if (!ticket) return null;

  const priorityColor =
    ticket.priority === "critical"
      ? "#ef4444"
      : ticket.priority === "high"
      ? "#f59e0b"
      : "#10b981";

  return (
    <>
      <div className="panel-backdrop" onClick={handleClose} />
      <aside className="detail-panel" ref={panelRef} role="dialog" aria-label="Ticket Detail">
        <div className="panel-header">
          <div className="panel-title-row">
            <div className="panel-ticket-num" style={{ color: priorityColor }}>
              {ticket.ticketNumber}
            </div>
            <button className="panel-close-btn" onClick={handleClose} aria-label="Close panel">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {isLockedByOther && (
            <div className="panel-lock-banner panel-lock-banner--other">
              <span>🔒</span>
              <span>This ticket is currently being edited by <strong>{lock.agentName}</strong>. View only.</span>
            </div>
          )}
          {isLockedByMe && (
            <div className="panel-lock-banner panel-lock-banner--mine">
              <span>✏️</span>
              <span>You have edit access. Changes will be broadcast in real-time.</span>
            </div>
          )}
        </div>

        <div className="panel-body">
          <div className="panel-field">
            <label className="panel-label">Subject</label>
            {isLockedByMe ? (
              <input
                className="panel-input"
                value={form?.subject || ""}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ticket subject"
              />
            ) : (
              <p className="panel-value">{ticket.subject}</p>
            )}
          </div>

          <div className="panel-row-two">
            <div className="panel-field">
              <label className="panel-label">Customer</label>
              <p className="panel-value">{ticket.customer}</p>
            </div>
            <div className="panel-field">
              <label className="panel-label">Email</label>
              <p className="panel-value panel-email">{ticket.customerEmail || "—"}</p>
            </div>
          </div>

          <div className="panel-row-two">
            <div className="panel-field">
              <label className="panel-label">Status</label>
              {isLockedByMe ? (
                <select
                  className="panel-select"
                  value={form?.status || "open"}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <p className="panel-value">{STATUS_OPTIONS.find(s => s.value === ticket.status)?.label || ticket.status}</p>
              )}
            </div>
            <div className="panel-field">
              <label className="panel-label">Priority</label>
              {isLockedByMe ? (
                <select
                  className="panel-select"
                  value={form?.priority || "normal"}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <p className="panel-value">{PRIORITY_OPTIONS.find(p => p.value === ticket.priority)?.label || ticket.priority}</p>
              )}
            </div>
          </div>


          <div className="panel-field">
            <label className="panel-label">Category</label>
            <p className="panel-value">{ticket.category || "—"}</p>
          </div>

          <div className="panel-field">
            <label className="panel-label">Description / Resolution Notes</label>
            {isLockedByMe ? (
              <textarea
                className="panel-textarea"
                value={form?.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={6}
                placeholder="Add resolution notes..."
              />
            ) : (
              <p className="panel-value panel-desc">{ticket.description || "No description."}</p>
            )}
          </div>

          <div className="panel-field">
            <label className="panel-label">Assigned To</label>
            {isLockedByMe ? (
              <input
                className="panel-input"
                value={form?.assignedTo || ""}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                placeholder="Agent name"
              />
            ) : (
              <p className="panel-value">{ticket.assignedTo || "Unassigned"}</p>
            )}
          </div>

          {ticket.tags && ticket.tags.length > 0 && (
            <div className="panel-field">
              <label className="panel-label">Tags</label>
              <div className="panel-tags">
                {ticket.tags.map((tag) => (
                  <span key={tag} className="panel-tag">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="panel-timestamps">
            <span>Created {timeAgo(ticket.createdAt)}</span>
            <span>·</span>
            <span>Updated {timeAgo(ticket.updatedAt)}</span>
          </div>
        </div>

        <div className="panel-footer">
          <button className="panel-btn panel-btn--ghost" onClick={handleClose}>
            Close
          </button>
          {isLockedByMe && (
            <button
              className={`panel-btn panel-btn--primary ${saving ? "saving" : ""} ${saved ? "saved" : ""}`}
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saved ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                  Saved!
                </>
              ) : saving ? (
                <>
                  <div className="btn-spinner" />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
