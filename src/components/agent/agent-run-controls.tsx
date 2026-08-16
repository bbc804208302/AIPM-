"use client";

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface AgentSignalOption {
  id: string;
  title: string;
  trackLabel: string;
  source: string;
}

export function AgentRunControls({
  signals,
  executable,
  configured,
}: Readonly<{
  signals: readonly AgentSignalOption[];
  executable: boolean;
  configured: boolean;
}>) {
  const router = useRouter();
  const [signalId, setSignalId] = useState(signals[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const selectedSignal = signals.find((signal) => signal.id === signalId);

  async function runAgent() {
    setBusy(true);
    setStatus("Agent 正在读取 Signal、检索 Memory 并评估产品机会…");
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId }),
      });
      const data = await response.json() as { error?: string; decision?: string; proposalTitle?: string | null; toolCalls?: number };
      if (!response.ok) throw new Error(data.error || "Agent 执行失败。");
      setStatus(data.decision === "proposal"
        ? `已形成候选需求「${data.proposalTitle ?? "未命名"}」，共调用 ${data.toolCalls ?? 0} 次工具，等待人工确认。`
        : `Agent 已完成评估并记录暂不转化结论，共调用 ${data.toolCalls ?? 0} 次工具。`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Agent 执行失败。");
    } finally {
      setBusy(false);
    }
  }

  const disabledReason = !executable
    ? "在线作品集为只读模式，避免访客消耗你的 LLM 配额；已提交的运行记录仍可完整查看。"
    : !configured
      ? "本地尚未启用 Opportunity Agent，请配置 LLM 后运行。"
      : signals.length === 0
        ? "暂无可供评估的情报。"
        : "";

  return (
    <section className="agent-control-panel" aria-labelledby="agent-run-title">
      <header>
        <div><span>HUMAN-GATED EXECUTION</span><h2 id="agent-run-title">发起机会评估</h2></div>
        <strong>{executable && configured ? "可运行" : "只读"}</strong>
      </header>
      <div className="agent-control-body">
        <label>
          <span>选择今日 Signal</span>
          <select value={signalId} disabled={!executable || !configured || busy} onChange={(event) => setSignalId(event.target.value)}>
            {signals.map((signal) => <option value={signal.id} key={signal.id}>{signal.trackLabel} · {signal.title} · {signal.source}</option>)}
          </select>
          {selectedSignal ? <small>GitHub Action Signal ID：<code>{selectedSignal.id}</code></small> : null}
        </label>
        <button className="brutal-control-button primary" type="button" disabled={!executable || !configured || !signalId || busy} onClick={runAgent}>
          <Play size={15} />{busy ? "Agent 运行中" : "运行 Product Opportunity Agent"}
        </button>
      </div>
      {status ? <p className="task-control-status" aria-live="polite">{status}</p> : null}
      {disabledReason ? <p className="control-note">{disabledReason}</p> : null}
    </section>
  );
}
