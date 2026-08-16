import type { Metadata } from "next";

import { AgentRunControls, type AgentSignalOption } from "@/components/agent/agent-run-controls";
import { AgentRunDashboard } from "@/components/agent/agent-run-dashboard";
import { AgentTriageControls } from "@/components/agent/agent-triage-controls";
import { AgentTriageDashboard } from "@/components/agent/agent-triage-dashboard";
import { MetricStrip } from "@/components/metric-card/metric-strip";
import { PageHeader } from "@/components/workspace/page-header";
import { loadOpportunityAgentWorkspace } from "@/services/load-opportunity-agent-workspace";

export const metadata: Metadata = { title: "机会 Agent · SignalFlow" };
export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const { signals, runs, triageRuns, executable, configured } = await loadOpportunityAgentWorkspace();
  const latestTriageRun = triageRuns[0] ?? null;
  const options: readonly AgentSignalOption[] = signals.map((signal) => ({
    id: signal.id,
    title: signal.titleZh ?? signal.title,
    trackLabel: signal.track === "domain" ? "业务领域" : "AI 行业",
    source: signal.source,
  }));
  const proposals = runs.filter((run) => run.decision === "proposal").length;
  const metrics = [
    { label: "今日扫描", value: String(latestTriageRun?.scannedSignals ?? 0), hint: "最近双轨情报" },
    { label: "Agent 准入", value: String(latestTriageRun?.recommendedSignalIds.length ?? 0), hint: "进入产品情报池" },
    { label: "重复过滤", value: String(latestTriageRun?.candidates.filter((item) => item.duplicateRisk >= 60).length ?? 0), hint: "Memory 高度相似" },
    { label: "候选需求", value: String(proposals), hint: `${runs.length} 次深度分析` },
  ];

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="Product intelligence agent" title="Agent 决策审计" description="查看情报准入、Memory 去重、机会评分、自动深度分析与候选需求的完整运行轨迹。" />
      <MetricStrip metrics={metrics} />
      <AgentTriageControls executable={executable} configured={configured} signalCount={signals.length} />
      <AgentTriageDashboard run={latestTriageRun} executable={executable && configured} />
      <AgentRunControls signals={options} executable={executable} configured={configured} />
      <AgentRunDashboard runs={runs} />
      <p className="page-footnote">安全边界：Agent 只处理公开情报；不读取飞书私有需求，不自动创建正式需求，不向页面暴露 LLM Secret。</p>
    </div>
  );
}
