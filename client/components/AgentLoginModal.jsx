"use client";
import { useState } from "react";
import { useDispatch } from "@/lib/store";

const AVATAR_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
];

const AGENT_NAMES = [
  "Agent A", "Agent B", "Agent C", "Agent D", "Agent E",
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function AgentLoginModal() {
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState("");

  function handleLogin(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your agent name.");
      return;
    }
    if (trimmed.length > 30) {
      setError("Name must be 30 characters or less.");
      return;
    }
    const agent = {
      agentId: generateId(),
      agentName: trimmed,
      avatarColor: selectedColor,
    };
    dispatch({ type: "SET_CURRENT_AGENT", payload: agent });
  }

  function quickLogin(preset) {
    const idx = AGENT_NAMES.indexOf(preset);
    const agent = {
      agentId: generateId(),
      agentName: preset,
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    };
    dispatch({ type: "SET_CURRENT_AGENT", payload: agent });
  }

  return (
    <div className="login-overlay">
      <div className="login-card">

        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366f1"/>
              <path d="M8 10h16M8 16h10M8 22h13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="24" cy="22" r="4" fill="#10b981" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <h1 className="login-brand">OpsCenter</h1>
            <p className="login-sub">Live Ops Helpdesk</p>
          </div>
        </div>

        <h2 className="login-title">Agent Sign In</h2>
        <p className="login-desc">
          Enter your name to join the support room. Your session is live and
          real-time across all connected agents.
        </p>


        <div className="login-presets">
          <p className="login-preset-label">Quick login (for demo):</p>
          <div className="login-preset-row">
            {AGENT_NAMES.map((n, i) => (
              <button
                key={n}
                className="login-preset-btn"
                style={{ "--accent": AVATAR_COLORS[i] }}
                onClick={() => quickLogin(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="login-divider"><span>or enter custom name</span></div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="agentName">Agent Name</label>
            <input
              id="agentName"
              type="text"
              placeholder="e.g. Sarah Mitchell"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              autoFocus
              autoComplete="off"
            />
            {error && <p className="login-error">{error}</p>}
          </div>

          <div className="login-colors">
            <p className="login-color-label">Choose avatar color:</p>
            <div className="login-color-row">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-dot ${selectedColor === c ? "selected" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setSelectedColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="login-submit">
            <span>Enter Ops Room</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
