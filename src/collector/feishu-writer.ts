import { randomUUID } from "node:crypto";

import { createFeishuClient } from "@/lib/feishu/client-core";
import { FeishuConfigurationError } from "@/lib/feishu/errors";

import type { IntelligenceCandidate } from "./types";

const existingFields = ["情报ID", "原文链接"] as const;

export interface FeishuWriteResult {
  incoming: number;
  created: number;
  skippedAsDuplicate: number;
}

function readUrl(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(readUrl).find(Boolean) ?? "";
  if (value && typeof value === "object") {
    const entry = value as Record<string, unknown>;
    if (typeof entry.link === "string") return entry.link;
    if (typeof entry.url === "string") return entry.url;
  }
  return "";
}

function inferIntelligenceType(signal: IntelligenceCandidate): string {
  const text = `${signal.title} ${signal.excerpt}`.toLowerCase();
  if (/\bagent\b|agentic/.test(text)) return "AI Agent";
  if (/coding|code generation|copilot|developer tool/.test(text)) return "AI Coding";
  if (/gpt|gemini|claude|llama|mistral|model|inference|reasoning/.test(text)) return "模型更新";
  if (/image|video|audio|multimodal|diffusion|generative media/.test(text)) return "AIGC";
  if (/paper|research|study|benchmark/.test(text)) return "研究进展";
  if (/launch|release|introducing|new product/.test(text)) return "新产品";
  if (/feature|update|upgrade/.test(text)) return "新功能";
  return "行业动态";
}

function inferFocusAreas(signal: IntelligenceCandidate): string[] {
  const text = `${signal.title} ${signal.excerpt}`.toLowerCase();
  const areas: string[] = [];
  if (/\bagent\b|agentic|mcp/.test(text)) areas.push("AI Agent");
  if (/coding|code generation|copilot|developer tool/.test(text)) areas.push("AI Coding");
  if (/video/.test(text)) areas.push("AI视频");
  if (/image|diffusion/.test(text)) areas.push("AI图片");
  if (/audio|speech|voice/.test(text)) areas.push("AI音频");
  if (/search|retrieval|rag/.test(text)) areas.push("AI搜索");
  if (/multimodal/.test(text)) areas.push("多模态");
  if (/model|llm|gpt|gemini|claude|llama|mistral|inference|reasoning/.test(text)) areas.push("基础模型");
  return [...new Set(areas)].slice(0, 4);
}

function sourceType(signal: IntelligenceCandidate): string {
  if (signal.trustTier === "primary") return "官方Blog";
  if (signal.sourceType === "rss") return "媒体";
  return "社区";
}

function sourceAbstract(signal: IntelligenceCandidate): string {
  const metadata = Object.entries(signal.metadata)
    .filter(([, value]) => value !== "" && value !== 0 && value !== false)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
  return [signal.excerpt, metadata ? `来源热度：${metadata}` : ""].filter(Boolean).join("\n");
}

export function mapCandidateToFeishuFields(signal: IntelligenceCandidate): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    情报ID: signal.id,
    标题: signal.title,
    情报类型: inferIntelligenceType(signal),
    来源名称: signal.sourceName,
    来源类型: sourceType(signal),
    原文链接: { link: signal.canonicalUrl, text: "查看原文" },
    抓取时间: Date.parse(signal.collectedAt),
    AI摘要: sourceAbstract(signal),
    高价值情报: false,
    阅读状态: "未读",
    是否转化为需求: false,
  };
  const focusAreas = inferFocusAreas(signal);
  if (focusAreas.length) fields["关注领域"] = focusAreas;
  if (signal.publishedAt) fields["发布时间"] = Date.parse(signal.publishedAt);
  return fields;
}

export async function writeCandidatesToFeishu(signals: readonly IntelligenceCandidate[]): Promise<FeishuWriteResult> {
  const client = createFeishuClient();
  const tableId = client.tables.intelligenceTableId;
  if (!tableId) throw new FeishuConfigurationError("FEISHU_INTELLIGENCE_TABLE_ID");
  const existing = await client.records.searchAll(tableId, { fieldNames: existingFields });
  const knownIds = new Set(existing.map((record) => String(record.fields["情报ID"] ?? "")).filter(Boolean));
  const knownUrls = new Set(existing.map((record) => readUrl(record.fields["原文链接"])).filter(Boolean));
  const pending = signals.filter((signal) => !knownIds.has(signal.id) && !knownUrls.has(signal.canonicalUrl));

  let created = 0;
  for (let index = 0; index < pending.length; index += 200) {
    const chunk = pending.slice(index, index + 200).map(mapCandidateToFeishuFields);
    created += (await client.records.createMany(tableId, chunk, randomUUID())).length;
  }

  return { incoming: signals.length, created, skippedAsDuplicate: signals.length - pending.length };
}
