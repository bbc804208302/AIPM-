import type { OpportunityAgentMemoryMatch, OpportunityAgentRun, OpportunityTriageRun } from "@/types/agent";

export interface OpportunityAgentRepository {
  listRuns(): Promise<readonly OpportunityAgentRun[]>;
  saveRun(run: OpportunityAgentRun): Promise<void>;
  listTriageRuns(): Promise<readonly OpportunityTriageRun[]>;
  saveTriageRun(run: OpportunityTriageRun): Promise<void>;
  searchMemory(query: string, excludeSignalId?: string): Promise<readonly OpportunityAgentMemoryMatch[]>;
}
