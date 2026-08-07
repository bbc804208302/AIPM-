import { Activity, Bot, Database, Inbox, LayoutDashboard, Radio, Rows3 } from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "工作台", icon: LayoutDashboard, active: true },
  { label: "AI 产品情报池", icon: Radio },
  { label: "内部需求池", icon: Inbox },
  { label: "数据源", icon: Database },
  { label: "采集任务", icon: Activity },
];

const modules = [
  { title: "AI 产品情报池", description: "沉淀高价值外部信号，并逐步转化为产品洞察。", icon: Radio },
  { title: "内部需求池", description: "让提出、评估、执行与上线状态对团队透明。", icon: Rows3 },
  { title: "数据源", description: "为后续 Source Registry 与采集策略预留管理入口。", icon: Database },
  { title: "采集任务", description: "Collector 尚未启用，当前阶段只保留系统边界。", icon: Bot },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主要导航">
        <div className="brand">
          <div className="brand-mark">SF</div>
          <div><div className="brand-name">SignalFlow</div><div className="brand-subtitle">产品情报与需求协同</div></div>
        </div>
        <div className="nav-label">Workspace</div>
        <ul className="nav-list">
          {navItems.map(({ label, icon: Icon, active }) => (
            <li key={label}>
              {active ? (
                <Link className="nav-item active" href="/" aria-current="page"><Icon size={15} strokeWidth={1.8} /><span>{label}</span></Link>
              ) : (
                <span className="nav-item" aria-disabled="true"><Icon size={15} strokeWidth={1.8} /><span>{label}</span></span>
              )}
            </li>
          ))}
        </ul>
        <div className="nav-note">Phase 0 · Bootstrap<br />飞书数据连接尚未配置</div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>SignalFlow</span><span>/</span><strong>工作台</strong></div>
          <div className="system-state"><span className="state-dot" />LOCAL · NOT CONNECTED</div>
        </header>
        <main className="main">
          <section className="hero">
            <div>
              <div className="eyebrow">Product intelligence workspace</div>
              <h1>让有价值的信号，<br />流向产品决策。</h1>
              <p>连接外部 AI 产品情报与内部需求协作，建立从信号发现、产品理解到需求落地的可追踪工作流。</p>
            </div>
            <div className="pipeline" aria-label="SignalFlow 产品链路">
              <div className="pipeline-row current"><span className="pipeline-index">01</span><span>External Signal</span></div>
              <div className="pipeline-row"><span className="pipeline-index">02</span><span>Product Insight</span></div>
              <div className="pipeline-row"><span className="pipeline-index">03</span><span>Potential Demand</span></div>
              <div className="pipeline-row"><span className="pipeline-index">04</span><span>Internal Demand</span></div>
            </div>
          </section>
          <div className="section-head"><div><h2>工作空间</h2><p>当前仅展示信息架构与数据访问边界。</p></div><div className="section-meta">4 MODULES</div></div>
          <section className="module-grid" aria-label="工作台模块">
            {modules.map(({ title, description, icon: Icon }) => (
              <article className="module" key={title}><Icon className="module-icon" size={19} strokeWidth={1.6} /><span className="module-status">PLANNED</span><h3>{title}</h3><p>{description}</p></article>
            ))}
          </section>
          <div className="footer-line"><span>SIGNALFLOW / PHASE 0</span><span>DATA SOURCE · FEISHU BITABLE</span></div>
        </main>
      </div>
    </div>
  );
}
