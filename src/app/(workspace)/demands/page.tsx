import type { Metadata } from "next";
import Link from "next/link";

import { DataTableRows } from "@/components/data-table/data-table-rows";
import { TableScaffold } from "@/components/data-table/table-scaffold";
import { DemandStatusFilters, type DemandFilter } from "@/components/demands/demand-status-filters";
import { EmptyState } from "@/components/empty-state/empty-state";
import { PageHeader } from "@/components/workspace/page-header";
import { loadDemandWorkspace } from "@/services/load-demand-workspace";
import type { DemandPriority, DemandStatus } from "@/types/demands";

export const metadata: Metadata = { title: "内部需求池 · SignalFlow" };
export const dynamic = "force-dynamic";

const statusLabels: Record<DemandStatus, string> = {
  submitted: "待评估",
  evaluating: "评估中",
  accepted: "已接受",
  rejected: "已驳回 / 暂停",
  developing: "开发中",
  testing: "测试中",
  released: "已上线",
};

const priorityLabels: Record<DemandPriority, string> = {
  urgent: "P0 紧急",
  high: "P1 高",
  medium: "P2 中",
  low: "P3 低",
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });

function isDemandFilter(value: string | undefined): value is DemandFilter {
  return value === "all" || value === "pending" || value === "developing" || value === "released";
}

export default async function DemandsPage({ searchParams }: Readonly<{ searchParams: Promise<{ status?: string }> }>) {
  const { items, state } = await loadDemandWorkspace();
  const requestedStatus = (await searchParams).status;
  const activeFilter: DemandFilter = isDemandFilter(requestedStatus) ? requestedStatus : "all";
  const metrics = [
    { key: "all", label: "全部需求", value: items.length, hint: "飞书多维表格" },
    { key: "pending", label: "待评估", value: items.filter((item) => item.status === "submitted" || item.status === "evaluating").length, hint: "等待产品判断" },
    { key: "developing", label: "开发中", value: items.filter((item) => item.status === "developing").length, hint: "正在执行" },
    { key: "released", label: "已上线", value: items.filter((item) => item.status === "released").length, hint: "完成交付" },
  ] satisfies readonly { key: DemandFilter; label: string; value: number; hint: string }[];
  const visibleItems = items.filter((item) => {
    if (activeFilter === "pending") return item.status === "submitted" || item.status === "evaluating";
    if (activeFilter === "developing") return item.status === "developing";
    if (activeFilter === "released") return item.status === "released";
    return true;
  });

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="AI demand management" title="内部需求池" description="让需求决策、负责人和交付状态对协作方持续透明。" />
      <DemandStatusFilters active={activeFilter} metrics={metrics} />
      <TableScaffold label="内部需求列表" columns={["需求", "状态", "优先级", "提出人", "负责人", "需求来源", "更新时间", "操作"]}>
        {visibleItems.length > 0 ? (
          <DataTableRows rows={visibleItems.map((item) => ({
            id: item.id,
            cells: [
              <div className="primary-cell" key="title"><strong>{item.title}</strong><span>{item.id}</span></div>,
              <span className={`status-badge status-${item.status}`} key="status">{statusLabels[item.status]}</span>,
              <span className={`priority-badge priority-${item.priority}`} key="priority">{priorityLabels[item.priority]}</span>,
              <span key="requester">{item.requester ?? "—"}</span>,
              <span key="owner">{item.owner ?? "未分配"}</span>,
              <span key="source">{item.source ?? "—"}</span>,
              <time key="updated" dateTime={item.updatedAt}>{dateFormatter.format(new Date(item.updatedAt))}</time>,
              <Link className="detail-link" href={`/demands/${encodeURIComponent(item.id)}`} key="detail">查看详情</Link>,
            ],
          }))} />
        ) : (
          <EmptyState
            title={state === "error" ? "飞书数据暂时不可用" : activeFilter === "all" ? "暂无内部需求" : "当前筛选下暂无需求"}
            description={state === "error" ? "请检查飞书应用权限和本地环境配置。" : activeFilter === "all" ? <>未来在这里承接完整转化链路：<br />Signal → Insight → Demand → Execution</> : "点击上方其他状态继续查看。"}
            meta={state === "error" ? "FEISHU BITABLE · CONNECTION ERROR" : "FEISHU BITABLE · CONNECTED"}
          />
        )}
      </TableScaffold>
      <p className="page-footnote">数据只读同步自飞书多维表格；点击指标筛选列表，点击“查看详情”读取该条记录的完整字段。</p>
    </div>
  );
}
