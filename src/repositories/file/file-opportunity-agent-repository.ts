import fs from "node:fs/promises";
import path from "node:path";

import bundledRunIndex from "../../../data/agent/runs.json";
import { isProductionAgentRuntime } from "@/agent/runtime";
import type { OpportunityAgentRepository } from "@/repositories/opportunity-agent-repository";
import type { OpportunityAgentMemoryMatch, OpportunityAgentRun, OpportunityAgentRunIndex, OpportunityTriageRun } from "@/types/agent";

const maximumRuns = 100;

function tokenize(value: string): readonly string[] {
  return value.toLocaleLowerCase().split(/[\s，。；、:：/_-]+/u).filter((token) => token.length >= 2);
}

function toMemoryMatch(run: OpportunityAgentRun): OpportunityAgentMemoryMatch {
  return {
    runId: run.id,
    signalTitle: run.signalTitle,
    decision: run.decision === "proposal" ? "proposal" : "reject",
    summary: run.proposal?.opportunity ?? run.decisionSummary,
    createdAt: run.completedAt,
  };
}

async function readIndex(filePath: string): Promise<OpportunityAgentRunIndex> {
  if (isProductionAgentRuntime()) return bundledRunIndex as unknown as OpportunityAgentRunIndex;
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as OpportunityAgentRunIndex;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { schemaVersion: 1, updatedAt: null, runs: [] };
    }
    throw error;
  }
}

export function createFileOpportunityAgentRepository(
  filePath = path.join(process.cwd(), "data", "agent", "runs.json"),
): OpportunityAgentRepository {
  return {
    async listRuns() {
      const index = await readIndex(filePath);
      return [...index.runs].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
    },
    async saveRun(run) {
      if (isProductionAgentRuntime()) throw new Error("公开环境不允许写入 Agent Memory。");
      const index = await readIndex(filePath);
      const runs = [run, ...index.runs.filter((candidate) => candidate.id !== run.id)].slice(0, maximumRuns);
      const nextIndex: OpportunityAgentRunIndex = { ...index, schemaVersion: 2, updatedAt: run.completedAt, runs };
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(nextIndex, null, 2)}\n`, "utf8");
    },
    async listTriageRuns() {
      const index = await readIndex(filePath);
      return [...(index.triageRuns ?? [])].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
    },
    async saveTriageRun(run: OpportunityTriageRun) {
      if (isProductionAgentRuntime()) throw new Error("公开环境不允许写入 Agent Memory。");
      const index = await readIndex(filePath);
      const triageRuns = [run, ...(index.triageRuns ?? []).filter((candidate) => candidate.id !== run.id)].slice(0, maximumRuns);
      const nextIndex: OpportunityAgentRunIndex = { ...index, schemaVersion: 2, updatedAt: run.completedAt, triageRuns };
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(nextIndex, null, 2)}\n`, "utf8");
    },
    async searchMemory(query, excludeSignalId) {
      const tokens = tokenize(query);
      const runs = await this.listRuns();
      return runs
        .filter((run) => run.status !== "failed" && run.signalId !== excludeSignalId)
        .map((run) => ({
          run,
          score: tokens.reduce((score, token) => {
            const searchable = `${run.signalTitle} ${run.decisionSummary} ${run.proposal?.opportunity ?? ""}`.toLocaleLowerCase();
            return score + (searchable.includes(token) ? 1 : 0);
          }, 0),
        }))
        .filter(({ score }) => tokens.length === 0 || score > 0)
        .sort((left, right) => right.score - left.score || right.run.completedAt.localeCompare(left.run.completedAt))
        .slice(0, 5)
        .map(({ run }) => toMemoryMatch(run));
    },
  };
}
