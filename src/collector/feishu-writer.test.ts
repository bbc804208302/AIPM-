import assert from "node:assert/strict";
import test from "node:test";

import { mapCandidateToFeishuFields } from "./feishu-writer";
import type { IntelligenceCandidate } from "./types";

test("maps an AI coding signal into the existing Feishu schema", () => {
  const signal: IntelligenceCandidate = {
    id: "SIG-20260808-ABC12345",
    fingerprint: "abc12345",
    canonicalUrl: "https://github.com/openai/example",
    collectedAt: "2026-08-08T08:00:00.000Z",
    sourceId: "github-trending",
    sourceName: "GitHub Trending",
    sourceType: "scrape",
    track: "technical",
    category: "github-trending",
    trustTier: "community",
    title: "openai/coding-agent",
    url: "https://github.com/openai/example",
    excerpt: "An agentic coding tool for developers",
    publishedAt: null,
    rank: 1,
    metadata: {},
  };

  const fields = mapCandidateToFeishuFields(signal);
  assert.equal(fields["情报类型"], "AI Agent");
  assert.equal(fields["来源类型"], "社区");
  assert.deepEqual(fields["关注领域"], ["AI Agent", "AI Coding"]);
  assert.deepEqual(fields["原文链接"], { link: signal.canonicalUrl, text: "查看原文" });
});
