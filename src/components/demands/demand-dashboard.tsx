import { AlertTriangle, Check, Clock3, Users } from "lucide-react";

import type { DemandDashboardSummary, DemandProgressStage } from "@/types/demand-dashboard";
import { P0Countdown } from "./p0-countdown";

const stageLabels: Record<DemandProgressStage, string> = {
  pending: "待评估",
  accepted: "待执行",
  building: "开发 / 测试",
  completed: "已完成",
  paused: "驳回 / 暂停",
};

export function DemandDashboard({ summary, dataState }: Readonly<{ summary: DemandDashboardSummary; dataState: "ready" | "error" }>) {
  const maxOwnerTotal = Math.max(...summary.owners.map((owner) => owner.total), 1);
  return (
    <section className="demand-dashboard" aria-label="产品需求看板">
      <header className="demand-dashboard-header">
        <div><span>FEISHU DEMAND PULSE</span><h2>需求执行总览</h2></div>
        <strong>{dataState === "ready" ? "LIVE DATA" : "CONNECTION ERROR"}</strong>
      </header>

      <div className="demand-kpi-grid">
        <article className="demand-kpi kpi-total">
          <div className="demand-kpi-heading"><span>需求总数</span><Users size={18} /></div>
          <strong className="demand-kpi-value">{summary.total}</strong>
          <p>飞书需求池全部记录</p>
        </article>
        <article className="demand-kpi kpi-completed">
          <div className="demand-kpi-heading"><span>已完成数</span><Check size={18} /></div>
          <strong className="demand-kpi-value">{summary.completed}</strong>
          <p>当前状态为已上线</p>
        </article>
        <article className="demand-kpi kpi-waiting">
          <div className="demand-kpi-heading"><span>平均需求等待天数</span><Clock3 size={18} /></div>
          <strong className="demand-kpi-value">{summary.averageWaitingDays}</strong>
          <p>未完成需求从提交至今</p>
        </article>
        <P0Countdown initial={summary.p0} />
      </div>

      <div className="demand-analysis-grid">
        <section className="demand-analysis-panel funnel-panel" aria-labelledby="demand-funnel-title">
          <header><div><span>PIPELINE CONVERSION</span><h3 id="demand-funnel-title">需求状态漏斗</h3></div><strong>{summary.paused} 暂停</strong></header>
          <div className="demand-funnel">
            {summary.funnel.map((step, index) => (
              <div className={`funnel-row funnel-step-${index + 1}`} key={step.key}>
                <span>{step.label}</span>
                <div style={{ width: `${Math.max(step.percentage, step.count > 0 ? 18 : 10)}%` }}>
                  <strong>{step.count}</strong><small>{step.percentage}%</small>
                </div>
              </div>
            ))}
          </div>
          <p className="dashboard-method-note">漏斗按“已到达该阶段”累计计算；驳回与暂停需求单独展示。</p>
        </section>

        <section className="demand-analysis-panel owner-panel" aria-labelledby="owner-progress-title">
          <header><div><span>OWNER WORKLOAD</span><h3 id="owner-progress-title">人员需求进展</h3></div><strong>TOP {summary.owners.length}</strong></header>
          <div className="owner-legend">
            {(Object.keys(stageLabels) as DemandProgressStage[]).map((stage) => <span className={`legend-${stage}`} key={stage}>{stageLabels[stage]}</span>)}
          </div>
          <div className="owner-progress-list">
            {summary.owners.length > 0 ? summary.owners.map((owner) => (
              <div className="owner-progress-row" key={owner.owner}>
                <div><strong>{owner.owner}</strong><span>{owner.total} 项需求</span></div>
                <div className="owner-progress-track" style={{ width: `${Math.max((owner.total / maxOwnerTotal) * 100, 24)}%` }}>
                  {(Object.keys(stageLabels) as DemandProgressStage[]).map((stage) => owner.stages[stage] > 0 ? (
                    <span
                      className={`owner-stage stage-${stage}`}
                      style={{ flexGrow: owner.stages[stage] }}
                      key={stage}
                      title={`${stageLabels[stage]} ${owner.stages[stage]}`}
                    >{owner.stages[stage]}</span>
                  ) : null)}
                </div>
              </div>
            )) : <div className="dashboard-empty"><AlertTriangle size={22} /><span>暂无可统计的负责人需求数据</span></div>}
          </div>
        </section>
      </div>

      {dataState === "error" ? <p className="dashboard-data-warning"><AlertTriangle size={16} />飞书需求数据暂时不可用，请检查应用权限和本地配置。</p> : null}
    </section>
  );
}
