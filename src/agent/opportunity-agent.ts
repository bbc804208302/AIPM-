import { randomUUID } from "node:crypto";

import type { IntelligenceRepository } from "@/repositories/intelligence-repository";
import type { OpportunityAgentRepository } from "@/repositories/opportunity-agent-repository";
import type {
  DemandProposal,
  OpportunityAgentMemoryMatch,
  OpportunityAgentRun,
  OpportunityAgentToolCall,
  OpportunityAgentToolName,
} from "@/types/agent";
import type { IntelligenceSignal } from "@/types/intelligence";

type Environment = Readonly<Record<string, string | undefined>>;
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface AgentConfig {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
}

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

interface AgentExecutionState {
  signal: IntelligenceSignal | null;
  memoryMatches: readonly OpportunityAgentMemoryMatch[];
  proposal: DemandProposal | null;
  rejectionReason: string | null;
  toolCalls: OpportunityAgentToolCall[];
  observedSignal: boolean;
  recalledMemory: boolean;
}

const agentTools = [
  {
    type: "function",
    function: {
      name: "get_signal",
      description: "读取需要评估的公开情报及其来源证据。",
      parameters: { type: "object", properties: { signalId: { type: "string" } }, required: ["signalId"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "search_memory",
      description: "检索过去处理过的相似机会，避免重复创建候选需求。",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "create_demand_proposal",
      description: "创建等待产品经理确认的候选需求，不会写入飞书正式需求池。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" }, problem: { type: "string" }, targetUser: { type: "string" },
          opportunity: { type: "string" }, suggestedSolution: { type: "string" }, rationale: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        },
        required: ["title", "problem", "targetUser", "opportunity", "suggestedSolution", "rationale", "priority"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_signal",
      description: "记录该信号暂不值得转化为候选需求的理由。",
      parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"], additionalProperties: false },
    },
  },
] as const;

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function readOpportunityAgentConfig(environment: Environment = process.env): AgentConfig | null {
  if (environment.SIGNALFLOW_OPPORTUNITY_AGENT !== "true") return null;
  const apiKey = environment.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    apiBaseUrl: normalizeApiBaseUrl(environment.LLM_API_BASE_URL?.trim() || "https://api.openai.com/v1"),
    model: environment.LLM_MODEL?.trim() || "gpt-4.1-mini",
  };
}

function parseArguments(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function requiredString(args: Record<string, unknown>, key: string, maximumLength = 800): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${key} 不能为空。`);
  return value.trim().slice(0, maximumLength);
}

function toolInputSummary(name: OpportunityAgentToolName, args: Record<string, unknown>): string {
  if (name === "get_signal") return `读取 Signal ${String(args.signalId ?? "")}`;
  if (name === "search_memory") return `检索“${String(args.query ?? "").slice(0, 60)}”`;
  if (name === "create_demand_proposal") return `创建候选需求“${String(args.title ?? "").slice(0, 60)}”`;
  return "记录暂不转化原因";
}

function buildSignalObservation(signal: IntelligenceSignal): string {
  return JSON.stringify({
    id: signal.id,
    title: signal.titleZh ?? signal.title,
    originalTitle: signal.title,
    summary: signal.summaryZh ?? signal.summary,
    source: signal.source,
    category: signal.category,
    track: signal.track,
    publishedAt: signal.publishedAt,
    url: signal.url,
    heatScore: signal.heatScore ?? null,
  });
}

function buildSystemPrompt(): string {
  return [
    "你是 SignalFlow Product Opportunity Agent，服务于 AI 产品经理。",
    "目标是把公开 Signal 评估为可审阅的产品机会，而不是自动创建正式需求。",
    "必须先调用 get_signal，再调用 search_memory；之后只能调用 create_demand_proposal 或 reject_signal 完成任务。",
    "每一轮只调用一个工具，等待工具返回 Observation 后再决定下一步。",
    "只有当信号包含明确用户问题、目标用户和可落地产品机会时才创建候选需求；新闻热度本身不是需求。",
    "候选需求必须用简体中文，清楚区分事实、判断与建议，不得虚构来源没有提供的事实。",
    "不要输出思维链或内部推理，只通过工具参数给出简洁、可审计的决策结论。",
  ].join("\n");
}

async function executeTool(
  toolCall: ProviderToolCall,
  signalId: string,
  state: AgentExecutionState,
  intelligenceRepository: IntelligenceRepository,
  agentRepository: OpportunityAgentRepository,
): Promise<string> {
  const startedAt = Date.now();
  const name = toolCall.function.name as OpportunityAgentToolName;
  const args = parseArguments(toolCall.function.arguments);
  let outputSummary = "";
  try {
    let output: unknown;
    if (name === "get_signal") {
      const requestedId = requiredString(args, "signalId", 120);
      if (requestedId !== signalId) throw new Error("只能读取当前请求中的 Signal。");
      const signal = await intelligenceRepository.findById(signalId);
      if (!signal) throw new Error("没有找到对应情报。");
      state.signal = signal;
      state.observedSignal = true;
      output = JSON.parse(buildSignalObservation(signal));
      outputSummary = `已读取 ${signal.source} 的公开情报证据`;
    } else if (name === "search_memory") {
      if (!state.observedSignal || !state.signal) throw new Error("请先调用 get_signal。 ");
      const query = requiredString(args, "query", 240);
      state.memoryMatches = await agentRepository.searchMemory(query, signalId);
      state.recalledMemory = true;
      output = { matches: state.memoryMatches };
      outputSummary = `召回 ${state.memoryMatches.length} 条历史决策`;
    } else if (name === "create_demand_proposal") {
      if (!state.observedSignal || !state.recalledMemory || !state.signal) throw new Error("创建候选需求前必须读取 Signal 并检索 Memory。");
      state.proposal = {
        id: `PROP-${randomUUID()}`,
        title: requiredString(args, "title", 120),
        problem: requiredString(args, "problem"),
        targetUser: requiredString(args, "targetUser", 240),
        opportunity: requiredString(args, "opportunity"),
        suggestedSolution: requiredString(args, "suggestedSolution"),
        rationale: requiredString(args, "rationale"),
        priority: ["low", "medium", "high", "urgent"].includes(String(args.priority)) ? String(args.priority) as DemandProposal["priority"] : "medium",
        sourceSignalId: signalId,
        approvalStatus: "pending-human-review",
      };
      output = { proposalId: state.proposal.id, approvalStatus: state.proposal.approvalStatus };
      outputSummary = "已生成候选需求，等待产品经理确认";
    } else if (name === "reject_signal") {
      if (!state.observedSignal || !state.recalledMemory) throw new Error("结束分析前必须读取 Signal 并检索 Memory。");
      state.rejectionReason = requiredString(args, "reason");
      output = { decision: "reject", recorded: true };
      outputSummary = "已记录暂不转化结论";
    } else {
      throw new Error("不支持的工具。 ");
    }
    state.toolCalls.push({ id: toolCall.id, name, status: "success", inputSummary: toolInputSummary(name, args), outputSummary, durationMs: Date.now() - startedAt });
    return JSON.stringify(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "工具执行失败。";
    state.toolCalls.push({ id: toolCall.id, name, status: "failed", inputSummary: toolInputSummary(name, args), outputSummary: message, durationMs: Date.now() - startedAt });
    return JSON.stringify({ error: message });
  }
}

function readProviderMessage(payload: unknown): ProviderMessage | null {
  if (!payload || typeof payload !== "object" || !("choices" in payload) || !Array.isArray(payload.choices)) return null;
  const message = (payload.choices[0] as { message?: unknown } | undefined)?.message;
  if (!message || typeof message !== "object") return null;
  return message as ProviderMessage;
}

export async function runOpportunityAgent(
  signalId: string,
  intelligenceRepository: IntelligenceRepository,
  agentRepository: OpportunityAgentRepository,
  environment: Environment = process.env,
  fetcher: FetchLike = fetch,
): Promise<OpportunityAgentRun> {
  const config = readOpportunityAgentConfig(environment);
  if (!config) throw new Error("请先配置 LLM_API_KEY，并将 SIGNALFLOW_OPPORTUNITY_AGENT 设置为 true。");

  const startedAt = new Date();
  const state: AgentExecutionState = { signal: null, memoryMatches: [], proposal: null, rejectionReason: null, toolCalls: [], observedSignal: false, recalledMemory: false };
  const messages: ConversationMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: `评估 Signal ${signalId} 是否值得转化为候选产品需求。` },
  ];
  let runError: string | null = null;

  try {
    for (let step = 0; step < 6 && !state.proposal && !state.rejectionReason; step += 1) {
      const response = await fetcher(`${config.apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages, tools: agentTools, tool_choice: "auto", temperature: 0.1, max_tokens: 2000 }),
      });
      if (!response.ok) throw new Error(`Agent 模型请求失败（HTTP ${response.status}）。`);
      const providerMessage = readProviderMessage(await response.json() as unknown);
      if (!providerMessage?.tool_calls?.length) throw new Error("Agent 未返回可执行工具调用。");
      if (providerMessage.tool_calls.length !== 1) throw new Error("Agent 每一步只能调用一个工具，以保证先观察再决策。");
      messages.push({ role: "assistant", content: providerMessage.content ?? null, tool_calls: providerMessage.tool_calls });
      for (const toolCall of providerMessage.tool_calls) {
        const result = await executeTool(toolCall, signalId, state, intelligenceRepository, agentRepository);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
        if (state.proposal || state.rejectionReason) break;
      }
    }
    if (!state.proposal && !state.rejectionReason) throw new Error("Agent 达到最大步骤数，未形成可审计结论。");
  } catch (error) {
    runError = error instanceof Error ? error.message : "Agent 执行失败。";
  }

  const completedAt = new Date();
  const decision = state.proposal ? "proposal" : state.rejectionReason ? "reject" : "failed";
  const run: OpportunityAgentRun = {
    id: `RUN-${randomUUID()}`,
    agent: "product-opportunity-agent",
    version: 1,
    signalId,
    signalTitle: state.signal?.titleZh ?? state.signal?.title ?? signalId,
    track: state.signal?.track ?? "technical",
    objective: "评估公开情报并形成可供产品经理确认的候选需求",
    status: decision === "proposal" ? "completed" : decision === "reject" ? "rejected" : "failed",
    decision,
    decisionSummary: state.proposal?.opportunity ?? state.rejectionReason ?? runError ?? "未形成结论",
    model: config.model,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    toolCalls: state.toolCalls,
    memoryMatches: state.memoryMatches,
    proposal: state.proposal,
    error: runError,
  };
  await agentRepository.saveRun(run);
  return run;
}
