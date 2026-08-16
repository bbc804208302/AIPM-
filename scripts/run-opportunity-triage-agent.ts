import { runOpportunityTriageAgent } from "../src/agent/opportunity-triage-agent";
import { createFileIntelligenceRepository } from "../src/repositories/file/file-intelligence-repository";
import { createFileOpportunityAgentRepository } from "../src/repositories/file/file-opportunity-agent-repository";
import { loadLocalEnvironment } from "./load-env";

async function main(): Promise<void> {
  loadLocalEnvironment();
  const run = await runOpportunityTriageAgent(
    createFileIntelligenceRepository(),
    createFileOpportunityAgentRepository(),
  );
  console.log("SignalFlow Product Opportunity Agent · Daily Triage");
  console.log(`Run: ${run.id}`);
  console.log(`Scanned: ${run.scannedSignals}`);
  console.log(`Recommended: ${run.recommendedSignalIds.length}`);
  console.log(`Tool calls: ${run.toolCalls.length}`);
  console.log(`Summary: ${run.decisionSummary}`);
  if (run.error) throw new Error(run.error);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Opportunity triage failed.");
  process.exitCode = 1;
});
