"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";

export function useTicketLock(ticket, currentAgent, isLockedByMe, onUnlock) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setSaved(false);
    getSocket().emit("lock_ticket", { ticketId: ticket.id });
  }, [ticket?.id]);

  const handleClose = useCallback(() => {
    if (ticket) {
      getSocket().emit("unlock_ticket", { ticketId: ticket.id });
    }
    onUnlock();
  }, [ticket, onUnlock]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const handleSave = useCallback((form) => {
    if (!ticket || !isLockedByMe || !form) return;
    setSaving(true);
    const socket = getSocket();

    socket.emit(
      "update_ticket",
      {
        ticketId: ticket.id,
        updates: form,
      },
      () => {
        socket.emit("unlock_ticket", { ticketId: ticket.id });
        setSaving(false);
        setSaved(true);
        setTimeout(() => {
          onUnlock();
        }, 800);
      }
    );
  }, [ticket, isLockedByMe, onUnlock]);

  return { handleClose, handleSave, saving, saved, setSaved };
}
