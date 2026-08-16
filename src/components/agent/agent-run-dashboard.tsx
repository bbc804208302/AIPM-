import type { OpportunityAgentRun } from "@/types/agent";
import { presentAsIntelligence } from "@/lib/intelligence/presentation";

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

const priorityLabels = { low: "P3", medium: "P2", high: "P1", urgent: "P0" } as const;

function decisionLabel(run: OpportunityAgentRun): string {
  if (run.decision === "proposal") return "形成候选需求";
  if (run.decision === "reject") return "暂不转化";
  return "运行失败";
}

export function AgentRunDashboard({ runs }: Readonly<{ runs: readonly OpportunityAgentRun[] }>) {
  const latestRun = runs[0];
  if (!latestRun) {
    return (
      <section className="agent-empty-state">
        <span>NO AGENT RUNS</span>
        <h2>暂无 Agent 运行记录</h2>
        <p>配置 LLM 后选择一条真实情报运行；系统会保存工具轨迹、Memory 召回和候选需求，但不会自动写入飞书。</p>
      </section>
    );
  }

  return (
    <>
      <section className="agent-run-board" aria-labelledby="latest-agent-run-title">
        <header>
          <div><span>LATEST AGENT RUN</span><h2 id="latest-agent-run-title">最近一次 Agent 决策</h2></div>
          <strong className={`agent-decision agent-decision-${latestRun.decision}`}>{decisionLabel(latestRun)}</strong>
        </header>
        <div className="agent-run-summary">
          <article><span>输入情报</span><strong>{latestRun.signalTitle}</strong><p>{latestRun.signalId}</p></article>
          <article><span>Tool Calls</span><strong>{latestRun.toolCalls.length}</strong><p>强制证据与 Memory 顺序</p></article>
          <article><span>Memory Recall</span><strong>{latestRun.memoryMatches.length}</strong><p>历史相似决策</p></article>
          <article><span>执行耗时</span><strong>{(latestRun.durationMs / 1000).toFixed(1)}s</strong><p>{latestRun.model}</p></article>
        </div>
        <div className="agent-trace-layout">
          <div className="agent-tool-trace">
            <header><span>AUDIT TRAIL</span><h3>工具调用轨迹</h3></header>
            <ol>
              {latestRun.toolCalls.map((call, index) => (
                <li key={call.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{call.name}</strong><p>{presentAsIntelligence(call.inputSummary)}</p><small>{presentAsIntelligence(call.outputSummary)} · {call.durationMs} ms</small></div>
                  <b className={call.status === "success" ? "tool-success" : "tool-failed"}>{call.status === "success" ? "成功" : "失败"}</b>
                </li>
              ))}
            </ol>
          </div>
          <div className="agent-decision-panel">
            <header><span>DECISION OUTPUT</span><h3>{latestRun.proposal ? "候选需求" : "决策结论"}</h3></header>
            {latestRun.proposal ? (
              <div className="agent-proposal">
                <div><strong>{latestRun.proposal.title}</strong><span className={`priority-badge priority-${latestRun.proposal.priority}`}>{priorityLabels[latestRun.proposal.priority]}</span></div>
                <dl>
                  <div><dt>用户问题</dt><dd>{latestRun.proposal.problem}</dd></div>
                  <div><dt>目标用户</dt><dd>{latestRun.proposal.targetUser}</dd></div>
                  <div><dt>产品机会</dt><dd>{latestRun.proposal.opportunity}</dd></div>
                  <div><dt>建议方案</dt><dd>{latestRun.proposal.suggestedSolution}</dd></div>
                  <div><dt>判断依据</dt><dd>{latestRun.proposal.rationale}</dd></div>
                </dl>
                <p>等待产品经理确认 · 不会自动写入飞书正式需求池</p>
              </div>
            ) : <p className="agent-rejection">{presentAsIntelligence(latestRun.decisionSummary)}</p>}
          </div>
        </div>
      </section>

      <section className="agent-history-panel">
        <header><span>AGENT MEMORY</span><h2>历史决策记忆</h2><strong>{runs.length} 次运行</strong></header>
        <div>
          {runs.slice(0, 8).map((run) => (
            <article key={run.id}>
              <div><strong>{run.signalTitle}</strong><span>{decisionLabel(run)}</span></div>
              <p>{presentAsIntelligence(run.decisionSummary)}</p>
              <time dateTime={run.completedAt}>{dateTimeFormatter.format(new Date(run.completedAt))}</time>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
