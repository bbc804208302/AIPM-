import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { runDailyIntelligenceAgent } from "@/agent/daily-intelligence-agent";
import { isOpportunityAgentExecutable } from "@/agent/runtime";
import { createFileIntelligenceRepository } from "@/repositories/file/file-intelligence-repository";
import { createFileOpportunityAgentRepository } from "@/repositories/file/file-opportunity-agent-repository";

export const runtime = "nodejs";
export const maxDuration = 300;

let activeRun: ReturnType<typeof runDailyIntelligenceAgent> | null = null;

export async function POST() {
  if (!isOpportunityAgentExecutable()) {
    return NextResponse.json({ error: "公开环境只展示 Agent 推荐，不允许访客消耗你的 LLM 配额。" }, { status: 403 });
  }
  if (activeRun) return NextResponse.json({ error: "Product Intelligence Agent 正在执行今日准入。" }, { status: 409 });

  try {
    activeRun = runDailyIntelligenceAgent(
      createFileIntelligenceRepository(),
      createFileOpportunityAgentRepository(),
    );
    const { triageRun: run, deepAnalysisRuns } = await activeRun;
    revalidatePath("/agent");
    revalidatePath("/intelligence");
    return NextResponse.json({
      ok: run.status === "completed",
      runId: run.id,
      scannedSignals: run.scannedSignals,
      recommendations: run.recommendedSignalIds.length,
      autoAnalyzed: deepAnalysisRuns.length,
      error: run.error,
    }, { status: run.status === "failed" ? 502 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent 初筛失败。" }, { status: 500 });
  } finally {
    activeRun = null;
  }
}
