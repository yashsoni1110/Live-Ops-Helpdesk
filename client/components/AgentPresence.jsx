"use client";
import { useStore } from "@/lib/store";

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AgentPresence() {
  const { agents, currentAgent, connectionStatus } = useStore();

  const maxVisible = 5;
  const visible = agents.slice(0, maxVisible);
  const overflow = agents.length - maxVisible;

  return (
    <div className="presence-bar">
      <div className="presence-status">
        <div
          className={`presence-dot ${
            connectionStatus === "connected"
              ? "presence-dot--green"
              : connectionStatus === "reconnecting"
              ? "presence-dot--yellow"
              : "presence-dot--red"
          }`}
        />
        <span className="presence-status-text">
          {connectionStatus === "connected"
            ? "Live"
            : connectionStatus === "reconnecting"
            ? "Reconnecting"
            : "Offline"}
        </span>
      </div>

      <div className="presence-avatars">
        {visible.map((agent, i) => (
          <div
            key={agent.socketId || agent.agentId}
            className="presence-avatar"
            style={{
              backgroundColor: agent.avatarColor,
              zIndex: maxVisible - i,
              border: agent.agentId === currentAgent?.agentId ? "2px solid #fff" : "2px solid #1a2035",
            }}
            title={`${agent.agentName}${agent.agentId === currentAgent?.agentId ? " (You)" : ""} — joined ${formatTime(agent.connectedAt)}`}
          >
            {getInitials(agent.agentName)}
          </div>
        ))}
        {overflow > 0 && (
          <div className="presence-avatar presence-avatar--overflow">
            +{overflow}
          </div>
        )}
      </div>

      <span className="presence-count">
        {agents.length} agent{agents.length !== 1 ? "s" : ""} online
      </span>
    </div>
  );
}
