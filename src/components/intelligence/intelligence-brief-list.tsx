import { ArrowUpRight, CalendarDays, Flame, Github, Newspaper, Radio } from "lucide-react";

import type { CollectorCategory } from "@/collector/types";
import { calculatePublicHeatScore } from "@/collector/heat-score";
import { AgentDeepAnalysisButton } from "@/components/agent/agent-deep-analysis-button";
import { OpportunityScoreRing } from "@/components/intelligence/opportunity-score-ring";
import { presentAsIntelligence } from "@/lib/intelligence/presentation";
import type { IntelligenceCategory, IntelligenceSignal } from "@/types/intelligence";

const sourceGroupLabels: Record<CollectorCategory, string> = {
  "github-trending": "GitHub Trending",
  "ai-media": "AI 媒体",
  "x-viral": "X 动态",
};
const categoryLabels: Record<IntelligenceCategory, string> = {
  "model-capability": "模型能力",
  agent: "AI Agent",
  "ai-coding": "AI Coding",
  multimodal: "AIGC / 多模态",
  product: "产品动态",
  interaction: "产品交互",
  "business-model": "商业模式",
  other: "行业动态",
};
const sourceIcons = { "github-trending": Github, "ai-media": Newspaper, "x-viral": Radio } satisfies Record<CollectorCategory, typeof Github>;
const pmValueLabels = {
  "product-idea": "产品创意",
  "design-pattern": "设计思路",
  competitor: "竞品动态",
  capability: "能力变化",
  "business-opportunity": "业务机会",
  "industry-context": "行业判断",
} as const;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const numberFormatter = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });

function metadataEntries(item: IntelligenceSignal): readonly string[] {
  const entries: string[] = [];
  const metadata = item.sourceMetadata;
  if (typeof metadata.topic === "string" && metadata.topic) entries.push(metadata.topic);
  if (typeof metadata.language === "string" && metadata.language) entries.push(metadata.language);
  if (typeof metadata.starsToday === "string" && metadata.starsToday) entries.push(metadata.starsToday);
  if (typeof metadata.author === "string" && metadata.author) entries.push(metadata.author);
  for (const [key, label] of [["views", "浏览"], ["likes", "喜欢"], ["reposts", "转发"]] as const) {
    const value = metadata[key];
    if (typeof value === "number" && value > 0) entries.push(`${label} ${numberFormatter.format(value)}`);
  }
  return entries;
}

export function IntelligenceBriefList({ items, agentExecutable }: Readonly<{ items: readonly IntelligenceSignal[]; agentExecutable: boolean }>) {
  return (
    <ol className="intelligence-brief-list" aria-label="今日重点情报">
      {items.map((item, index) => {
        const Icon = sourceIcons[item.sourceGroup];
        const metadata = metadataEntries(item);
        const sourceGroupLabel = item.track === "domain" ? "业务领域" : sourceGroupLabels[item.sourceGroup];
        const title = item.titleZh || item.title;
        const summary = item.summaryZh || item.summary;
        const heatScore = item.heatScore ?? calculatePublicHeatScore(item.sourceGroup, item.sourceMetadata);
        return (
          <li className={`intelligence-story story-${item.sourceGroup}`} key={item.id}>
            <div className="story-index">{String(index + 1).padStart(2, "0")}</div>
            <article>
              {typeof item.agentReview?.opportunityScore === "number" ? <OpportunityScoreRing score={item.agentReview.opportunityScore} /> : null}
              <div className="story-meta-line">
                <span className="story-source-group"><Icon size={14} />{sourceGroupLabel}</span>
                <span>{item.source}</span>
                <span>{categoryLabels[item.category]}</span>
                {item.translationStatus === "reviewed" ? <span>中文审校</span> : item.translationStatus === "llm-reviewed" ? <span>LLM 审校</span> : item.translationStatus === "generated" ? <span>中文概述</span> : item.translationStatus === "needs-review" ? <span>待审校</span> : null}
                {typeof heatScore === "number" ? <span className="story-heat"><Flame size={12} />公开热度 {heatScore}</span> : item.track === "technical" ? <span className="story-heat-empty">暂无公开热度</span> : null}
                {typeof item.agentReview?.opportunityScore !== "number" ? <span>等待 Agent 评分</span> : null}
              </div>
              <h2>{title}</h2>
              {item.titleZh && item.titleZh !== item.title ? <p className="story-original-title">{item.title}</p> : null}
              <div className="story-ai-overview">
                <span>AI 概述</span>
                <p className="story-summary">{summary || "该来源未提供可展示摘要，请通过原文链接核对完整信息。"}</p>
              </div>
              {item.agentReview?.rationale ? <div className="story-agent-rationale"><span>PM 价值{item.agentReview.pmValueType ? ` · ${pmValueLabels[item.agentReview.pmValueType]}` : ""}</span><p>{presentAsIntelligence(item.agentReview.rationale)}</p></div> : null}
              {item.agentReview?.deepAnalysisSummary ? <div className="story-deep-analysis"><span>{item.agentReview.deepAnalysis === "proposal" ? "深度分析 · 形成候选需求" : "深度分析 · 暂不转化"}</span><p>{presentAsIntelligence(item.agentReview.deepAnalysisSummary)}</p></div> : null}
              <div className="story-footer">
                <div className="story-facts">
                  <span>{presentAsIntelligence(item.selectionReason)}</span>
                  {item.publishedAt ? <span><CalendarDays size={12} />{dateFormatter.format(new Date(item.publishedAt))}</span> : null}
                  {metadata.map((entry) => <span key={entry}>{entry}</span>)}
                </div>
                <div className="story-actions">
                  <AgentDeepAnalysisButton signalId={item.id} disabled={!agentExecutable || item.agentReview?.deepAnalysis !== "not-run"} />
                  <a href={item.url} target="_blank" rel="noreferrer">查看原文 <ArrowUpRight size={14} /></a>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
