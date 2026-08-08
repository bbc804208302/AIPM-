import type { Metadata } from "next";

import { MetricStrip } from "@/components/metric-card/metric-strip";
import { CollectorTaskControls } from "@/components/tasks/collector-task-controls";
import { PageHeader } from "@/components/workspace/page-header";
import { loadCollectorWorkspace } from "@/services/load-collector-workspace";
import { domainFocusAreaOptions } from "@/collector/configuration";
import type { DailyIntelligenceBrief } from "@/types/intelligence";

export const metadata: Metadata = { title: "采集任务 · SignalFlow" };
export const dynamic = "force-dynamic";

function LastRun({ brief, title }: Readonly<{ brief: DailyIntelligenceBrief; title: string }>) {
  return (
    <section className="task-result-block" aria-label={`${title}最近一次采集结果`}>
      <header><span>LAST RUN</span><h2>{title}最近批次</h2></header>
      <div className="last-run-panel">
        <div><span>最近批次</span><strong>{brief.briefingDate}</strong></div>
        <div><span>候选信号</span><strong>{brief.candidateCount}</strong></div>
        <div><span>最终入选</span><strong>{brief.items.length}</strong></div>
        <div><span>异常来源</span><strong>{brief.sources.filter((source) => source.status === "failed").length}</strong></div>
      </div>
    </section>
  );
}

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function TasksPage() {
  const { sources, domainSources, schedule, domainSchedule, latestBrief, domainBrief, editable } = await loadCollectorWorkspace();
  const enabledSources = sources.filter((source) => source.enabled).length;
  const enabledDomainSources = domainSources.filter((source) => source.enabled && source.focusAreas?.some((area) => domainSchedule.focusAreas?.includes(area))).length;
  const metrics = [
    { label: "AI 行业任务", value: schedule.enabled ? "ON" : "OFF", hint: `${enabledSources} 个来源` },
    { label: "业务领域任务", value: domainSchedule.enabled ? "ON" : "OFF", hint: `${enabledDomainSources} 个匹配来源` },
    { label: "今日总产出", value: String((latestBrief?.items.length ?? 0) + (domainBrief?.items.length ?? 0)), hint: "两个独立快照" },
    { label: "最近更新", value: latestBrief || domainBrief ? dateTimeFormatter.format(new Date(Math.max(Date.parse(latestBrief?.generatedAt ?? "1970-01-01"), Date.parse(domainBrief?.generatedAt ?? "1970-01-01")))) : "—", hint: "Asia/Shanghai" },
  ];

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="Collector workflow monitor" title="采集任务" description="分别管理 AI 行业与业务领域每日采集，设置关注范围并查看真实产出状态。" />
      <MetricStrip metrics={metrics} />
      <CollectorTaskControls schedule={schedule} editable={editable} enabledSources={enabledSources} track="technical" title="AI 行业情报每日采集" />
      <CollectorTaskControls schedule={domainSchedule} editable={editable} enabledSources={enabledDomainSources} track="domain" title="业务领域情报每日采集" availableFocusAreas={domainFocusAreaOptions} />
      {latestBrief ? <LastRun brief={latestBrief} title="AI 行业情报" /> : null}
      {domainBrief ? <LastRun brief={domainBrief} title="业务领域情报" /> : null}
      <p className="page-footnote">两个任务分别写入独立快照；GitHub Actions 只有合并到默认分支后才会按各自时间执行。</p>
    </div>
  );
}
