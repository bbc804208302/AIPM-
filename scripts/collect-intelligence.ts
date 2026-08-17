import { collectIntelligenceSignals } from "../src/collector/pipeline";
import { buildDailyIntelligenceBrief } from "../src/collector/daily-brief";
import { enrichBriefWithChineseOverview } from "../src/collector/chinese-overview";
import { prepareBriefForLlmReview, reviewBriefWithLlm } from "../src/collector/llm-review";
import { enrichBriefWithSourceContext } from "../src/collector/source-context";
import { createFileIntelligenceRepository } from "../src/repositories/file/file-intelligence-repository";
import { loadLocalEnvironment } from "./load-env";
import type { CollectorTrack } from "../src/collector/types";
import { loadCollectorSchedule } from "../src/collector/configuration";

interface CliOptions {
  write: boolean;
  json: boolean;
  sourceIds: string[];
  perSourceLimit?: number;
  dailyLimit?: number;
  track: CollectorTrack;
}

function parseArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = { write: false, json: false, sourceIds: [], track: "technical" };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--write") options.write = true;
    else if (arg === "--dry-run") options.write = false;
    else if (arg === "--json") options.json = true;
    else if (arg === "--source") options.sourceIds.push(args[++index] ?? "");
    else if (arg === "--track") {
      const value = args[++index];
      if (value !== "technical" && value !== "domain") throw new Error("--track must be technical or domain.");
      options.track = value;
    }
    else if (arg === "--limit") {
      const value = Number(args[++index]);
      if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error("--limit must be an integer between 1 and 100.");
      options.perSourceLimit = value;
    } else if (arg === "--daily-limit") {
      const value = Number(args[++index]);
      if (!Number.isInteger(value) || value < 1 || value > 20) throw new Error("--daily-limit must be an integer between 1 and 20.");
      options.dailyLimit = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  options.sourceIds = options.sourceIds.filter(Boolean);
  return options;
}

async function main(): Promise<void> {
  loadLocalEnvironment();
  const options = parseArgs(process.argv.slice(2));
  const schedule = await loadCollectorSchedule(options.track);
  const result = await collectIntelligenceSignals({ sourceIds: options.sourceIds, perSourceLimit: options.perSourceLimit, track: options.track, focusAreas: schedule.focusAreas });
  const repository = createFileIntelligenceRepository();
  const previous = await repository.getLatestBrief(options.track);
  const seenItems = await repository.getSeenItems(options.track);
  const deterministicBrief = enrichBriefWithChineseOverview(
    buildDailyIntelligenceBrief(result, {
      dailyLimit: options.dailyLimit ?? schedule.dailyLimit,
      timezone: schedule.timezone,
      track: options.track,
      historicalItems: seenItems,
    }),
    previous,
  );
  const reviewTargetBrief = options.write ? prepareBriefForLlmReview(deterministicBrief, previous) : deterministicBrief;
  const contextualBrief = options.write ? await enrichBriefWithSourceContext(reviewTargetBrief) : reviewTargetBrief;
  const brief = options.write ? await reviewBriefWithLlm(contextualBrief) : contextualBrief;

  if (options.json) {
    console.log(JSON.stringify({ result, brief }, null, 2));
  } else {
    console.log(`SignalFlow Collector · ${options.write ? "WRITE" : "DRY RUN"}`);
    for (const source of result.sources) {
      console.log(`${source.status === "success" ? "OK" : "FAIL"} ${source.sourceId}: ${source.collected}${source.error ? ` · ${source.error}` : ""}`);
    }
    console.log(`Unique candidates: ${result.signals.length}`);
    console.log(`Daily brief: ${brief.items.length} selected · target ${brief.targetCount ?? 10} · max ${brief.dailyLimit} · ${brief.briefingDate}`);
    console.log(`LLM reviewed: ${brief.items.filter((item) => item.translationStatus === "llm-reviewed").length}/${brief.items.length}`);
  }

  if (options.write) {
    const failed = result.sources.filter((source) => source.status === "failed").length;
    if (failed > result.sources.length / 2) throw new Error("More than half of enabled sources failed; daily snapshot was not changed.");
    if (brief.items.length === 0) throw new Error("No valid intelligence items were selected; daily snapshot was not changed.");
    await repository.saveBrief(brief);
    console.log(`SignalFlow Repository: saved ${brief.items.length} items for ${brief.briefingDate}.`);
  } else {
    console.log("No SignalFlow snapshot was changed. Use --write only after reviewing the dry-run.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Collector failed.");
  process.exitCode = 1;
});
