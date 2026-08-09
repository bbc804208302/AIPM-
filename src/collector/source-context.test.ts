import assert from "node:assert/strict";
import test from "node:test";

import { enrichBriefWithSourceContext } from "./source-context";
import type { DailyIntelligenceBrief } from "@/types/intelligence";

const brief: DailyIntelligenceBrief = {
  schemaVersion: 1, briefingDate: "2026-08-09", timezone: "Asia/Shanghai", track: "technical", generatedAt: "2026-08-09T01:00:00.000Z", candidateCount: 1, dailyLimit: 10, sources: [],
  items: [{ id: "SIG-1", briefingDate: "2026-08-09", track: "technical", title: "example/agent", sourceId: "github-trending", source: "GitHub Trending", sourceGroup: "github-trending", sourceType: "scrape", trustTier: "community", category: "agent", summary: "An agent", url: "https://example.com/agent", publishedAt: null, collectedAt: "2026-08-09T01:00:00.000Z", sourceRank: 1, sourceMetadata: {}, selectionReason: "GitHub Trending 今日排名 #1", impactScore: null, noveltyScore: null, productInsight: null, createdAt: "2026-08-09T01:00:00.000Z", highValue: false, readStatus: "未读", convertedToDemand: false }],
};

test("adds auditable page description context before LLM review", async () => {
  const fetcher = async () => new Response('<html><head><meta name="description" content="A private personal AI assistant for long-running autonomous work."></head></html>', { status: 200, headers: { "content-type": "text/html" } });
  const enriched = await enrichBriefWithSourceContext(brief, fetcher as typeof fetch);
  assert.match(String(enriched.items[0]?.sourceMetadata.pageDescription), /private personal AI assistant/);
});
