"use client";
import { useEffect } from "react";
import { useStore, useDispatch } from "@/lib/store";

export default function Toast() {
  const { notification } = useStore();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      dispatch({ type: "CLEAR_NOTIFICATION" });
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification, dispatch]);

  if (!notification) return null;

  const isError = notification.type === "error";

  return (
    <div className={`toast-container ${isError ? "toast--error" : "toast--info"}`} role="alert">
      <div className="toast-icon">
        {isError ? "❌" : "ℹ️"}
      </div>
      <div className="toast-content">
        <p className="toast-message">{notification.message}</p>
      </div>
      <button className="toast-close" onClick={() => dispatch({ type: "CLEAR_NOTIFICATION" })} aria-label="Close notification">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}
