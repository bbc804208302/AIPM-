import type { IntelligenceQualitySummary } from "@/services/summarize-intelligence-quality";

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "未记录";
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

export function IntelligenceQualityDashboard({ summary }: Readonly<{ summary: IntelligenceQualitySummary }>) {
  const latestUpdate = summary.latestGeneratedAt
    ? dateTimeFormatter.format(new Date(summary.latestGeneratedAt))
    : "等待首个批次";

  return (
    <section className="quality-dashboard" aria-labelledby="quality-dashboard-title">
      <header className="quality-dashboard-header">
        <div>
          <span>EVALS &amp; BADCASES</span>
          <h2 id="quality-dashboard-title">AI 质量评测</h2>
          <p>评估最近两条情报链路的中文概述覆盖、模型稳定性与待处理样本。</p>
        </div>
        <strong>更新于 {latestUpdate}</strong>
      </header>

      <div className="quality-kpi-grid" aria-label="AI 质量指标">
        <article><span>AI 概述覆盖率</span><strong>{summary.reviewCoveragePercent}%</strong><p>{summary.reviewedItems}/{summary.totalItems} 条完成审校</p></article>
        <article><span>待审校</span><strong>{summary.pendingItems}</strong><p>需要补偿处理的情报</p></article>
        <article><span>来源可用率</span><strong>{summary.sourceAvailabilityPercent}%</strong><p>{summary.successfulSources}/{summary.sourceCount} 个来源成功</p></article>
        <article><span>LLM 重试</span><strong>{summary.retryCount}</strong><p>{summary.failedBatchCount} 个失败批次</p></article>
      </div>

      <div className="quality-run-grid">
        {summary.runs.map((run) => (
          <article className="quality-run-card" key={run.track}>
            <header>
              <div><span>{run.label}</span><strong>{run.statusLabel}</strong></div>
              <time dateTime={run.generatedAt}>{run.briefingDate}</time>
            </header>
            <div className="quality-progress" aria-label={`${run.label} AI 概述覆盖率 ${run.coveragePercent}%`}>
              <span style={{ width: `${run.coveragePercent}%` }} />
            </div>
            <div className="quality-run-stats">
              <span><strong>{run.coveragePercent}%</strong> 覆盖</span>
              <span><strong>{run.requestCount}</strong> 请求</span>
              <span><strong>{run.batchCount}</strong> 批次</span>
              <span><strong>{formatDuration(run.durationMs)}</strong> 耗时</span>
            </div>
            <p>{run.model ? `模型 ${run.model}` : "该快照未记录模型"} · {run.failedBatchCount} 个失败批次</p>
          </article>
        ))}
        {summary.runs.length === 0 ? <p className="quality-empty">暂无情报批次，完成一次写入采集后生成质量报告。</p> : null}
      </div>

      <div className="quality-badcase-panel">
        <header>
          <div><span>BADCASE QUEUE</span><h3>待处理样本</h3></div>
          <strong>{summary.badcases.length} 条</strong>
        </header>
        {summary.badcases.length > 0 ? (
          <div className="quality-badcase-table" role="table" aria-label="待处理 AI 审校样本">
            <div className="quality-badcase-row quality-badcase-head" role="row">
              <span role="columnheader">情报</span><span role="columnheader">链路</span><span role="columnheader">问题</span><span role="columnheader">尝试</span>
            </div>
            {summary.badcases.slice(0, 8).map((badcase) => (
              <div className="quality-badcase-row" role="row" key={`${badcase.track}-${badcase.id}-${badcase.issueLabel}`}>
                <div role="cell"><strong>{badcase.title}</strong><span>{badcase.source}</span></div>
                <span role="cell">{badcase.trackLabel}</span>
                <span role="cell">{badcase.issueLabel} · {badcase.batchLabel}</span>
                <span role="cell">{badcase.attempts === null ? "—" : `${badcase.attempts} 次`}</span>
              </div>
            ))}
          </div>
        ) : <p className="quality-empty">当前最近批次没有待处理 badcase。</p>}
      </div>
    </section>
  );
}
