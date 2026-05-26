"use client";
import { useStore } from "@/lib/store";
import { useSocketEvents } from "@/lib/useSocketEvents";
import TicketBoard from "@/components/TicketBoard";
import TicketDetailPanel from "@/components/TicketDetailPanel";
import ConnectionBanner from "@/components/ConnectionBanner";
import Toast from "@/components/Toast";

export default function LiveOpsApp() {
  const { selectedTicketId } = useStore();
  useSocketEvents();

  return (
    <main className="app-main">
      <TicketBoard />
      {selectedTicketId && <TicketDetailPanel />}
      <ConnectionBanner />
      <Toast />
    </main>
  );
}
