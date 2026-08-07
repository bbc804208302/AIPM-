import { Activity, ArrowUpRight, Database, Inbox, Radio } from "lucide-react";
import Link from "next/link";

const modules = [
  { href: "/intelligence", title: "AI 产品情报池", description: "聚合外部 Signal，并逐步转化为产品洞察。", icon: Radio, status: "等待数据" },
  { href: "/demands", title: "内部需求池", description: "追踪需求从评估到上线的完整执行链路。", icon: Inbox, status: "等待数据" },
  { href: "/sources", title: "数据源", description: "管理 Collector Source Registry 与来源健康状态。", icon: Database, status: "未配置" },
  { href: "/tasks", title: "采集任务", description: "观察采集工作流、运行状态与执行质量。", icon: Activity, status: "未启用" },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Product intelligence workspace</div>
          <h1>让有价值的信号，<br />流向产品决策。</h1>
          <p>连接外部 AI 产品情报与内部需求协作，建立从信号发现、产品理解到需求落地的可追踪工作流。</p>
        </div>
        <div className="pipeline" aria-label="SignalFlow 产品链路">
          {[
            "External Signal",
            "AI Understanding",
            "Product Insight",
            "Potential Demand",
            "Product Execution",
          ].map((step, index) => (
            <div className={`pipeline-row${index === 0 ? " current" : ""}`} key={step}>
              <span className="pipeline-index">{String(index + 1).padStart(2, "0")}</span><span>{step}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="section-head">
        <div><h2>工作空间</h2><p>进入业务模块，查看当前能力边界与真实空状态。</p></div>
        <div className="section-meta">4 MODULES</div>
      </div>
      <section className="module-grid" aria-label="工作台模块">
        {modules.map(({ href, title, description, icon: Icon, status }) => (
          <Link className="module" href={href} key={href}>
            <Icon className="module-icon" size={19} strokeWidth={1.6} />
            <span className="module-status">{status}</span>
            <h3>{title}</h3>
            <p>{description}</p>
            <ArrowUpRight className="module-arrow" size={15} aria-hidden="true" />
          </Link>
        ))}
      </section>
      <div className="footer-line"><span>SIGNALFLOW / PHASE 1.5</span><span>DATA SOURCE · FEISHU BITABLE</span></div>
    </>
  );
}
