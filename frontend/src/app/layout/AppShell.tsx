import type { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { DashboardTab } from "./navigation";

interface AppShellProps extends PropsWithChildren {
  generatedAt?: string;
  username?: string;
  onLogout?: () => Promise<void>;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

export function AppShell({ generatedAt, username, onLogout, activeTab, onTabChange, children }: AppShellProps) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <main className="min-w-0">
        <Topbar generatedAt={generatedAt} username={username} onLogout={onLogout} />
        {children}
      </main>
    </div>
  );
}
