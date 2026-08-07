import type { ReactNode } from "react";

import { SidebarNavigation } from "@/components/navigation/sidebar-navigation";
import { WorkspaceBreadcrumb } from "@/components/navigation/workspace-breadcrumb";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主要导航">
        <div className="brand">
          <div className="brand-mark">SF</div>
          <div>
            <div className="brand-name">SignalFlow</div>
            <div className="brand-subtitle">产品情报与需求协同</div>
          </div>
        </div>
        <div className="nav-label">Workspace</div>
        <SidebarNavigation />
        <div className="nav-note">
          Phase 1.5 · Experience Layer
          <br />
          飞书数据连接尚未配置
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <WorkspaceBreadcrumb />
          <div className="system-state">
            <span className="state-dot" />
            LOCAL · NOT CONNECTED
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
