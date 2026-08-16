import Link from "next/link";

import type { CollectorCategory, CollectorTrack } from "@/collector/types";

const trackLabels: Record<CollectorTrack, string> = { technical: "AI 行业情报", domain: "业务领域情报" };
const sourceLabels: Record<CollectorCategory | "all", string> = {
  all: "全部来源",
  "github-trending": "GitHub Trending",
  "ai-media": "AI 媒体",
  "x-viral": "X 动态",
};

export type IntelligencePoolView = "admitted" | "review";

export function IntelligenceFilters({
  track,
  sourceGroup,
  view,
  admittedCount,
  reviewCount,
}: Readonly<{
  track: CollectorTrack;
  sourceGroup: CollectorCategory | "all";
  view: IntelligencePoolView;
  admittedCount: number;
  reviewCount: number;
}>) {
  const viewSuffix = view === "review" ? "&view=review" : "";
  return (
    <div className="intelligence-filter-stack">
      <nav className="track-tabs" aria-label="情报类型">
        {(Object.keys(trackLabels) as CollectorTrack[]).map((value) => (
          <Link className={track === value ? "active" : ""} href={`/intelligence?track=${value}${viewSuffix}`} key={value} aria-current={track === value ? "page" : undefined}>
            {trackLabels[value]}
          </Link>
        ))}
      </nav>
      {track === "technical" ? (
        <nav className="source-filter-tabs" aria-label="AI 行业情报来源">
          {(Object.keys(sourceLabels) as (CollectorCategory | "all")[]).map((value) => (
            <Link className={sourceGroup === value ? "active" : ""} href={`/intelligence?track=technical${value === "all" ? "" : `&source=${value}`}${viewSuffix}`} key={value}>
              {sourceLabels[value]}
            </Link>
          ))}
        </nav>
      ) : null}
      <nav className="intelligence-admission-tabs" aria-label="Agent 准入状态">
        <Link className={view === "admitted" ? "active" : ""} href={`/intelligence?track=${track}${sourceGroup === "all" || track === "domain" ? "" : `&source=${sourceGroup}`}`}>
          Agent 已入选 <span>{admittedCount}</span>
        </Link>
        <Link className={view === "review" ? "active" : ""} href={`/intelligence?track=${track}${sourceGroup === "all" || track === "domain" ? "" : `&source=${sourceGroup}`}&view=review`}>
          待审候选 <span>{reviewCount}</span>
        </Link>
      </nav>
    </div>
  );
}
