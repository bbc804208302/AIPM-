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
    publishedAt: "2026-08-08T00:00:00.000Z",
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

test("keeps the latest fifteen Shanghai calendar days while retaining the live GitHub ranking", () => {
  const currentRss = candidate("ai-media", 1);
  const recentRss = { ...candidate("ai-media", 2), publishedAt: "2026-07-25T16:00:00.000Z" };
  const oldX = { ...candidate("x-viral", 1), publishedAt: "2026-07-24T15:59:59.000Z" };
  const githubWithoutTimestamp = { ...candidate("github-trending", 1), publishedAt: null };
  const result: CollectorRunResult = {
    startedAt: "2026-08-08T00:00:00.000Z",
    finishedAt: "2026-08-08T02:00:00.000Z",
    signals: [currentRss, recentRss, oldX, githubWithoutTimestamp],
    sources: [],
  };

  const brief = buildDailyIntelligenceBrief(result);
  assert.deepEqual(brief.items.map((item) => item.id).sort(), [currentRss.id, recentRss.id, githubWithoutTimestamp.id].sort());
  assert.equal(brief.candidateCount, 3);
});

test("prioritizes concrete product releases over newer corporate news", () => {
  const acquisition = { ...candidate("ai-media", 1), title: "Company acquires AI startup", excerpt: "Acquisition and funding news", publishedAt: "2026-08-08T01:00:00.000Z" };
  const productRelease = { ...candidate("ai-media", 2), title: "New agent tool launched", excerpt: "A workflow product with a new plugin and API", publishedAt: "2026-08-07T01:00:00.000Z" };
  const result: CollectorRunResult = {
    startedAt: "2026-08-08T00:00:00.000Z",
    finishedAt: "2026-08-08T02:00:00.000Z",
    signals: [acquisition, productRelease],
    sources: [],
  };

  const brief = buildDailyIntelligenceBrief(result, { dailyLimit: 1 });
  assert.equal(brief.items[0]?.id, productRelease.id);
  assert.match(brief.items[0]?.selectionReason ?? "", /近 15 日/);
});

test("excludes URLs and normalized titles already saved in any previous snapshot", () => {
  const repeatedByUrl = candidate("ai-media", 1);
  const repeatedByTitle = { ...candidate("x-viral", 2), title: "Previously Seen: AI Tool!" };
  const unseen = candidate("github-trending", 3);
  const historicalItems = [
    buildDailyIntelligenceBrief({ startedAt: "2026-08-07T00:00:00.000Z", finishedAt: "2026-08-07T01:00:00.000Z", signals: [{ ...repeatedByUrl, publishedAt: "2026-08-07T00:00:00.000Z" }], sources: [] }).items[0]!,
    buildDailyIntelligenceBrief({ startedAt: "2026-08-08T00:00:00.000Z", finishedAt: "2026-08-08T01:00:00.000Z", signals: [{ ...repeatedByTitle, title: "Previously seen — AI tool" }], sources: [] }).items[0]!,
  ];
  const result: CollectorRunResult = {
    startedAt: "2026-08-08T00:00:00.000Z",
    finishedAt: "2026-08-08T01:00:00.000Z",
    signals: [repeatedByUrl, repeatedByTitle, unseen],
    sources: [],
  };

  const brief = buildDailyIntelligenceBrief(result, { historicalItems });
  assert.deepEqual(brief.items.map((item) => item.id), [unseen.id]);
  assert.equal(brief.candidateCount, 1);
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
