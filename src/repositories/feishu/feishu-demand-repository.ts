import type { BitableRecord, FeishuRecordsApi } from "@/lib/feishu/records";
import type { DemandRepository } from "@/repositories/demand-repository";
import type { DemandItem, DemandPriority, DemandStatus } from "@/types/demands";

import { readDate, readDisplayValue, readOptionalDate, readText } from "./field-values";

const detailFieldOrder = [
  "需求ID", "需求名称", "需求描述", "需求来源", "提出人", "需求类型", "优先级", "当前状态",
  "产品负责人", "开发负责人", "来源情报ID", "提交时间", "更新时间", "预计上线时间", "实际上线时间",
] as const;

const statusMap: Record<string, DemandStatus> = {
  待评估: "submitted",
  评估中: "evaluating",
  已接受: "accepted",
  待开发: "accepted",
  开发中: "developing",
  测试中: "testing",
  已上线: "released",
  已驳回: "rejected",
  已暂停: "rejected",
};

function mapStatus(value: unknown): DemandStatus {
  return statusMap[readText(value)] ?? "submitted";
}

function mapPriority(value: unknown): DemandPriority {
  const label = readText(value);
  if (label.startsWith("P0")) return "urgent";
  if (label.startsWith("P1")) return "high";
  if (label.startsWith("P2")) return "medium";
  return "low";
}

const detailDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function mapDetailValue(label: string, value: unknown): string {
  if (/时间|日期/.test(label)) {
    const date = readOptionalDate(value);
    if (date) return detailDateFormatter.format(new Date(date));
  }
  return readDisplayValue(value);
}

export function mapDemandRecord(record: BitableRecord): DemandItem {
  const id = readText(record.fields["需求ID"]) || record.record_id;
  const owner = readText(record.fields["产品负责人"]);
  const developerOwner = readText(record.fields["开发负责人"]);
  const sourceSignalId = readText(record.fields["来源情报ID"]);
  const source = readText(record.fields["需求来源"]);
  const requester = readText(record.fields["提出人"]);
  const labels = Object.keys(record.fields).sort((left, right) => {
    const leftIndex = detailFieldOrder.indexOf(left as typeof detailFieldOrder[number]);
    const rightIndex = detailFieldOrder.indexOf(right as typeof detailFieldOrder[number]);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
      || left.localeCompare(right, "zh-CN");
  });

  return {
    id,
    title: readText(record.fields["需求名称"]) || "未命名需求",
    description: readText(record.fields["需求描述"]),
    status: mapStatus(record.fields["当前状态"]),
    priority: mapPriority(record.fields["优先级"]),
    source: source || null,
    requester: requester || null,
    sourceSignalId: sourceSignalId || null,
    owner: owner || null,
    developerOwner: developerOwner || null,
    dueAt: readOptionalDate(record.fields["预计上线时间"]),
    releasedAt: readOptionalDate(record.fields["实际上线时间"]),
    createdAt: readDate(record.fields["提交时间"], record.created_time),
    updatedAt: readDate(record.fields["更新时间"], record.last_modified_time),
    detailFields: labels.map((label) => ({ label, value: mapDetailValue(label, record.fields[label]) })),
  };
}

export function createFeishuDemandRepository(
  records: FeishuRecordsApi,
  tableId: string,
): DemandRepository {
  return {
    async list() {
      const rows = await records.searchAll(tableId);
      return rows.map(mapDemandRecord);
    },
    async findById(id) {
      return (await this.list()).find((item) => item.id === id) ?? null;
    },
  };
}
