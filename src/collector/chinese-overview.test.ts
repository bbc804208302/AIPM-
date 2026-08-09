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

test("creates a fact-based Chinese overview for a known domain signal", () => {
  const brief = buildDailyIntelligenceBrief({
    ...result,
    signals: [{
      ...result.signals[0],
      id: "SIG-DOMAIN-1",
      track: "domain",
      sourceId: "google-news-microdrama",
      sourceName: "Google News · Microdrama",
      title: "Microdrama platform on track to earn $1B",
      excerpt: "Microdrama platform on track to earn $1B - KTLA",
    }],
  }, { track: "domain" });
  const item = enrichBriefWithChineseOverview(brief).items[0];
  assert.match(item?.titleZh ?? "", /10 亿美元/);
  assert.match(item?.summaryZh ?? "", /商业化规模/);
  assert.doesNotMatch(item?.summaryZh ?? "", /发布了一则/);
  assert.equal(item?.translationStatus, "generated");
});

test("marks domain signals with only a repeated headline for review", () => {
  const brief = buildDailyIntelligenceBrief({
    ...result,
    signals: [{
      ...result.signals[0],
      id: "SIG-DOMAIN-2",
      track: "domain",
      sourceId: "google-news-microdrama",
      sourceName: "Google News · Microdrama",
      title: "A short and ambiguous domain headline",
      excerpt: "A short and ambiguous domain headline",
    }],
  }, { track: "domain" });
  const item = enrichBriefWithChineseOverview(brief).items[0];
  assert.match(item?.titleZh ?? "", /待审校/);
  assert.match(item?.summaryZh ?? "", /无法可靠生成中文说明/);
  assert.equal(item?.translationStatus, "needs-review");
});
