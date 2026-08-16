import type { Metadata } from "next";

import { AgentRunControls, type AgentSignalOption } from "@/components/agent/agent-run-controls";
import { AgentRunDashboard } from "@/components/agent/agent-run-dashboard";
import { MetricStrip } from "@/components/metric-card/metric-strip";
import { PageHeader } from "@/components/workspace/page-header";
import { loadOpportunityAgentWorkspace } from "@/services/load-opportunity-agent-workspace";

export const metadata: Metadata = { title: "机会 Agent · SignalFlow" };
export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const { signals, runs, executable, configured } = await loadOpportunityAgentWorkspace();
  const options: readonly AgentSignalOption[] = signals.map((signal) => ({
    id: signal.id,
    title: signal.titleZh ?? signal.title,
    trackLabel: signal.track === "domain" ? "业务领域" : "AI 行业",
    source: signal.source,
  }));
  const proposals = runs.filter((run) => run.decision === "proposal").length;
  const successfulToolCalls = runs.flatMap((run) => run.toolCalls).filter((call) => call.status === "success").length;
  const totalToolCalls = runs.flatMap((run) => run.toolCalls).length;
  const metrics = [
    { label: "Agent Runs", value: String(runs.length), hint: "持久化运行记忆" },
    { label: "候选需求", value: String(proposals), hint: "等待人工确认" },
    { label: "Tool 成功率", value: totalToolCalls > 0 ? `${Math.round((successfulToolCalls / totalToolCalls) * 100)}%` : "—", hint: `${successfulToolCalls}/${totalToolCalls} 次调用` },
    { label: "可评估 Signal", value: String(signals.length), hint: "最近双轨情报" },
  ];

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="Product opportunity agent" title="机会 Agent" description="读取真实 Signal、检索历史 Memory，并通过 Tool Use 形成等待产品经理确认的候选需求。" />
      <MetricStrip metrics={metrics} />
      <AgentRunControls signals={options} executable={executable} configured={configured} />
      <AgentRunDashboard runs={runs} />
      <p className="page-footnote">安全边界：Agent 只处理公开情报；不读取飞书私有需求，不自动创建正式需求，不向页面暴露 LLM Secret。</p>
    </div>
  );
}
