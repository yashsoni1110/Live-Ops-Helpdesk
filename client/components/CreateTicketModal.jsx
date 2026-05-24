"use client";
import { useState } from "react";
import { getSocket } from "@/lib/socket";
import { useStore } from "@/lib/store";

const PRIORITY_OPTIONS = [
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟡 High" },
  { value: "normal", label: "🟢 Normal" },
];

const CATEGORY_OPTIONS = [
  "Vehicle Breakdown",
  "Billing Issue",
  "Delivery Failure",
  "Temperature Compliance",
  "Lost/Damaged Goods",
  "Compliance",
  "Customs & Border",
  "Damage Claim",
  "Routing Error",
  "Port Operations",
  "General",
];

export default function CreateTicketModal({ onClose }) {
  const { currentAgent } = useStore();
  const [form, setForm] = useState({
    subject: "",
    customer: "",
    customerEmail: "",
    priority: "normal",
    category: "General",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.customer.trim()) return;
    setSubmitting(true);
    const socket = getSocket();
    socket.emit("create_ticket", form);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 500);
  }

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <div className="create-modal" role="dialog" aria-label="Create New Ticket">
        <div className="create-modal-header">
          <div className="create-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <h2>Create New Ticket</h2>
          </div>
          <button className="panel-close-btn" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="panel-field">
            <label className="panel-label">Subject <span style={{color:"#ef4444"}}>*</span></label>
            <input
              className="panel-input"
              placeholder="Brief description of the issue..."
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="panel-row-two">
            <div className="panel-field">
              <label className="panel-label">Customer / Company <span style={{color:"#ef4444"}}>*</span></label>
              <input
                className="panel-input"
                placeholder="e.g. Hargrove Steel Co."
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                required
              />
            </div>
            <div className="panel-field">
              <label className="panel-label">Customer Email</label>
              <input
                className="panel-input"
                type="email"
                placeholder="ops@company.com"
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="panel-row-two">
            <div className="panel-field">
              <label className="panel-label">Priority</label>
              <select
                className="panel-select"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="panel-field">
              <label className="panel-label">Category</label>
              <select
                className="panel-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel-field">
            <label className="panel-label">Description</label>
            <textarea
              className="panel-textarea"
              rows={4}
              placeholder="Detailed description of the issue..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="create-form-footer">
            <button type="button" className="panel-btn panel-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="panel-btn panel-btn--primary" disabled={submitting}>
              {submitting ? (
                <><div className="btn-spinner" />Creating...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Create Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
