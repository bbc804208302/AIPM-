import assert from "node:assert/strict";
import test from "node:test";

import { summarizeDemands } from "./summarize-demands";
import type { DemandItem } from "@/types/demands";

const base: DemandItem = {
  id: "DEM-1",
  title: "需求",
  description: "",
  status: "submitted",
  priority: "medium",
  source: null,
  requester: null,
  sourceSignalId: null,
  owner: "产品 A",
  developerOwner: null,
  dueAt: null,
  releasedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  detailFields: [],
};

test("summarizes live demand metrics, funnel, owners, and P0 countdown", () => {
  const summary = summarizeDemands([
    { ...base, priority: "urgent", dueAt: "2026-08-10T12:00:00.000Z" },
    { ...base, id: "DEM-2", status: "developing", owner: "产品 B" },
    { ...base, id: "DEM-3", status: "released", owner: "产品 B" },
  ], new Date("2026-08-08T12:00:00.000Z"));

  assert.equal(summary.total, 3);
  assert.equal(summary.completed, 1);
  assert.equal(summary.averageWaitingDays, 7.5);
  assert.equal(summary.p0.state, "active");
  assert.equal(summary.p0.days, 2);
  assert.equal(summary.p0.seconds, 0);
  assert.equal(summary.funnel.at(-1)?.count, 1);
  assert.equal(summary.owners[0]?.owner, "产品 B");
});
