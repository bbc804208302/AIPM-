import assert from "node:assert/strict";
import test from "node:test";

import { curateIntelligenceCandidates } from "./pipeline";
import type { IntelligenceCandidate } from "./types";

function mediaCandidate(index: number, publishedAt: string): IntelligenceCandidate {
  return {
    id: `SIG-${index}`,
    fingerprint: `fingerprint-${index}`,
    canonicalUrl: `https://example.com/${index}`,
    collectedAt: "2026-08-17T00:00:00.000Z",
    sourceId: "product-release-feed",
    sourceName: "Product Release Feed",
    sourceType: "rss",
    track: "technical",
    category: "ai-media",
    trustTier: "primary",
    title: `AI product ${index}`,
    url: `https://example.com/${index}`,
    excerpt: "A concrete AI product release.",
    publishedAt,
    rank: index,
    metadata: {},
  };
}

test("keeps AI media candidates across the declared fifteen-day window", () => {
  const current = mediaCandidate(1, "2026-08-16T00:00:00.000Z");
  const tenDaysOld = mediaCandidate(2, "2026-08-07T00:00:00.000Z");
  const sixteenDaysOld = mediaCandidate(3, "2026-08-01T23:59:59.000Z");

  const curated = curateIntelligenceCandidates(
    [current, tenDaysOld, sixteenDaysOld],
    "2026-08-17T00:00:00.000Z",
  );

  assert.deepEqual(curated.map((item) => item.id), [current.id, tenDaysOld.id]);
});

test("retains enough media candidates for the twenty-item Agent cap after deduplication", () => {
  const candidates = Array.from({ length: 40 }, (_, index) =>
    mediaCandidate(index + 1, `2026-08-${String(16 - Math.floor(index / 4)).padStart(2, "0")}T00:00:00.000Z`),
  );

  assert.equal(curateIntelligenceCandidates(candidates, "2026-08-17T00:00:00.000Z").length, 40);
});
