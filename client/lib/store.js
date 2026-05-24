"use client";
import { createContext, useContext, useReducer, useCallback, useEffect } from "react";

const StoreContext = createContext(null);
const DispatchContext = createContext(null);

const initialState = {
  tickets: [],
  locks: {},       // { [ticketId]: { agentId, agentName, avatarColor, lockedAt } }
  agents: [],      // connected agents
  connectionStatus: "disconnected", // "connected" | "disconnected" | "reconnecting"
  selectedTicketId: null,
  currentAgent: null, // { agentId, agentName, avatarColor }
  notification: null, // { type: "success"|"error"|"info", message }
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_CURRENT_AGENT":
      if (typeof window !== "undefined") {
        if (action.payload) {
          localStorage.setItem("ops_agent", JSON.stringify(action.payload));
        } else {
          localStorage.removeItem("ops_agent");
        }
      }
      return { ...state, currentAgent: action.payload };

    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };

    case "INITIAL_STATE":
      return {
        ...state,
        tickets: action.payload.tickets,
        locks: action.payload.locks,
        agents: action.payload.agents,
      };

    case "TICKET_CREATED":
      // Prevent duplicates
      if (state.tickets.find((t) => t.id === action.payload.ticket.id)) return state;
      return {
        ...state,
        tickets: [action.payload.ticket, ...state.tickets],
      };

    case "TICKET_UPDATED":
      return {
        ...state,
        tickets: state.tickets.map((t) =>
          t.id === action.payload.ticket.id ? action.payload.ticket : t
        ),
      };

    case "TICKET_LOCKED": {
      const newLocks = { ...state.locks };
      newLocks[action.payload.ticketId] = action.payload.lock;
      return { ...state, locks: newLocks };
    }

    case "TICKET_UNLOCKED": {
      const newLocks = { ...state.locks };
      delete newLocks[action.payload.ticketId];
      return { ...state, locks: newLocks };
    }

    case "AGENT_JOINED":
      return { ...state, agents: action.payload.agents };

    case "AGENT_LEFT":
      return { ...state, agents: action.payload.agents };

    case "SELECT_TICKET":
      return { ...state, selectedTicketId: action.payload };

    case "CLOSE_TICKET":
      return { ...state, selectedTicketId: null };

    case "SET_NOTIFICATION":
      return { ...state, notification: action.payload };

    case "CLEAR_NOTIFICATION":
      return { ...state, notification: null };

    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ops_agent");
      if (saved) {
        try {
          const agent = JSON.parse(saved);
          dispatch({ type: "SET_CURRENT_AGENT", payload: agent });
        } catch (e) {
          console.error("Failed to parse saved agent session", e);
        }
      }
    }
  }, []);

  return (
    <StoreContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useDispatch() {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useDispatch must be used within StoreProvider");
  return ctx;
}
