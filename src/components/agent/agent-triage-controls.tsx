"use client";

import { Radar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgentTriageControls({
  executable,
  configured,
  signalCount,
}: Readonly<{
  executable: boolean;
  configured: boolean;
  signalCount: number;
}>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const disabled = !executable || !configured || signalCount === 0 || busy;

  async function runTriage() {
    setBusy(true);
    setStatus("Agent 正在扫描双轨情报、检索 Memory 并计算机会评分…");
    try {
      const response = await fetch("/api/agent/triage", { method: "POST" });
      const data = await response.json() as { error?: string; scannedSignals?: number; recommendations?: number; autoAnalyzed?: number };
      if (!response.ok) throw new Error(data.error || "自动初筛失败。");
      setStatus(`已扫描 ${data.scannedSignals ?? 0} 条候选，准入 ${data.recommendations ?? 0} 条，自动深度分析 ${data.autoAnalyzed ?? 0} 条。`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "自动初筛失败。");
    } finally {
      setBusy(false);
    }
  }

  const disabledReason = !executable
    ? "线上作品集展示已提交的 Agent 推荐；每日真实初筛由 GitHub Action 执行。"
    : !configured
      ? "本地尚未启用 Product Intelligence Agent，请先配置 LLM。"
      : signalCount === 0
        ? "暂无可供扫描的最新情报。"
        : "";

  return (
    <section className="agent-triage-control" aria-labelledby="agent-triage-control-title">
      <div>
        <span>AUTONOMOUS TRIAGE</span>
        <h2 id="agent-triage-control-title">运行情报准入与机会分析</h2>
        <p>扫描最多 20 条候选，生成中文概述与机会评分，并自动深度分析高分情报。</p>
      </div>
      <div>
        <strong>{signalCount} 条待扫描</strong>
        <button className="brutal-control-button primary" type="button" disabled={disabled} onClick={runTriage}>
          <Radar size={15} />{busy ? "Agent 准入中" : "运行今日情报准入"}
        </button>
      </div>
      {status ? <p className="task-control-status" aria-live="polite">{status}</p> : null}
      {disabledReason ? <p className="control-note">{disabledReason}</p> : null}
    </section>
  );
}
