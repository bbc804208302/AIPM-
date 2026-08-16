"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgentDeepAnalysisButton({
  signalId,
  disabled,
}: Readonly<{
  signalId: string;
  disabled: boolean;
}>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function analyze() {
    setBusy(true);
    setStatus("正在深度分析…");
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId }),
      });
      const data = await response.json() as { error?: string; decision?: string };
      if (!response.ok) throw new Error(data.error || "深度分析失败。");
      setStatus(data.decision === "proposal" ? "已生成候选需求" : "已记录暂不转化");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "深度分析失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="agent-deep-action">
      <button type="button" disabled={disabled || busy} onClick={analyze}>
        {busy ? "分析中" : "深度分析"}<ArrowRight size={14} />
      </button>
      {status ? <small aria-live="polite">{status}</small> : null}
    </div>
  );
}
