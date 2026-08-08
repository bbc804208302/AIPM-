import type { BitableRecord, FeishuRecordsApi } from "@/lib/feishu/records";
import type { LegacyIntelligenceRepository } from "@/repositories/intelligence-repository";
import type { IntelligenceCategory, IntelligenceSignal } from "@/types/intelligence";

import { readBoolean, readDate, readNumber, readText } from "./field-values";

const fields = [
  "情报ID",
  "标题",
  "来源名称",
  "情报类型",
  "AI摘要",
  "影响力评分",
  "新颖度评分",
  "产品启发",
  "抓取时间",
  "发布时间",
  "高价值情报",
  "阅读状态",
  "是否转化为需求",
] as const;

const categoryMap: Record<string, IntelligenceCategory> = {
  模型更新: "model-capability",
  "AI Agent": "agent",
  "AI Coding": "ai-coding",
  AIGC: "multimodal",
  新功能: "product",
  新产品: "product",
};

export function mapIntelligenceRecord(record: BitableRecord): IntelligenceSignal {
  const id = readText(record.fields["情报ID"]) || record.record_id;
  const insight = readText(record.fields["产品启发"]);
  const readStatus = readText(record.fields["阅读状态"]);

  return {
    id,
    briefingDate: readDate(record.fields["抓取时间"] ?? record.fields["发布时间"], record.created_time).slice(0, 10),
    track: "technical",
    title: readText(record.fields["标题"]) || "未命名情报",
    sourceId: "feishu-legacy",
    source: readText(record.fields["来源名称"]),
    sourceGroup: "ai-media",
    sourceType: "api",
    trustTier: "curated",
    category: categoryMap[readText(record.fields["情报类型"])] ?? "other",
    summary: readText(record.fields["AI摘要"]),
    url: "",
    publishedAt: null,
    collectedAt: readDate(record.fields["抓取时间"] ?? record.fields["发布时间"], record.created_time),
    sourceRank: null,
    sourceMetadata: {},
    selectionReason: "历史飞书情报记录",
    impactScore: readNumber(record.fields["影响力评分"]),
    noveltyScore: readNumber(record.fields["新颖度评分"]),
    productInsight: insight || null,
    createdAt: readDate(record.fields["抓取时间"] ?? record.fields["发布时间"], record.created_time),
    highValue: readBoolean(record.fields["高价值情报"]),
    readStatus: readStatus || null,
    convertedToDemand: readBoolean(record.fields["是否转化为需求"]),
  };
}

export function createFeishuIntelligenceRepository(
  records: FeishuRecordsApi,
  tableId: string,
): LegacyIntelligenceRepository {
  return {
    async list() {
      const rows = await records.searchAll(tableId, { fieldNames: fields });
      return rows.map(mapIntelligenceRecord);
    },
    async findById(id) {
      return (await this.list()).find((item) => item.id === id) ?? null;
    },
  };
}
