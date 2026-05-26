"use client";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useDispatch, useStore } from "@/lib/store";

export function useSocketEvents() {
  const dispatch = useDispatch();
  const { currentAgent } = useStore();
  const joinedRef = useRef(false);
  const currentAgentRef = useRef(currentAgent);
  currentAgentRef.current = currentAgent;

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
      if (currentAgentRef.current && joinedRef.current) {
        socket.emit("join", currentAgentRef.current);
      }
    }

    function onDisconnect(reason) {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
    }

    function onConnectError() {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "reconnecting" });
    }

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
          message: `Locked by ${lockedBy.agentName}`,
        },
      });
    });



    return () => {
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
