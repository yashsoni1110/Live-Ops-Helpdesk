"use client";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useDispatch, useStore } from "@/lib/store";

export function useSocketEvents() {
  const dispatch = useDispatch();
  const { currentAgent } = useStore();
  const joinedRef = useRef(false);
  // Always-current ref so socket callbacks never close over a stale currentAgent
  const currentAgentRef = useRef(currentAgent);
  currentAgentRef.current = currentAgent; // sync on every render, no useEffect needed

  useEffect(() => {
    const socket = getSocket();

    // ── Connection events ──────────────────────────────────────────────────
    function onConnect() {
      console.log("[SOCKET] Connected:", socket.id);
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
      // Re-join if we already have an agent identity (reconnect / server restart)
      // Use ref to avoid the stale closure over the null captured on mount
      if (currentAgentRef.current && joinedRef.current) {
        socket.emit("join", currentAgentRef.current);
      }
    }

    function onDisconnect(reason) {
      console.log("[SOCKET] Disconnected:", reason);
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
    }

    function onConnectError() {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "reconnecting" });
    }

    // Named references so they can be properly removed from socket.io manager
    function onReconnectAttempt() {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "reconnecting" });
    }

    function onReconnect() {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.io.on("reconnect", onReconnect);

    // ── App events ─────────────────────────────────────────────────────────
    socket.on("initial_state", (payload) => {
      dispatch({ type: "INITIAL_STATE", payload });
    });

    socket.on("ticket_created", ({ ticket }) => {
      dispatch({ type: "TICKET_CREATED", payload: { ticket } });
    });

    socket.on("ticket_updated", ({ ticket }) => {
      dispatch({ type: "TICKET_UPDATED", payload: { ticket } });
    });

    socket.on("ticket_locked", ({ ticketId, lock }) => {
      dispatch({ type: "TICKET_LOCKED", payload: { ticketId, lock } });
    });

    socket.on("ticket_unlocked", ({ ticketId }) => {
      dispatch({ type: "TICKET_UNLOCKED", payload: { ticketId } });
    });

    socket.on("agent_joined", ({ agents }) => {
      dispatch({ type: "AGENT_JOINED", payload: { agents } });
    });

    socket.on("agent_left", ({ agents }) => {
      dispatch({ type: "AGENT_LEFT", payload: { agents } });
    });

    socket.on("lock_denied", ({ ticketId, lockedBy }) => {
      dispatch({
        type: "SET_NOTIFICATION",
        payload: {
          type: "error",
          message: `Ticket is already locked by ${lockedBy.agentName}`,
        },
      });
    });

    // Connect
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      // Clean up socket listeners
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("initial_state");
      socket.off("ticket_created");
      socket.off("ticket_updated");
      socket.off("ticket_locked");
      socket.off("ticket_unlocked");
      socket.off("agent_joined");
      socket.off("agent_left");
      socket.off("lock_denied");
      // Clean up socket.io manager listeners (these were the leak)
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.io.off("reconnect", onReconnect);
    };
  }, [dispatch]);

  useEffect(() => {
    const socket = getSocket();
    if (currentAgent) {
      if (!joinedRef.current) {
        const joinAndMark = () => {
          socket.emit("join", currentAgent);
          joinedRef.current = true;
        };

        if (socket.connected) {
          joinAndMark();
        } else {
          socket.once("connect", joinAndMark);
          socket.connect();
          return () => socket.off("connect", joinAndMark);
        }
      }
    } else {
      if (joinedRef.current) {
        socket.disconnect();
        joinedRef.current = false;
      }
    }
  }, [currentAgent]);
}
