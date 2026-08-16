import { runOpportunityAgent } from "../src/agent/opportunity-agent";
import { createFileIntelligenceRepository } from "../src/repositories/file/file-intelligence-repository";
import { createFileOpportunityAgentRepository } from "../src/repositories/file/file-opportunity-agent-repository";
import { loadLocalEnvironment } from "./load-env";

function readSignalId(args: readonly string[]): string {
  const signalIndex = args.indexOf("--signal");
  const signalId = signalIndex >= 0 ? args[signalIndex + 1]?.trim() : "";
  if (!signalId) throw new Error("请使用 --signal <SIGNAL_ID> 指定需要评估的情报。");
  return signalId;
}

async function main(): Promise<void> {
  loadLocalEnvironment();
  const signalId = readSignalId(process.argv.slice(2));
  const run = await runOpportunityAgent(
    signalId,
    createFileIntelligenceRepository(),
    createFileOpportunityAgentRepository(),
  );
  console.log("SignalFlow Product Opportunity Agent");
  console.log(`Run: ${run.id}`);
  console.log(`Intelligence: ${run.signalTitle}`);
  console.log(`Decision: ${run.decision}`);
  console.log(`Tool calls: ${run.toolCalls.length}`);
  console.log(`Memory matches: ${run.memoryMatches.length}`);
  console.log(`Proposal: ${run.proposal?.title ?? "none"}`);
  if (run.error) throw new Error(run.error);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Opportunity Agent failed.");
  process.exitCode = 1;
});
