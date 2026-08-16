import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state/empty-state";
import { IntelligenceBriefList } from "@/components/intelligence/intelligence-brief-list";
import { IntelligenceFilters } from "@/components/intelligence/intelligence-filters";
import type { IntelligencePoolView } from "@/components/intelligence/intelligence-filters";
import { PageHeader } from "@/components/workspace/page-header";
import type { CollectorCategory, CollectorTrack } from "@/collector/types";
import { loadIntelligenceWorkspace } from "@/services/load-intelligence-workspace";
import { sortIntelligenceByOpportunity } from "@/services/project-agent-intelligence";
import { readOpportunityAgentConfig } from "@/agent/opportunity-agent";
import { isOpportunityAgentExecutable } from "@/agent/runtime";

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
  searchParams: Promise<{ track?: string; source?: string; date?: string; view?: string }>;
}

export default async function IntelligencePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const track: CollectorTrack = query.track === "domain" ? "domain" : "technical";
  const view: IntelligencePoolView = query.view === "review" ? "review" : "admitted";
  const sourceGroup: CollectorCategory | "all" = sourceGroups.has(query.source as CollectorCategory) ? query.source as CollectorCategory : "all";
  const { brief, state, focusAreas, agentReviewed, admittedCount, reviewCount } = await loadIntelligenceWorkspace(track, query.date);
  const items = sortIntelligenceByOpportunity(brief?.items.filter((item) => {
    const matchesSource = sourceGroup === "all" || item.sourceGroup === sourceGroup;
    const matchesAdmission = view === "review" ? item.agentReview?.status === "review" : item.agentReview?.status !== "review";
    return matchesSource && matchesAdmission;
  }) ?? []);
  const agentExecutable = isOpportunityAgentExecutable() && readOpportunityAgentConfig() !== null;

  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="Product intelligence workspace"
        title="AI 产品情报池"
        description="由 Agent 从公开候选中判断产品价值，动态准入值得 AI 产品经理关注的情报。"
      />
      <IntelligenceFilters track={track} sourceGroup={sourceGroup} view={view} admittedCount={admittedCount} reviewCount={reviewCount} />
      <section className="intelligence-agent-gate" aria-label="Agent 情报准入说明">
        <div><span>AGENT ADMISSION GATE</span><strong>{agentReviewed ? "本批候选已完成 Agent 初筛" : "等待 Agent 初筛"}</strong></div>
        <p>{agentReviewed ? `动态准入 ${admittedCount} 条，${reviewCount} 条进入待审候选；70 分以上每天最多自动深度分析 3 条。` : "当前先展示采集候选；Agent 运行后会补充中文概述、机会评分与准入状态。"}</p>
      </section>
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
            <span>最后更新 {timeFormatter.format(new Date(brief.generatedAt))}</span>
          </div>
        </section>
      ) : null}
      {items.length > 0 ? <IntelligenceBriefList items={items} agentExecutable={agentExecutable} /> : (
        <section className="intelligence-empty-panel">
          <EmptyState
            title={state === "error" ? "情报快照暂时不可用" : view === "review" ? "暂无待审候选" : track === "domain" ? "暂无业务领域情报" : sourceGroup === "all" ? "今日情报尚未生成" : "当前来源暂无入选情报"}
            description={state === "error"
              ? "请检查 SignalFlow Intelligence Repository 的快照文件。"
              : track === "domain"
                ? <>当前未找到业务领域快照，请检查 Intelligence Repository。</>
                : <>在采集任务中点击“立即采集”，系统会准备候选并由 Agent 动态决定准入结果。</>}
            meta={track === "domain" ? "DOMAIN INTELLIGENCE · NO SNAPSHOT" : "SIGNALFLOW REPOSITORY · NO SNAPSHOT"}
          />
        </section>
      )}
      <p className="page-footnote">Agent 评分用于辅助产品判断，不等同于事实可信度；中文概述只基于公开来源证据生成，正式需求仍由产品经理确认。</p>
    </div>
  );
}
