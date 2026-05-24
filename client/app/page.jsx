"use client";
import { useStore } from "@/lib/store";
import { useSocketEvents } from "@/lib/useSocketEvents";
import AgentLoginModal from "@/components/AgentLoginModal";
import TicketBoard from "@/components/TicketBoard";
import TicketDetailPanel from "@/components/TicketDetailPanel";
import ConnectionBanner from "@/components/ConnectionBanner";
import Toast from "@/components/Toast";

function AppContent() {
  const { currentAgent, selectedTicketId } = useStore();
  useSocketEvents();

  if (!currentAgent) {
    return <AgentLoginModal />;
  }

  return (
    <main className="app-main">
      <TicketBoard />
      {selectedTicketId && <TicketDetailPanel />}
      <ConnectionBanner />
      <Toast />
    </main>
  );
}

export default function Home() {
  return <AppContent />;
}
