import assert from "node:assert/strict";
import test from "node:test";

import { mapDemandRecord } from "./feishu-demand-repository";
import { mapIntelligenceRecord } from "./feishu-intelligence-repository";

test("maps a Feishu demand record into the stable demand domain", () => {
  const demand = mapDemandRecord({
    record_id: "rec-demand",
    fields: {
      需求ID: 8,
      需求名称: [{ type: "text", text: "权限透明化" }],
      需求描述: "让提交人看到处理状态",
      当前状态: "开发中",
      优先级: "P1 高",
      需求来源: "内部反馈",
      提出人: [{ name: "业务同学" }],
      产品负责人: [{ name: "产品负责人" }],
      开发负责人: [{ name: "开发负责人" }],
      预计上线时间: 1_700_086_400_000,
      实际上线时间: null,
      来源情报ID: "SIG-003",
      提交时间: 1_700_000_000_000,
      更新时间: 1_700_000_100_000,
    },
  });

  assert.equal(demand.id, "8");
  assert.equal(demand.title, "权限透明化");
  assert.equal(demand.status, "developing");
  assert.equal(demand.priority, "high");
  assert.equal(demand.source, "内部反馈");
  assert.equal(demand.requester, "业务同学");
  assert.equal(demand.owner, "产品负责人");
  assert.equal(demand.developerOwner, "开发负责人");
  assert.equal(demand.dueAt, "2023-11-15T22:13:20.000Z");
  assert.equal(demand.releasedAt, null);
  assert.equal(demand.sourceSignalId, "SIG-003");
  assert.ok(demand.detailFields.some((field) => field.label === "需求来源" && field.value === "内部反馈"));
  assert.ok(demand.detailFields.some((field) => field.label === "提交时间" && !field.value.includes("1700000000000")));
});

test("maps a Feishu intelligence record and analysis flags", () => {
  const signal = mapIntelligenceRecord({
    record_id: "rec-signal",
    fields: {
      情报ID: "SIG-009",
      标题: "新的 Agent 能力",
      来源名称: "Official Blog",
      情报类型: "AI Agent",
      AI摘要: "摘要",
      影响力评分: 8,
      新颖度评分: "7",
      产品启发: "产品启发",
      抓取时间: 1_700_000_000_000,
      高价值情报: true,
      阅读状态: "未读",
      是否转化为需求: false,
    },
  });

  assert.equal(signal.id, "SIG-009");
  assert.equal(signal.category, "agent");
  assert.equal(signal.impactScore, 8);
  assert.equal(signal.noveltyScore, 7);
  assert.equal(signal.highValue, true);
  assert.equal(signal.convertedToDemand, false);
});
