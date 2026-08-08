import assert from "node:assert/strict";
import test from "node:test";

import { buildDailyIntelligenceBrief } from "./daily-brief";
import type { CollectorCategory, CollectorRunResult, IntelligenceCandidate } from "./types";

function candidate(category: CollectorCategory, index: number): IntelligenceCandidate {
  return {
    id: `SIG-${category}-${index}`,
    fingerprint: `${category}-${index}`,
    canonicalUrl: `https://example.com/${category}/${index}`,
    collectedAt: "2026-08-08T00:17:00.000Z",
    sourceId: `${category}-${index}`,
    sourceName: category,
    sourceType: category === "ai-media" ? "rss" : "api",
    track: "technical",
    category,
    trustTier: category === "ai-media" && index === 1 ? "primary" : "curated",
    title: `Signal ${category} ${index}`,
    url: `https://example.com/${category}/${index}`,
    excerpt: "Verified source excerpt",
    publishedAt: `2026-08-0${Math.min(index, 8)}T00:00:00.000Z`,
    rank: index,
    metadata: {},
  };
}

test("builds a Shanghai-dated top ten with source diversity", () => {
  const categories: readonly CollectorCategory[] = ["ai-media", "github-trending", "x-viral"];
  const result: CollectorRunResult = {
    startedAt: "2026-08-07T23:59:00.000Z",
    finishedAt: "2026-08-08T00:17:00.000Z",
    signals: categories.flatMap((category) => Array.from({ length: 8 }, (_, index) => candidate(category, index + 1))),
    sources: [],
  };

  const brief = buildDailyIntelligenceBrief(result);
  assert.equal(brief.briefingDate, "2026-08-08");
  assert.equal(brief.items.length, 10);
  assert.equal(brief.items.filter((item) => item.sourceGroup === "ai-media").length, 4);
  assert.equal(brief.items.filter((item) => item.sourceGroup === "github-trending").length, 4);
  assert.equal(brief.items.filter((item) => item.sourceGroup === "x-viral").length, 2);
});

test("builds an independent business-domain brief", () => {
  const signal = { ...candidate("ai-media", 1), track: "domain" as const };
  const result: CollectorRunResult = {
    startedAt: "2026-08-08T00:00:00.000Z",
    finishedAt: "2026-08-08T01:00:00.000Z",
    signals: [signal],
    sources: [],
  };
  const brief = buildDailyIntelligenceBrief(result, { track: "domain" });
  assert.equal(brief.track, "domain");
  assert.equal(brief.items.length, 1);
  assert.match(brief.items[0]?.selectionReason ?? "", /业务领域/);
});
