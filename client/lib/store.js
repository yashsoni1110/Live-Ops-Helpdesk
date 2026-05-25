"use client";
import { createContext, useContext, useReducer, useEffect } from "react";

const StoreContext = createContext(null);
const DispatchContext = createContext(null);

const initialState = {
  tickets: [],
  locks: {},
  agents: [],
  connectionStatus: "disconnected",
  selectedTicketId: null,
  currentAgent: null,
  notification: null,
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
      if (state.tickets.some((t) => t.id === action.payload.ticket.id)) return state;
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
      const locks = { ...state.locks, [action.payload.ticketId]: action.payload.lock };
      return { ...state, locks };
    }

    case "TICKET_UNLOCKED": {
      const locks = { ...state.locks };
      delete locks[action.payload.ticketId];
      return { ...state, locks };
    }

    case "AGENT_JOINED":
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
          dispatch({ type: "SET_CURRENT_AGENT", payload: JSON.parse(saved) });
        } catch (e) {
          console.error("Failed to restore agent session", e);
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
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}

export function useDispatch() {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useDispatch must be inside StoreProvider");
  return ctx;
}
