import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state/empty-state";
import { IntelligenceBriefList } from "@/components/intelligence/intelligence-brief-list";
import { IntelligenceFilters } from "@/components/intelligence/intelligence-filters";
import { PageHeader } from "@/components/workspace/page-header";
import type { CollectorCategory, CollectorTrack } from "@/collector/types";
import { loadIntelligenceWorkspace } from "@/services/load-intelligence-workspace";

export const metadata: Metadata = { title: "AI 产品情报池 · SignalFlow" };
export const dynamic = "force-dynamic";

const sourceGroups = new Set<CollectorCategory>(["github-trending", "ai-media", "x-viral"]);
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});
const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface PageProps {
  searchParams: Promise<{ track?: string; source?: string; date?: string }>;
}

export default async function IntelligencePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const track: CollectorTrack = query.track === "domain" ? "domain" : "technical";
  const sourceGroup: CollectorCategory | "all" = sourceGroups.has(query.source as CollectorCategory) ? query.source as CollectorCategory : "all";
  const { brief, state, focusAreas } = await loadIntelligenceWorkspace(track, query.date);
  const items = brief?.items.filter((item) => sourceGroup === "all" || item.sourceGroup === sourceGroup) ?? [];

  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="Product intelligence workspace"
        title="AI 产品情报池"
        description="聚合 AI 行业与业务领域变化，将每天值得关注的公开 Signal 收敛为产品情报。"
      />
      <IntelligenceFilters track={track} sourceGroup={sourceGroup} />
      {track === "domain" ? (
        <section className="domain-focus-summary" aria-label="已选择的业务领域">
          <div><span>SELECTED BUSINESS DOMAINS</span><strong>当前关注业务领域</strong></div>
          <div>{focusAreas.map((area) => <span key={area}>{area}</span>)}</div>
        </section>
      ) : null}
      {brief ? (
        <section className="today-brief-banner" aria-label="今日情报日期">
          <div>
            <span>{track === "domain" ? "BUSINESS DOMAIN INTELLIGENCE" : "TODAY'S BRIEF / ASIA·SHANGHAI"}</span>
            <strong>{track === "domain" ? "业务领域情报" : "今日 AI 行业情报"}</strong>
          </div>
          <div className="today-date">
            <strong>{dateFormatter.format(new Date(`${brief.briefingDate}T00:00:00+08:00`))}</strong>
            <span>{track === "domain" ? brief.sources.length > 0 ? `${brief.sources.length} 个来源 · 自动采集` : "已接入领域情报快照" : `最后更新 ${timeFormatter.format(new Date(brief.generatedAt))}`}</span>
          </div>
        </section>
      ) : null}
      {items.length > 0 ? <IntelligenceBriefList items={items} /> : (
        <section className="intelligence-empty-panel">
          <EmptyState
            title={state === "error" ? "情报快照暂时不可用" : track === "domain" ? "暂无业务领域情报" : sourceGroup === "all" ? "今日情报尚未生成" : "当前来源暂无入选情报"}
            description={state === "error"
              ? "请检查 SignalFlow Intelligence Repository 的快照文件。"
              : track === "domain"
                ? <>当前未找到业务领域快照，请检查 Intelligence Repository。</>
                : <>在采集任务中点击“立即采集”，系统会从启用的公开来源生成今日 Top 10。</>}
            meta={track === "domain" ? "DOMAIN INTELLIGENCE · NO SNAPSHOT" : "SIGNALFLOW REPOSITORY · NO SNAPSHOT"}
          />
        </section>
      )}
      <p className="page-footnote">情报由 SignalFlow 自有 Repository 提供；标题、摘要和热度均保留来源证据，当前不执行运行时 LLM 分析。</p>
    </div>
  );
}
