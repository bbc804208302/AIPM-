import { runOpportunityAgent } from "@/agent/opportunity-agent";
import { runOpportunityTriageAgent } from "@/agent/opportunity-triage-agent";
import type { IntelligenceRepository } from "@/repositories/intelligence-repository";
import type { OpportunityAgentRepository } from "@/repositories/opportunity-agent-repository";
import type { OpportunityAgentRun, OpportunityTriageRun } from "@/types/agent";
import type { OpportunityTriageCandidate } from "@/types/agent";

type Environment = Readonly<Record<string, string | undefined>>;
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export const maximumAutomaticDeepAnalyses = 3;

export interface DailyIntelligenceAgentResult {
  triageRun: OpportunityTriageRun;
  deepAnalysisRuns: readonly OpportunityAgentRun[];
}

export function selectAutomaticDeepAnalysisSignalIds(
  candidates: readonly OpportunityTriageCandidate[],
  previousRuns: readonly OpportunityAgentRun[],
): readonly string[] {
  const previouslyAnalyzed = new Set(previousRuns.map((run) => run.signalId));
  return candidates
    .filter((candidate) => candidate.recommendation === "priority" && !previouslyAnalyzed.has(candidate.signalId))
    .slice(0, maximumAutomaticDeepAnalyses)
    .map((candidate) => candidate.signalId);
}

export async function runDailyIntelligenceAgent(
  intelligenceRepository: IntelligenceRepository,
  agentRepository: OpportunityAgentRepository,
  environment: Environment = process.env,
  fetcher: FetchLike = fetch,
): Promise<DailyIntelligenceAgentResult> {
  const triageRun = await runOpportunityTriageAgent(
    intelligenceRepository,
    agentRepository,
    environment,
    fetcher,
  );
  if (triageRun.status !== "completed") return { triageRun, deepAnalysisRuns: [] };

  const previousRuns = await agentRepository.listRuns();
  const prioritySignalIds = selectAutomaticDeepAnalysisSignalIds(triageRun.candidates, previousRuns);

  const deepAnalysisRuns: OpportunityAgentRun[] = [];
  for (const signalId of prioritySignalIds) {
    deepAnalysisRuns.push(await runOpportunityAgent(
      signalId,
      intelligenceRepository,
      agentRepository,
      environment,
      fetcher,
    ));
  }

  const completedSignalIds = deepAnalysisRuns
    .filter((run) => run.status !== "failed")
    .map((run) => run.signalId);
  const completedRun: OpportunityTriageRun = {
    ...triageRun,
    autoAnalyzedSignalIds: completedSignalIds,
  };
  await agentRepository.saveTriageRun(completedRun);
  return { triageRun: completedRun, deepAnalysisRuns };
}
