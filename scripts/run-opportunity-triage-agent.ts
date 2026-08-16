import { runDailyIntelligenceAgent } from "../src/agent/daily-intelligence-agent";
import { createFileIntelligenceRepository } from "../src/repositories/file/file-intelligence-repository";
import { createFileOpportunityAgentRepository } from "../src/repositories/file/file-opportunity-agent-repository";
import { loadLocalEnvironment } from "./load-env";

async function main(): Promise<void> {
  loadLocalEnvironment();
  const { triageRun: run, deepAnalysisRuns } = await runDailyIntelligenceAgent(
    createFileIntelligenceRepository(),
    createFileOpportunityAgentRepository(),
  );
  console.log("SignalFlow Product Intelligence Agent · Daily PM Opportunity Scoring");
  console.log(`Run: ${run.id}`);
  console.log(`Scanned: ${run.scannedSignals}`);
  console.log(`Scored: ${run.candidates.length}`);
  console.log(`Auto deep analysis: ${deepAnalysisRuns.length}`);
  console.log(`Tool calls: ${run.toolCalls.length}`);
  console.log(`Summary: ${run.decisionSummary}`);
  if (run.error) throw new Error(run.error);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Opportunity triage failed.");
  process.exitCode = 1;
});
