import type { Metadata } from "next";

import { CollectionToolbar } from "@/components/data-table/collection-toolbar";
import { TableScaffold } from "@/components/data-table/table-scaffold";
import { EmptyState } from "@/components/empty-state/empty-state";
import { MetricStrip } from "@/components/metric-card/metric-strip";
import { PageHeader } from "@/components/workspace/page-header";

export const metadata: Metadata = { title: "内部需求池 · SignalFlow" };

const metrics = [
  { label: "全部需求" },
  { label: "待评估" },
  { label: "开发中" },
  { label: "已上线" },
];

export default function DemandsPage() {
  return (
    <div className="workspace-page">
      <PageHeader eyebrow="AI demand management" title="内部需求池" description="让需求决策、负责人和交付状态对协作方持续透明。" />
      <MetricStrip metrics={metrics} />
      <CollectionToolbar searchPlaceholder="搜索需求标题、负责人或状态" modes={["table", "kanban"]} />
      <TableScaffold label="内部需求列表" columns={["需求", "状态", "优先级", "负责人", "来源 Signal", "更新时间"]}>
        <EmptyState
          title="暂无内部需求"
          description={<>未来在这里承接完整转化链路：<br />Signal → Insight → Demand → Execution</>}
          meta="FEISHU BITABLE · NOT CONNECTED"
        />
      </TableScaffold>
      <p className="page-footnote">已预留 Kanban View、Table View 与 Demand Detail Page 组件边界。</p>
    </div>
  );
}
