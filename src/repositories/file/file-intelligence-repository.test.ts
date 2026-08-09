import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createFileIntelligenceRepository } from "./file-intelligence-repository";
import type { DailyIntelligenceBrief } from "@/types/intelligence";

test("stores versioned and latest daily intelligence snapshots", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "signalflow-intelligence-"));
  const repository = createFileIntelligenceRepository(directory);
  const brief: DailyIntelligenceBrief = {
    schemaVersion: 1,
    briefingDate: "2026-08-08",
    timezone: "Asia/Shanghai",
    track: "technical",
    generatedAt: "2026-08-08T00:17:00.000Z",
    candidateCount: 1,
    dailyLimit: 10,
    sources: [],
    items: [{
      id: "SIG-1", briefingDate: "2026-08-08", track: "technical", title: "First signal", sourceId: "source", source: "Source", sourceGroup: "ai-media", sourceType: "rss", trustTier: "curated", category: "product", summary: "Summary", url: "https://example.com/first", publishedAt: "2026-08-08T00:00:00.000Z", collectedAt: "2026-08-08T00:17:00.000Z", sourceRank: null, sourceMetadata: {}, selectionReason: "Recent", impactScore: null, noveltyScore: null, productInsight: null, createdAt: "2026-08-08T00:17:00.000Z", highValue: false, readStatus: "未读", convertedToDemand: false,
    }],
  };

  await repository.saveBrief(brief);
  assert.deepEqual(await repository.getLatestBrief("technical"), brief);
  assert.deepEqual(await repository.getBrief("technical", "2026-08-08"), brief);
  assert.deepEqual(await repository.getSeenItems("technical"), [{ url: "https://example.com/first", title: "First signal" }]);
  assert.deepEqual(await repository.getSeenItems("domain"), []);

  const secondBrief: DailyIntelligenceBrief = {
    ...brief,
    generatedAt: "2026-08-08T01:17:00.000Z",
    items: [{ ...brief.items[0]!, id: "SIG-2", title: "Second signal", url: "https://example.com/second" }],
  };
  await repository.saveBrief(secondBrief);
  assert.deepEqual(await repository.getSeenItems("technical"), [
    { url: "https://example.com/first", title: "First signal" },
    { url: "https://example.com/second", title: "Second signal" },
  ]);
});
