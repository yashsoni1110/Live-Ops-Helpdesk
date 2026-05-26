"use client";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import AgentLoginModal from "@/components/AgentLoginModal";

const LiveOpsApp = dynamic(() => import("@/components/LiveOpsApp"), { ssr: false });

function AppContent() {
  const { currentAgent } = useStore();

  if (!currentAgent) {
    return <AgentLoginModal />;
  }

  return <LiveOpsApp />;
}

export default function Home() {
  return <AppContent />;
}
