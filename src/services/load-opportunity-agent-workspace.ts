import "server-only";

import { readOpportunityAgentConfig } from "@/agent/opportunity-agent";
import { isOpportunityAgentExecutable } from "@/agent/runtime";
import { createFileIntelligenceRepository } from "@/repositories/file/file-intelligence-repository";
import { createFileOpportunityAgentRepository } from "@/repositories/file/file-opportunity-agent-repository";

export async function loadOpportunityAgentWorkspace() {
  const intelligenceRepository = createFileIntelligenceRepository();
  const agentRepository = createFileOpportunityAgentRepository();
  const [technicalBrief, domainBrief, runs, triageRuns] = await Promise.all([
    intelligenceRepository.getLatestBrief("technical"),
    intelligenceRepository.getLatestBrief("domain"),
    agentRepository.listRuns(),
    agentRepository.listTriageRuns(),
  ]);
  const signals = [...(technicalBrief?.items ?? []), ...(domainBrief?.items ?? [])]
    .sort((left, right) => (right.publishedAt ?? right.createdAt).localeCompare(left.publishedAt ?? left.createdAt));

  return {
    signals,
    runs,
    triageRuns,
    executable: isOpportunityAgentExecutable(),
    configured: readOpportunityAgentConfig() !== null,
  };
}
