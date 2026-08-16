import type { OpportunityAgentMemoryMatch, OpportunityAgentRun } from "@/types/agent";

export interface OpportunityAgentRepository {
  listRuns(): Promise<readonly OpportunityAgentRun[]>;
  saveRun(run: OpportunityAgentRun): Promise<void>;
  searchMemory(query: string, excludeSignalId?: string): Promise<readonly OpportunityAgentMemoryMatch[]>;
}
