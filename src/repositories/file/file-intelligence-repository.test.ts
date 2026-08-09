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
    items: [],
  };

  await repository.saveBrief(brief);
  assert.deepEqual(await repository.getLatestBrief("technical"), brief);
  assert.deepEqual(await repository.getBrief("technical", "2026-08-08"), brief);
  assert.deepEqual(await repository.listBriefs("technical"), [brief]);
  assert.deepEqual(await repository.listBriefs("domain"), []);
});
