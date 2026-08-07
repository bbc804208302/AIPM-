import type { Metadata } from "next";

import { TableScaffold } from "@/components/data-table/table-scaffold";
import { EmptyState } from "@/components/empty-state/empty-state";
import { MetricStrip } from "@/components/metric-card/metric-strip";
import { PageHeader } from "@/components/workspace/page-header";

export const metadata: Metadata = { title: "采集任务 · SignalFlow" };

const metrics = [
  { label: "任务总数" },
  { label: "运行中" },
  { label: "异常任务" },
  { label: "平均成功率" },
];

export default function TasksPage() {
  return (
    <div className="workspace-page">
      <PageHeader eyebrow="Collector workflow monitor" title="采集任务" description="观察 Collector 工作流的运行状态、执行时间与稳定性。" />
      <MetricStrip metrics={metrics} />
      <TableScaffold label="采集任务列表" columns={["任务名称", "数据源", "运行状态", "最后执行时间", "成功率"]}>
        <EmptyState
          title="暂无采集任务"
          description={<>未来将在这里接入 GitHub Actions、Scheduler 与 Collector，<br />统一监控任务执行质量。</>}
          meta="WORKFLOW MONITOR · IDLE"
        />
      </TableScaffold>
    </div>
  );
}
