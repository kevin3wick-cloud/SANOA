export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/app-shell";
import { AgentChat } from "./_components/agent-chat";

export default function AgentPage() {
  return (
    <AppShell>
      <div className="stack" style={{ maxWidth: 720 }}>
        <div>
          <h1 className="page-title">KI-Agent</h1>
          <p className="page-lead muted">
            Erteile dem Agenten Aufgaben in natürlicher Sprache — er führt sie direkt aus.
          </p>
        </div>
        <AgentChat />
      </div>
    </AppShell>
  );
}
