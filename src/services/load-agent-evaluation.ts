import { createFileAgentEvaluationRepository } from "@/repositories/file/file-agent-evaluation-repository";
import type { AgentEvaluationResult } from "@/types/agent-evaluation";

export interface AgentEvaluationWorkspace {
  latest: AgentEvaluationResult | null;
  previous: AgentEvaluationResult | null;
}

export async function loadAgentEvaluationWorkspace(): Promise<AgentEvaluationWorkspace> {
  const results = await createFileAgentEvaluationRepository().listResults();
  const latest = results[0] ?? null;
  const previous = latest
    ? results.slice(1).find((result) => result.datasetVersion === latest.datasetVersion) ?? null
    : null;
  return { latest, previous };
}
