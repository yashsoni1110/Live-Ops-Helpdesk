"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export default function ConnectionBanner() {
  const { connectionStatus } = useStore();
  const [showReconnected, setShowReconnected] = useState(false);
  const [prevStatus, setPrevStatus] = useState(null);

  useEffect(() => {
    if (prevStatus === "disconnected" && connectionStatus === "connected") {
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(t);
    }
    setPrevStatus(connectionStatus);
  }, [connectionStatus]);

  if (connectionStatus === "connected" && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div className="conn-banner conn-banner--success" role="status">
        <div className="conn-banner-inner">
          <div className="conn-dot conn-dot--green" />
          <span>✅ Reconnected — You are back online</span>
        </div>
      </div>
    );
  }

  return (
    <div className="conn-banner conn-banner--error" role="alert">
      <div className="conn-banner-inner">
        <div className="conn-dot conn-dot--red conn-dot--pulse" />
        <span>
          {connectionStatus === "reconnecting"
            ? "🔴 Connection Lost: Reconnecting... Your changes may not save."
            : "🔴 Connection Lost: Attempting to reconnect..."}
        </span>
        <div className="conn-spinner" />
      </div>
    </div>
  );
}
