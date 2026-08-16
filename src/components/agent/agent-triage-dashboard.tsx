import { AgentDeepAnalysisButton } from "@/components/agent/agent-deep-analysis-button";
import { presentAsIntelligence } from "@/lib/intelligence/presentation";
import type { OpportunityTriageCandidate, OpportunityTriageRun } from "@/types/agent";

const recommendationLabels = { priority: "自动深度分析", candidate: "已准入", skip: "待审候选" } as const;
const dimensionLabels = {
  relevance: "业务相关", novelty: "新颖性", userValue: "用户价值", actionability: "可行动性", evidence: "证据质量",
} as const;

function CandidateCard({ candidate, rank, executable }: Readonly<{ candidate: OpportunityTriageCandidate; rank: number; executable: boolean }>) {
  return (
    <article className="agent-triage-candidate">
      <header>
        <span>{String(rank).padStart(2, "0")}</span>
        <div><strong>{candidate.titleZh || candidate.signalTitle}</strong><p>{candidate.source} · {candidate.track === "domain" ? "业务领域" : "AI 行业"}</p></div>
        <b>{candidate.opportunityScore}</b>
      </header>
      <div className="agent-triage-tags">
        <span className={`triage-recommendation triage-${candidate.recommendation}`}>{recommendationLabels[candidate.recommendation]}</span>
        <span>重复风险 {candidate.duplicateRisk}</span>
        <span>{candidate.heatScore === null ? "无公开热度" : `公开热度 ${candidate.heatScore}`}</span>
      </div>
      <p>{candidate.summaryZh}</p>
      <p>{presentAsIntelligence(candidate.rationale)}</p>
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
        <span>WAITING FOR ADMISSION RUN</span>
        <h2>等待第一次 Agent 情报准入</h2>
        <p>运行后将在这里审计动态准入、评分拆解、重复风险和自动深度分析结果。</p>
      </section>
    );
  }

  const recommended = run.recommendedSignalIds
    .map((id) => run.candidates.find((candidate) => candidate.signalId === id))
    .filter((candidate): candidate is OpportunityTriageCandidate => candidate !== undefined);

  return (
    <section className="agent-triage-board" aria-labelledby="agent-triage-title">
      <header>
        <div><span>INTELLIGENCE ADMISSION AUDIT</span><h2 id="agent-triage-title">本批 Agent 准入结果</h2><p>{presentAsIntelligence(run.decisionSummary)}</p></div>
        <strong>{run.status === "completed" ? `${recommended.length} 条准入` : "初筛失败"}</strong>
      </header>
      <div className="agent-triage-summary">
        <article><span>扫描情报</span><strong>{run.scannedSignals}</strong><p>AI 行业 + 业务领域</p></article>
        <article><span>进入情报池</span><strong>{run.candidates.filter((item) => item.recommendation !== "skip").length}</strong><p>机会分数 ≥ 50</p></article>
        <article><span>待审候选</span><strong>{run.candidates.filter((item) => item.recommendation === "skip").length}</strong><p>暂未达到 50 分</p></article>
        <article><span>自动深度分析</span><strong>{run.autoAnalyzedSignalIds?.length ?? 0}</strong><p>70 分以上 · 每日最多 3 条</p></article>
      </div>
      {recommended.length > 0 ? (
        <div className="agent-triage-candidates">
          {recommended.map((candidate, index) => <CandidateCard key={candidate.signalId} candidate={candidate} rank={index + 1} executable={executable} />)}
        </div>
      ) : <p className="agent-triage-no-picks">本批次没有达到准入阈值的情报，Agent 没有为了凑数生成产品情报。</p>}
      <details className="agent-triage-audit">
        <summary>查看全部评分与初筛工具轨迹</summary>
        <div>
          {run.candidates.map((candidate) => <p key={candidate.signalId}><strong>{candidate.opportunityScore}</strong><span>{presentAsIntelligence(candidate.signalTitle)}</span><small>{recommendationLabels[candidate.recommendation]} · 重复风险 {candidate.duplicateRisk}</small></p>)}
        </div>
        <ol>
          {run.toolCalls.map((call, index) => <li key={call.id}><span>{index + 1}</span><strong>{call.name}</strong><p>{presentAsIntelligence(call.outputSummary)}</p></li>)}
        </ol>
      </details>
    </section>
  );
}
