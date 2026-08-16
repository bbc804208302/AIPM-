import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { runOpportunityAgent } from "@/agent/opportunity-agent";
import { isOpportunityAgentExecutable } from "@/agent/runtime";
import { createFileIntelligenceRepository } from "@/repositories/file/file-intelligence-repository";
import { createFileOpportunityAgentRepository } from "@/repositories/file/file-opportunity-agent-repository";

export const runtime = "nodejs";
export const maxDuration = 60;

let activeRun: ReturnType<typeof runOpportunityAgent> | null = null;

export async function POST(request: Request) {
  if (!isOpportunityAgentExecutable()) {
    return NextResponse.json({ error: "公开环境只展示 Agent 运行记录，不允许访客消耗你的 LLM 配额。" }, { status: 403 });
  }
  if (activeRun) return NextResponse.json({ error: "Product Opportunity Agent 正在运行。" }, { status: 409 });

  try {
    const body = await request.json().catch(() => ({})) as { signalId?: unknown };
    if (typeof body.signalId !== "string" || body.signalId.trim().length === 0) {
      return NextResponse.json({ error: "请选择需要评估的 Signal。" }, { status: 400 });
    }
    activeRun = runOpportunityAgent(
      body.signalId.trim(),
      createFileIntelligenceRepository(),
      createFileOpportunityAgentRepository(),
    );
    const run = await activeRun;
    revalidatePath("/agent");
    return NextResponse.json({
      ok: run.status !== "failed",
      runId: run.id,
      status: run.status,
      decision: run.decision,
      proposalTitle: run.proposal?.title ?? null,
      toolCalls: run.toolCalls.length,
      error: run.error,
    }, { status: run.status === "failed" ? 502 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent 执行失败。" }, { status: 500 });
  } finally {
    activeRun = null;
  }
}
