import assert from "node:assert/strict";
import test from "node:test";

import { enrichBriefWithChineseOverview } from "./chinese-overview";
import { buildDailyIntelligenceBrief } from "./daily-brief";
import type { CollectorRunResult } from "./types";

const result: CollectorRunResult = {
  startedAt: "2026-08-08T00:00:00.000Z",
  finishedAt: "2026-08-08T01:00:00.000Z",
  sources: [],
  signals: [{
    id: "SIG-1",
    fingerprint: "one",
    canonicalUrl: "https://example.com/one",
    collectedAt: "2026-08-08T01:00:00.000Z",
    sourceId: "github-trending",
    sourceName: "GitHub Trending",
    sourceType: "scrape",
    track: "technical",
    category: "github-trending",
    trustTier: "community",
    title: "example/agent",
    url: "https://example.com/one",
    excerpt: "An agent tool",
    publishedAt: null,
    rank: 1,
    metadata: {},
  }],
};

test("adds a Chinese overview to newly collected signals", () => {
  const enriched = enrichBriefWithChineseOverview(buildDailyIntelligenceBrief(result));
  assert.ok(enriched.items[0]?.titleZh);
  assert.match(enriched.items[0]?.summaryZh ?? "", /开源项目/);
  assert.doesNotMatch(enriched.items[0]?.summaryZh ?? "", /入选|排名/);
  assert.equal(enriched.items[0]?.translationStatus, "generated");
});

test("preserves reviewed Chinese content on repeated collection", () => {
  const brief = buildDailyIntelligenceBrief(result);
  const previous = {
    ...brief,
    items: brief.items.map((item) => ({ ...item, titleZh: "人工标题", summaryZh: "人工摘要", translationStatus: "reviewed" as const })),
  };
  const enriched = enrichBriefWithChineseOverview(brief, previous);
  assert.equal(enriched.items[0]?.titleZh, "人工标题");
  assert.equal(enriched.items[0]?.translationStatus, "reviewed");
});
