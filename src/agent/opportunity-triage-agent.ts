import { randomUUID } from "node:crypto";

import { readOpportunityAgentConfig } from "@/agent/opportunity-agent";
import type { IntelligenceRepository } from "@/repositories/intelligence-repository";
import type { OpportunityAgentRepository } from "@/repositories/opportunity-agent-repository";
import type {
  OpportunityAgentMemoryMatch,
  OpportunityAgentToolCall,
  OpportunityAgentToolName,
  OpportunityTriageCandidate,
  OpportunityTriageDimensionScores,
  OpportunityTriageRun,
} from "@/types/agent";
import type { IntelligenceSignal } from "@/types/intelligence";

type Environment = Readonly<Record<string, string | undefined>>;
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface ProviderToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ProviderMessage {
  role: "assistant";
  content?: string | null;
  tool_calls?: readonly ProviderToolCall[];
}

interface ConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: readonly ProviderToolCall[];
}

interface TriageState {
  signals: readonly IntelligenceSignal[];
  memoryBySignal: ReadonlyMap<string, readonly OpportunityAgentMemoryMatch[]>;
  candidates: readonly OpportunityTriageCandidate[];
  recommendedSignalIds: readonly string[];
  decisionSummary: string | null;
  toolCalls: OpportunityAgentToolCall[];
  listedSignals: boolean;
  searchedMemory: boolean;
  scoredCandidates: boolean;
}

const maximumSignals = 20;

const triageTools = [
  {
    type: "function",
    function: {
      name: "list_daily_signals",
      description: "读取 AI 行业和业务领域最新情报，作为今日机会初筛候选集。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "search_memory",
      description: "按每条 Signal 检索历史产品机会决策，识别已经分析过的相似内容。",
      parameters: {
        type: "object",
        properties: {
          queries: {
            type: "array",
            items: {
              type: "object",
              properties: { signalId: { type: "string" }, query: { type: "string" } },
              required: ["signalId", "query"],
              additionalProperties: false,
            },
          },
        },
        required: ["queries"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "score_candidates",
      description: "对全部候选 Signal 进行结构化机会评分；程序将按固定权重计算总分。",
      parameters: {
        type: "object",
        properties: {
          candidates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                signalId: { type: "string" },
                titleZh: { type: "string" },
                summaryZh: { type: "string" },
                relevance: { type: "number", minimum: 0, maximum: 100 },
                novelty: { type: "number", minimum: 0, maximum: 100 },
                userValue: { type: "number", minimum: 0, maximum: 100 },
                actionability: { type: "number", minimum: 0, maximum: 100 },
                evidence: { type: "number", minimum: 0, maximum: 100 },
                duplicateRisk: { type: "number", minimum: 0, maximum: 100 },
                rationale: { type: "string" },
              },
              required: ["signalId", "titleZh", "summaryZh", "relevance", "novelty", "userValue", "actionability", "evidence", "duplicateRisk", "rationale"],
              additionalProperties: false,
            },
          },
        },
        required: ["candidates"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "select_intelligence_for_pool",
      description: "确认程序按机会分数完成动态准入；50 分以上进入情报池，低分进入待审候选。",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "确认本批次评分已经完成；最终推荐名单由系统根据结构化分数生成。",
          },
        },
        required: ["summary"],
        additionalProperties: false,
      },
    },
  },
] as const;

function parseArguments(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function requiredString(value: unknown, label: string, maximumLength = 500): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} 不能为空。`);
  return value.trim().slice(0, maximumLength);
}

function requiredChineseOverview(value: unknown): string {
  const overview = requiredString(value, "中文概述", 220);
  if (!/[\u3400-\u9fff]/u.test(overview)) throw new Error("中文概述必须包含可读的中文说明。");
  if (/发布(?:了)?(?:一则|关于)?.{0,12}(?:新动态|内容更新)|具体以原文为准|以项目说明为准|值得产品经理关注/u.test(overview)) {
    throw new Error("中文概述过于模板化，必须直接说明情报是什么、做什么或发生了什么。");
  }
  return overview;
}

function score(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("评分必须是有效数字。");
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateOpportunityScore(
  dimensions: OpportunityTriageDimensionScores,
  heatScore: number | null,
  duplicateRisk: number,
): number {
  const publicAttention = heatScore ?? 50;
  const weighted = dimensions.relevance * 0.25
    + dimensions.userValue * 0.2
    + dimensions.actionability * 0.2
    + dimensions.novelty * 0.15
    + dimensions.evidence * 0.15
    + publicAttention * 0.05;
  return Math.max(0, Math.min(100, Math.round(weighted - duplicateRisk * 0.25)));
}

function recommendationFor(scoreValue: number): OpportunityTriageCandidate["recommendation"] {
  if (scoreValue >= 70) return "priority";
  if (scoreValue >= 50) return "candidate";
  return "skip";
}

function signalObservation(signal: IntelligenceSignal) {
  return {
    id: signal.id,
    title: signal.titleZh ?? signal.title,
    summary: signal.summaryZh ?? signal.summary,
    originalTitle: signal.title,
    sourceSummary: signal.summary,
    pageDescription: typeof signal.sourceMetadata.pageDescription === "string" ? signal.sourceMetadata.pageDescription.slice(0, 800) : "",
    track: signal.track,
    source: signal.source,
    category: signal.category,
    publishedAt: signal.publishedAt,
    heatScore: signal.heatScore ?? null,
    url: signal.url,
  };
}

function systemPrompt(): string {
  return [
    "你是 SignalFlow Product Intelligence Agent 的 daily-triage 模式，服务于 AI 产品经理。",
    "目标是主动扫描最新公开情报，推荐最值得进一步做产品机会分析的 Signal。",
    "必须依次调用 list_daily_signals、search_memory、score_candidates、select_intelligence_for_pool；每轮只能调用一个工具。",
    "search_memory 必须为每条 Signal 提供简短查询；score_candidates 必须覆盖全部候选且每条只出现一次。",
    "score_candidates 同时生成准确中文标题和一句中文概述。概述直接说明它是什么、做什么或发生了什么，不解释入选原因，不得使用‘发布新动态’等空泛模板。",
    "评分维度：业务相关性、新颖性、用户价值、可行动性、证据质量、历史重复风险。",
    "公开热度只是弱信号；公司新闻或热门事件如果没有明确用户问题和可行动机会，不应获得高分。",
    "历史已有高度相似决策时提高 duplicateRisk；不得为了凑数推荐重复内容。",
    "只保存简洁评分理由与工具观察，不要输出或保存思维链，不得虚构来源没有提供的事实。",
  ].join("\n");
}

function readProviderMessage(payload: unknown): ProviderMessage | null {
  if (!payload || typeof payload !== "object" || !("choices" in payload) || !Array.isArray(payload.choices)) return null;
  const message = (payload.choices[0] as { message?: unknown } | undefined)?.message;
  return message && typeof message === "object" ? message as ProviderMessage : null;
}

function toolSummary(name: OpportunityAgentToolName, args: Record<string, unknown>): string {
  if (name === "list_daily_signals") return "读取最新双轨情报";
  if (name === "search_memory") return `检索 ${Array.isArray(args.queries) ? args.queries.length : 0} 条 Signal 的历史决策`;
  if (name === "score_candidates") return `评估 ${Array.isArray(args.candidates) ? args.candidates.length : 0} 条候选`;
  if (name === "select_intelligence_for_pool") return "确认今日情报池准入结果";
  return "不支持的初筛工具";
}

async function executeTriageTool(
  toolCall: ProviderToolCall,
  state: TriageState,
  intelligenceRepository: IntelligenceRepository,
  agentRepository: OpportunityAgentRepository,
): Promise<string> {
  const startedAt = Date.now();
  const name = toolCall.function.name as OpportunityAgentToolName;
  const args = parseArguments(toolCall.function.arguments);
  let outputSummary = "";
  try {
    let output: unknown;
    if (name === "list_daily_signals") {
      const [technicalBrief, domainBrief] = await Promise.all([
        intelligenceRepository.getLatestBrief("technical"),
        intelligenceRepository.getLatestBrief("domain"),
      ]);
      state.signals = [...(technicalBrief?.items ?? []), ...(domainBrief?.items ?? [])]
        .sort((left, right) => (right.publishedAt ?? right.createdAt).localeCompare(left.publishedAt ?? left.createdAt))
        .slice(0, maximumSignals);
      if (state.signals.length === 0) throw new Error("没有可供初筛的最新情报。");
      state.listedSignals = true;
      output = { signals: state.signals.map(signalObservation) };
      outputSummary = `已读取 ${state.signals.length} 条最新情报`;
    } else if (name === "search_memory") {
      if (!state.listedSignals) throw new Error("请先读取最新情报。");
      const queries = Array.isArray(args.queries) ? args.queries : [];
      const queryBySignal = new Map(queries.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const value = item as Record<string, unknown>;
        if (typeof value.signalId !== "string" || typeof value.query !== "string") return [];
        return [[value.signalId, value.query] as const];
      }));
      if (queryBySignal.size !== state.signals.length || state.signals.some((signal) => !queryBySignal.has(signal.id))) {
        throw new Error("必须为全部候选 Signal 检索 Memory。");
      }
      const matches = await Promise.all(state.signals.map(async (signal) => [
        signal.id,
        await agentRepository.searchMemory(requiredString(queryBySignal.get(signal.id), "Memory query", 240), signal.id),
      ] as const));
      state.memoryBySignal = new Map(matches);
      state.searchedMemory = true;
      output = { matches: matches.map(([signalId, values]) => ({ signalId, matches: values })) };
      outputSummary = `完成 ${matches.length} 条候选的历史去重检索`;
    } else if (name === "score_candidates") {
      if (!state.listedSignals || !state.searchedMemory) throw new Error("评分前必须读取情报并检索 Memory。");
      const rawCandidates = Array.isArray(args.candidates) ? args.candidates : [];
      const rawById = new Map(rawCandidates.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const value = item as Record<string, unknown>;
        return typeof value.signalId === "string" ? [[value.signalId, value] as const] : [];
      }));
      if (rawById.size !== state.signals.length || state.signals.some((signal) => !rawById.has(signal.id))) {
        throw new Error("必须对全部候选 Signal 完成评分。");
      }
      state.candidates = state.signals.map((signal) => {
        const raw = rawById.get(signal.id) as Record<string, unknown>;
        const dimensions: OpportunityTriageDimensionScores = {
          relevance: score(raw.relevance), novelty: score(raw.novelty), userValue: score(raw.userValue),
          actionability: score(raw.actionability), evidence: score(raw.evidence),
        };
        const memoryMatchCount = state.memoryBySignal.get(signal.id)?.length ?? 0;
        const duplicateRisk = Math.max(score(raw.duplicateRisk), memoryMatchCount > 0 ? 35 : 0);
        const opportunityScore = calculateOpportunityScore(dimensions, signal.heatScore ?? null, duplicateRisk);
        return {
          signalId: signal.id,
          signalTitle: requiredString(raw.titleZh, "中文标题", 60),
          titleZh: requiredString(raw.titleZh, "中文标题", 60),
          summaryZh: requiredChineseOverview(raw.summaryZh),
          track: signal.track,
          source: signal.source,
          heatScore: signal.heatScore ?? null,
          dimensions,
          duplicateRisk,
          memoryMatchCount,
          opportunityScore,
          recommendation: recommendationFor(opportunityScore),
          rationale: requiredString(raw.rationale, "评分理由", 360),
        } satisfies OpportunityTriageCandidate;
      }).sort((left, right) => right.opportunityScore - left.opportunityScore);
      state.scoredCandidates = true;
      output = { candidates: state.candidates };
      outputSummary = `完成 ${state.candidates.length} 条机会评分`;
    } else if (name === "select_intelligence_for_pool") {
      if (!state.scoredCandidates) throw new Error("生成推荐前必须完成全部候选评分。");
      state.recommendedSignalIds = state.candidates
        .filter((candidate) => candidate.recommendation !== "skip")
        .map((candidate) => candidate.signalId);
      requiredString(args.summary, "推荐总结", 280);
      const recommendedTitles = state.recommendedSignalIds
        .map((signalId) => state.candidates.find((candidate) => candidate.signalId === signalId)?.signalTitle)
        .filter((title): title is string => Boolean(title));
      state.decisionSummary = recommendedTitles.length > 0
        ? `Agent 从 ${state.signals.length} 条候选中准入 ${recommendedTitles.length} 条产品情报：${recommendedTitles.join("、")}。其余内容进入待审候选。`
        : `Agent 完成 ${state.signals.length} 条候选的结构化评分，本批次没有达到情报池准入阈值的内容。`;
      output = { recommendedSignalIds: state.recommendedSignalIds, summary: state.decisionSummary };
      outputSummary = `准入 ${state.recommendedSignalIds.length} 条产品情报`;
    } else {
      throw new Error("不支持的初筛工具。");
    }
    state.toolCalls.push({ id: toolCall.id, name, status: "success", inputSummary: toolSummary(name, args), outputSummary, durationMs: Date.now() - startedAt });
    return JSON.stringify(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "工具执行失败。";
    state.toolCalls.push({ id: toolCall.id, name, status: "failed", inputSummary: toolSummary(name, args), outputSummary: message, durationMs: Date.now() - startedAt });
    return JSON.stringify({ error: message });
  }
}

export async function runOpportunityTriageAgent(
  intelligenceRepository: IntelligenceRepository,
  agentRepository: OpportunityAgentRepository,
  environment: Environment = process.env,
  fetcher: FetchLike = fetch,
): Promise<OpportunityTriageRun> {
  const config = readOpportunityAgentConfig(environment);
  if (!config) throw new Error("请先配置 LLM_API_KEY，并将 SIGNALFLOW_OPPORTUNITY_AGENT 设置为 true。");

  const startedAt = new Date();
  const state: TriageState = {
    signals: [], memoryBySignal: new Map(), candidates: [], recommendedSignalIds: [], decisionSummary: null,
    toolCalls: [], listedSignals: false, searchedMemory: false, scoredCandidates: false,
  };
  const messages: ConversationMessage[] = [
    { role: "system", content: systemPrompt() },
    { role: "user", content: "扫描最新双轨候选，完成中文概述、历史去重和结构化评分，决定哪些内容进入 AI 产品情报池。" },
  ];
  let runError: string | null = null;

  try {
    for (let step = 0; step < 7 && !state.decisionSummary; step += 1) {
      const response = await fetcher(`${config.apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages, tools: triageTools, tool_choice: "auto", temperature: 0.1, max_tokens: 8000 }),
      });
      if (!response.ok) throw new Error(`Agent 模型请求失败（HTTP ${response.status}）。`);
      const providerMessage = readProviderMessage(await response.json() as unknown);
      if (!providerMessage?.tool_calls?.length) throw new Error("Agent 未返回可执行工具调用。");
      if (providerMessage.tool_calls.length !== 1) throw new Error("Agent 每一步只能调用一个工具，以保证先观察再决策。");
      messages.push({ role: "assistant", content: providerMessage.content ?? null, tool_calls: providerMessage.tool_calls });
      const toolCall = providerMessage.tool_calls[0];
      const result = await executeTriageTool(toolCall, state, intelligenceRepository, agentRepository);
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
    }
    if (!state.decisionSummary) throw new Error("Agent 达到最大步骤数，未形成今日机会推荐。");
  } catch (error) {
    runError = error instanceof Error ? error.message : "Agent 初筛失败。";
  }

  const completedAt = new Date();
  const run: OpportunityTriageRun = {
    id: `TRIAGE-${randomUUID()}`,
    agent: "product-opportunity-agent",
    mode: "daily-triage",
    version: 3,
    briefingDate: state.signals.map((signal) => signal.briefingDate).sort().at(-1) ?? completedAt.toISOString().slice(0, 10),
    objective: "扫描每日候选并决定产品情报准入与深度分析优先级",
    status: state.decisionSummary ? "completed" : "failed",
    model: config.model,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    scannedSignals: state.signals.length,
    candidates: state.candidates,
    recommendedSignalIds: state.recommendedSignalIds,
    reviewSignalIds: state.candidates.filter((candidate) => candidate.recommendation === "skip").map((candidate) => candidate.signalId),
    autoAnalyzedSignalIds: [],
    decisionSummary: state.decisionSummary ?? runError ?? "未形成推荐",
    toolCalls: state.toolCalls,
    error: runError,
  };
  await agentRepository.saveTriageRun(run);
  return run;
}
