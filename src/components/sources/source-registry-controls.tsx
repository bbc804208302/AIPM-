"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CollectorCategory, CollectorSource, SourceRunReport } from "@/collector/types";

const categoryLabels: Record<CollectorCategory, string> = { "github-trending": "GitHub Trending", "ai-media": "AI 媒体", "x-viral": "X 动态" };

export function SourceRegistryControls({
  sources,
  reports,
  editable,
  label = "AI 行业情报数据源",
}: Readonly<{
  sources: readonly CollectorSource[];
  reports: readonly SourceRunReport[];
  editable: boolean;
  label?: string;
}>) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggle(source: CollectorSource) {
    setPendingId(source.id);
    setError("");
    try {
      const response = await fetch("/api/collector/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-source", sourceId: source.id, enabled: !source.enabled }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "数据源更新失败。");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "数据源更新失败。");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="source-registry-panel" aria-label={label}>
      <div className="source-registry-head">
        <span>数据源</span><span>分组</span><span>最近状态</span><span>单次上限</span><span>采集开关</span>
      </div>
      <div>
        {sources.map((source) => {
          const report = reports.find((entry) => entry.sourceId === source.id);
          return (
            <div className="source-registry-row" key={source.id}>
              <div className="primary-cell"><strong>{source.name}</strong><span>{source.id} · {source.type.toUpperCase()}</span></div>
              <span>{source.track === "domain" ? source.focusAreas?.join(" / ") ?? "业务领域" : categoryLabels[source.category]}</span>
              <span className={`status-badge ${report?.status === "failed" ? "status-rejected" : report ? "status-released" : ""}`}>
                {report?.status === "failed" ? "异常" : report ? `成功 · ${report.collected}` : "尚未运行"}
              </span>
              <span className="mono-cell">{source.limit} ITEMS</span>
              <button
                className={`source-toggle${source.enabled ? " active" : ""}`}
                type="button"
                role="switch"
                aria-checked={source.enabled}
                disabled={!editable || pendingId === source.id}
                onClick={() => toggle(source)}
              >
                <span aria-hidden="true" />
                {pendingId === source.id ? "保存中" : source.enabled ? "启用" : "停用"}
              </button>
            </div>
          );
        })}
      </div>
      {error ? <p className="control-error" role="alert">{error}</p> : null}
      <p className="control-note">{editable ? "本地控制：修改会写入 Source Registry，下一次手动或 GitHub 定时采集立即生效。" : "公开站点为只读模式；来源配置只允许项目维护者在本地修改。"}</p>
    </section>
  );
}
