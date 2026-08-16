import { AgentDeepAnalysisButton } from "@/components/agent/agent-deep-analysis-button";
import type { OpportunityTriageCandidate, OpportunityTriageRun } from "@/types/agent";

const recommendationLabels = { priority: "优先分析", candidate: "候选", skip: "暂不分析" } as const;
const dimensionLabels = {
  relevance: "业务相关", novelty: "新颖性", userValue: "用户价值", actionability: "可行动性", evidence: "证据质量",
} as const;

function CandidateCard({ candidate, rank, executable }: Readonly<{ candidate: OpportunityTriageCandidate; rank: number; executable: boolean }>) {
  return (
    <article className="agent-triage-candidate">
      <header>
        <span>{String(rank).padStart(2, "0")}</span>
        <div><strong>{candidate.signalTitle}</strong><p>{candidate.source} · {candidate.track === "domain" ? "业务领域" : "AI 行业"}</p></div>
        <b>{candidate.opportunityScore}</b>
      </header>
      <div className="agent-triage-tags">
        <span className={`triage-recommendation triage-${candidate.recommendation}`}>{recommendationLabels[candidate.recommendation]}</span>
        <span>重复风险 {candidate.duplicateRisk}</span>
        <span>{candidate.heatScore === null ? "无公开热度" : `公开热度 ${candidate.heatScore}`}</span>
      </div>
      <p>{candidate.rationale}</p>
      <dl>
        {Object.entries(candidate.dimensions).map(([key, value]) => (
          <div key={key}><dt>{dimensionLabels[key as keyof typeof dimensionLabels]}</dt><dd><span style={{ width: `${value}%` }} /><b>{value}</b></dd></div>
        ))}
      </dl>
      <AgentDeepAnalysisButton signalId={candidate.signalId} disabled={!executable} />
    </article>
  );
}

export function AgentTriageDashboard({
  run,
  executable,
}: Readonly<{
  run: OpportunityTriageRun | null;
  executable: boolean;
}>) {
  if (!run) {
    return (
      <section className="agent-triage-empty">
        <span>WAITING FOR TRIAGE</span>
        <h2>等待第一次自动机会扫描</h2>
        <p>运行初筛后，Agent 会展示 Top 3 推荐、评分拆解、重复风险和进入深度分析的入口。</p>
      </section>
    );
  }

  const recommended = run.recommendedSignalIds
    .map((id) => run.candidates.find((candidate) => candidate.signalId === id))
    .filter((candidate): candidate is OpportunityTriageCandidate => candidate !== undefined);

  return (
    <section className="agent-triage-board" aria-labelledby="agent-triage-title">
      <header>
        <div><span>TODAY&apos;S AGENT PICKS</span><h2 id="agent-triage-title">今日 Agent 推荐</h2><p>{run.decisionSummary}</p></div>
        <strong>{run.status === "completed" ? `${recommended.length} 条推荐` : "初筛失败"}</strong>
      </header>
      <div className="agent-triage-summary">
        <article><span>扫描情报</span><strong>{run.scannedSignals}</strong><p>AI 行业 + 业务领域</p></article>
        <article><span>进入候选</span><strong>{run.candidates.filter((item) => item.recommendation !== "skip").length}</strong><p>机会分数 ≥ 50</p></article>
        <article><span>重复过滤</span><strong>{run.candidates.filter((item) => item.duplicateRisk >= 60).length}</strong><p>历史 Memory 高度相似</p></article>
        <article><span>执行耗时</span><strong>{(run.durationMs / 1000).toFixed(1)}s</strong><p>{run.model}</p></article>
      </div>
      {recommended.length > 0 ? (
        <div className="agent-triage-candidates">
          {recommended.map((candidate, index) => <CandidateCard key={candidate.signalId} candidate={candidate} rank={index + 1} executable={executable} />)}
        </div>
      ) : <p className="agent-triage-no-picks">本批次没有达到推荐阈值的情报，Agent 没有为了凑数生成机会。</p>}
      <details className="agent-triage-audit">
        <summary>查看全部评分与初筛工具轨迹</summary>
        <div>
          {run.candidates.map((candidate) => <p key={candidate.signalId}><strong>{candidate.opportunityScore}</strong><span>{candidate.signalTitle}</span><small>{recommendationLabels[candidate.recommendation]} · 重复风险 {candidate.duplicateRisk}</small></p>)}
        </div>
        <ol>
          {run.toolCalls.map((call, index) => <li key={call.id}><span>{index + 1}</span><strong>{call.name}</strong><p>{call.outputSummary}</p></li>)}
        </ol>
      </details>
    </section>
  );
}
