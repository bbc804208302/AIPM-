import type { Metadata } from "next";

import { DemandDashboard } from "@/components/demands/demand-dashboard";
import { PageHeader } from "@/components/workspace/page-header";
import { loadDemandWorkspace } from "@/services/load-demand-workspace";
import { summarizeDemands } from "@/services/summarize-demands";

export const metadata: Metadata = { title: "产品需求看板 · SignalFlow" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { items, state } = await loadDemandWorkspace();
  const summary = summarizeDemands(items);
  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="Product demand command center"
        title="产品需求看板"
        description="从飞书需求池实时汇总交付节奏、P0 风险、负责人负载与状态转化。"
      />
      <DemandDashboard summary={summary} dataState={state} />
      <p className="page-footnote">看板指标只读计算自飞书需求数据；需求明细、搜索与后续 Kanban 操作仍在“内部需求池”中完成。</p>
    </div>
  );
}
