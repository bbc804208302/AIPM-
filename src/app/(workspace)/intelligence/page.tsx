import type { Metadata } from "next";

import { CollectionToolbar } from "@/components/data-table/collection-toolbar";
import { TableScaffold } from "@/components/data-table/table-scaffold";
import { EmptyState } from "@/components/empty-state/empty-state";
import { MetricStrip } from "@/components/metric-card/metric-strip";
import { PageHeader } from "@/components/workspace/page-header";

export const metadata: Metadata = { title: "AI 产品情报池 · SignalFlow" };

const metrics = [
  { label: "全部情报" },
  { label: "高价值情报" },
  { label: "待分析" },
  { label: "已转需求" },
];

export default function IntelligencePage() {
  return (
    <div className="workspace-page">
      <PageHeader eyebrow="Product intelligence workspace" title="AI 产品情报池" description="聚合 AI 行业变化，通过 AI 分析转化为产品洞察。" />
      <MetricStrip metrics={metrics} />
      <CollectionToolbar searchPlaceholder="搜索标题、来源或产品洞察" modes={["list", "table"]} />
      <TableScaffold label="AI 产品情报列表" columns={["情报", "来源", "分类", "影响评分", "分析状态", "创建时间"]}>
        <EmptyState
          title="暂无 AI 产品情报"
          description={<>等待 Collector 接入后，系统将自动同步 AI 行业 Signal，<br />并通过 AI Analyzer 生成产品洞察。</>}
          meta="COLLECTOR · NOT CONNECTED"
        />
      </TableScaffold>
      <p className="page-footnote">已预留 Search、Filter、Table/List View 与 Detail Drawer 组件边界。</p>
    </div>
  );
}
