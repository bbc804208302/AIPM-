import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createFileOpportunityAgentRepository } from "./file-opportunity-agent-repository";
import type { OpportunityAgentRun, OpportunityTriageRun } from "@/types/agent";

const run: OpportunityAgentRun = {
  id: "RUN-1", agent: "product-opportunity-agent", version: 1, signalId: "SIG-1", signalTitle: "Agent 质量工具", track: "technical", objective: "评估产品机会", status: "completed", decision: "proposal", decisionSummary: "为产品经理提供 Agent 运行诊断", model: "test-model", startedAt: "2026-08-16T00:00:00.000Z", completedAt: "2026-08-16T00:00:01.000Z", durationMs: 1000, toolCalls: [], memoryMatches: [], proposal: { id: "PROP-1", title: "Agent 运行诊断", problem: "失败不可见", targetUser: "AI 产品经理", opportunity: "解释运行失败", suggestedSolution: "轨迹和 badcase", rationale: "来自公开情报", priority: "high", sourceSignalId: "SIG-1", approvalStatus: "pending-human-review" }, error: null,
};

const triageRun: OpportunityTriageRun = {
  id: "TRIAGE-1", agent: "product-opportunity-agent", mode: "daily-triage", version: 2,
  briefingDate: "2026-08-16", objective: "推荐机会", status: "completed", model: "test-model",
  startedAt: "2026-08-16T01:00:00.000Z", completedAt: "2026-08-16T01:00:02.000Z", durationMs: 2000,
  scannedSignals: 1, candidates: [], recommendedSignalIds: [], decisionSummary: "暂无高价值机会", toolCalls: [], error: null,
};

test("persists Agent runs and recalls matching decisions", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "signalflow-agent-"));
  const repository = createFileOpportunityAgentRepository(path.join(directory, "runs.json"));

  await repository.saveRun(run);
  await repository.saveTriageRun(triageRun);

  assert.equal((await repository.listRuns())[0]?.id, "RUN-1");
  assert.equal((await repository.listTriageRuns())[0]?.id, "TRIAGE-1");
  const matches = await repository.searchMemory("Agent 运行", "SIG-OTHER");
  assert.equal(matches[0]?.decision, "proposal");
  assert.equal(matches[0]?.summary, "解释运行失败");
  assert.equal((await repository.searchMemory("Agent", "SIG-1")).length, 0);
});

test("keeps the bundled production memory read-only", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");
  try {
    const repository = createFileOpportunityAgentRepository("/tmp/should-not-be-read.json");
    assert.ok(Array.isArray(await repository.listRuns()));
    assert.ok(Array.isArray(await repository.listTriageRuns()));
    await assert.rejects(repository.saveRun(run), /公开环境不允许写入 Agent Memory/);
    await assert.rejects(repository.saveTriageRun(triageRun), /公开环境不允许写入 Agent Memory/);
  } finally {
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
  }
});
