import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { domainFocusAreaOptions, loadCollectorSchedule } from "@/collector/configuration";
import { isCollectorConfigurationEditable } from "@/collector/runtime";
import { buildDailyIntelligenceBrief } from "@/collector/daily-brief";
import { enrichBriefWithChineseOverview } from "@/collector/chinese-overview";
import { reviewBriefWithLlm } from "@/collector/llm-review";
import { enrichBriefWithSourceContext } from "@/collector/source-context";
import { collectIntelligenceSignals } from "@/collector/pipeline";
import { createFileIntelligenceRepository } from "@/repositories/file/file-intelligence-repository";
import type { CollectorTrack, DomainFocusArea } from "@/collector/types";

export const runtime = "nodejs";
export const maxDuration = 60;

let activeRun: Promise<ReturnType<typeof buildDailyIntelligenceBrief>> | null = null;

async function runCollector(track: CollectorTrack, focusAreas?: readonly DomainFocusArea[]) {
  const schedule = await loadCollectorSchedule(track);
  const repository = createFileIntelligenceRepository();
  const previous = await repository.getLatestBrief(track);
  const seenItems = await repository.getSeenItems(track);
  const result = await collectIntelligenceSignals({ track, focusAreas: focusAreas ?? schedule.focusAreas });
  const failed = result.sources.filter((source) => source.status === "failed").length;
  if (failed > result.sources.length / 2) throw new Error("超过半数数据源失败，今日快照未更新。");
  const deterministicBrief = enrichBriefWithChineseOverview(
    buildDailyIntelligenceBrief(result, {
      dailyLimit: schedule.dailyLimit,
      timezone: schedule.timezone,
      track,
      historicalItems: seenItems,
    }),
    previous,
  );
  const contextualBrief = await enrichBriefWithSourceContext(deterministicBrief);
  const brief = await reviewBriefWithLlm(contextualBrief);
  if (brief.items.length === 0) throw new Error("没有选出有效情报，今日快照未更新。");
  await repository.saveBrief(brief);
  return brief;
}

export async function POST(request: Request) {
  if (!isCollectorConfigurationEditable()) {
    return NextResponse.json({ error: "公开环境不允许手动执行采集。" }, { status: 403 });
  }
  if (activeRun) return NextResponse.json({ error: "采集任务正在运行。" }, { status: 409 });

  try {
    const body = await request.json().catch(() => ({})) as { track?: unknown; focusAreas?: unknown };
    const track: CollectorTrack = body.track === "domain" ? "domain" : "technical";
    const focusAreas = track === "domain" && Array.isArray(body.focusAreas)
      ? body.focusAreas.filter((area): area is DomainFocusArea => domainFocusAreaOptions.includes(area as DomainFocusArea))
      : undefined;
    if (track === "domain" && focusAreas?.length === 0) {
      return NextResponse.json({ error: "请至少选择一个业务领域。" }, { status: 400 });
    }
    activeRun = runCollector(track, focusAreas);
    const brief = await activeRun;
    revalidatePath("/intelligence");
    revalidatePath("/sources");
    revalidatePath("/tasks");
    return NextResponse.json({
      ok: true,
      briefingDate: brief.briefingDate,
      track: brief.track,
      selected: brief.items.length,
      candidates: brief.candidateCount,
      succeededSources: brief.sources.filter((source) => source.status === "success").length,
      failedSources: brief.sources.filter((source) => source.status === "failed").length,
      chineseOverviews: brief.items.filter((item) => item.summaryZh).length,
      llmReviewed: brief.items.filter((item) => item.translationStatus === "llm-reviewed").length,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "采集任务失败。" }, { status: 500 });
  } finally {
    activeRun = null;
  }
}
