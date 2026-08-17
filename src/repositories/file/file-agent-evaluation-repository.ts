import fs from "node:fs/promises";
import path from "node:path";

import bundledResults from "../../../data/agent/evaluation/results.json";
import { isProductionAgentRuntime } from "@/agent/runtime";
import type { AgentEvaluationResult, AgentEvaluationResultIndex } from "@/types/agent-evaluation";

const maximumResults = 30;

async function readIndex(filePath: string): Promise<AgentEvaluationResultIndex> {
  if (isProductionAgentRuntime()) return bundledResults as AgentEvaluationResultIndex;
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as AgentEvaluationResultIndex;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { schemaVersion: 1, updatedAt: null, results: [] };
    }
    throw error;
  }
}

export function createFileAgentEvaluationRepository(
  filePath = path.join(process.cwd(), "data", "agent", "evaluation", "results.json"),
) {
  return {
    async listResults(): Promise<readonly AgentEvaluationResult[]> {
      const index = await readIndex(filePath);
      return index.results
        .filter((result) => result.status !== "invalid")
        .toSorted((left, right) => right.evaluatedAt.localeCompare(left.evaluatedAt));
    },
    async saveResult(result: AgentEvaluationResult): Promise<void> {
      if (isProductionAgentRuntime()) throw new Error("公开环境不允许写入 Agent Eval 结果。");
      const index = await readIndex(filePath);
      const results = [result, ...index.results.filter((candidate) => candidate.id !== result.id)].slice(0, maximumResults);
      const nextIndex: AgentEvaluationResultIndex = { schemaVersion: 1, updatedAt: result.evaluatedAt, results };
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(nextIndex, null, 2)}\n`, "utf8");
    },
  };
}
