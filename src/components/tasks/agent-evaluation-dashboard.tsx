import type { AgentEvaluationRootCause, AgentEvaluationResult } from "@/types/agent-evaluation";

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const rootCauseLabels: Record<AgentEvaluationRootCause, string> = {
  pipeline: "运行链路",
  prompt: "Prompt",
  "classification-strategy": "分类策略",
  "scoring-strategy": "评分策略",
  "decision-threshold": "决策阈值",
};

function Delta({ current, previous }: Readonly<{ current: number; previous: number | null }>) {
  if (previous === null) return <span>首个评测基线</span>;
  const delta = current - previous;
  return <span>{delta === 0 ? "与上一版本持平" : `较上一版本 ${delta > 0 ? "+" : ""}${delta}pp`}</span>;
}

export function AgentEvaluationDashboard({
  latest,
  previous,
}: Readonly<{ latest: AgentEvaluationResult | null; previous: AgentEvaluationResult | null }>) {
  if (!latest) {
    return (
      <section className="agent-eval-dashboard" aria-labelledby="agent-eval-title">
        <header className="quality-dashboard-header">
          <div><span>FIXED DATASET EVAL</span><h2 id="agent-eval-title">Agent 效果评测</h2><p>使用固定历史真实情报评估 Agent 的事实概述、PM 分类、机会评分与深度分析决策。</p></div>
          <strong>等待首个基线</strong>
        </header>
        <p className="agent-eval-empty">运行 <code>pnpm agent:eval</code> 后，将在这里形成首个可重复比较的 Agent 效果基线。</p>
      </section>
    );
  }

  const metrics = latest.metrics;
  return (
    <section className="agent-eval-dashboard" aria-labelledby="agent-eval-title">
      <header className="quality-dashboard-header">
        <div>
          <span>FIXED DATASET EVAL</span>
          <h2 id="agent-eval-title">Agent 效果评测</h2>
          <p>固定数据集 {latest.datasetVersion} · {metrics.evaluatedCases} 条人工标注样本 · Prompt、策略和模型版本可追踪。</p>
        </div>
        <strong>综合质量 {metrics.overallQualityScore}%</strong>
      </header>

      <div className="agent-eval-meta" aria-label="Agent 评测版本">
        <span><strong>{latest.promptVersion}</strong> Prompt</span>
        <span><strong>{latest.strategyVersion}</strong> 策略</span>
        <span><strong>{latest.model}</strong> 模型</span>
        <time dateTime={latest.evaluatedAt}>评测于 {dateTimeFormatter.format(new Date(latest.evaluatedAt))}</time>
      </div>

      <div className="agent-eval-kpi-grid" aria-label="Agent 效果指标">
        <article><span>任务完成率</span><strong>{metrics.taskCompletionRate}%</strong><Delta current={metrics.taskCompletionRate} previous={previous?.metrics.taskCompletionRate ?? null} /></article>
        <article><span>事实覆盖率</span><strong>{metrics.summaryFactCoverageRate}%</strong><Delta current={metrics.summaryFactCoverageRate} previous={previous?.metrics.summaryFactCoverageRate ?? null} /></article>
        <article><span>PM 分类准确率</span><strong>{metrics.pmValueClassificationAccuracy}%</strong><Delta current={metrics.pmValueClassificationAccuracy} previous={previous?.metrics.pmValueClassificationAccuracy ?? null} /></article>
        <article><span>机会分一致率</span><strong>{metrics.scoreAgreementRate}%</strong><Delta current={metrics.scoreAgreementRate} previous={previous?.metrics.scoreAgreementRate ?? null} /></article>
        <article><span>深度分析决策一致率</span><strong>{metrics.deepAnalysisDecisionAgreement}%</strong><Delta current={metrics.deepAnalysisDecisionAgreement} previous={previous?.metrics.deepAnalysisDecisionAgreement ?? null} /></article>
        <article><span>人工修订率</span><strong>{metrics.humanCorrectionRate}%</strong><p>越低越好 · {latest.badcases.length} 个问题项</p></article>
      </div>

      <div className="agent-eval-badcase-panel">
        <header><div><span>ROOT CAUSE ANALYSIS</span><h3>Agent Bad Case 归因</h3></div><strong>{latest.badcases.length} 项</strong></header>
        {latest.badcases.length > 0 ? (
          <div className="agent-eval-badcase-table" role="table" aria-label="Agent 评测 Bad Case">
            <div className="agent-eval-badcase-row agent-eval-badcase-head" role="row">
              <span role="columnheader">评测样本</span><span role="columnheader">根因</span><span role="columnheader">问题</span><span role="columnheader">期望 / 实际</span>
            </div>
            {latest.badcases.slice(0, 10).map((badcase) => (
              <div className="agent-eval-badcase-row" role="row" key={`${badcase.caseId}-${badcase.rootCause}`}>
                <div role="cell"><strong>{badcase.title}</strong><span>{badcase.caseId}</span></div>
                <span role="cell">{rootCauseLabels[badcase.rootCause]}</span>
                <span role="cell">{badcase.issue}</span>
                <div role="cell"><span>期望：{badcase.expected}</span><span>实际：{badcase.actual}</span></div>
              </div>
            ))}
          </div>
        ) : <p className="quality-empty">本次固定评测没有发现 Bad Case。</p>}
      </div>
    </section>
  );
}
