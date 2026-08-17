import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createFileAgentEvaluationRepository } from "./file-agent-evaluation-repository";
import type { AgentEvaluationResult } from "@/types/agent-evaluation";

const result: AgentEvaluationResult = {
  id: "EVAL-1",
  schemaVersion: 1,
  datasetVersion: "dataset-v1",
  agentRunId: "TRIAGE-1",
  model: "test-model",
  promptVersion: "prompt-v1",
  strategyVersion: "strategy-v1",
  evaluatedAt: "2026-08-17T00:00:00.000Z",
  metrics: {
    evaluatedCases: 1,
    taskCompletionRate: 100,
    structuredOutputSuccessRate: 100,
    summaryFactCoverageRate: 100,
    pmValueClassificationAccuracy: 100,
    scoreAgreementRate: 100,
    deepAnalysisDecisionAgreement: 100,
    humanCorrectionRate: 0,
    overallQualityScore: 100,
  },
  badcases: [],
};

test("persists versioned Agent Eval results", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "signalflow-agent-eval-"));
  const repository = createFileAgentEvaluationRepository(path.join(directory, "results.json"));

  await repository.saveResult(result);

  assert.equal((await repository.listResults())[0]?.id, result.id);
});

test("keeps bundled Agent Eval results read-only in production", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");
  try {
    const repository = createFileAgentEvaluationRepository("/tmp/should-not-be-read-agent-eval.json");
    const results = await repository.listResults();
    assert.ok(Array.isArray(results));
    assert.equal(results.some((item) => item.status === "invalid"), false);
    await assert.rejects(repository.saveResult(result), /公开环境不允许写入 Agent Eval/);
  } finally {
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
  }
});
