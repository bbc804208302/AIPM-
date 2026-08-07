import type { Metadata } from "next";

import { AtSign, Braces, Github, Rss, Webhook } from "lucide-react";

import { TableScaffold } from "@/components/data-table/table-scaffold";
import { EmptyState } from "@/components/empty-state/empty-state";
import { PageHeader } from "@/components/workspace/page-header";

export const metadata: Metadata = { title: "数据源 · SignalFlow" };

const sourceTypes = [
  { label: "RSS", icon: Rss },
  { label: "API", icon: Webhook },
  { label: "GitHub", icon: Github },
  { label: "Website", icon: Braces },
  { label: "Newsletter", icon: AtSign },
];

export default function SourcesPage() {
  return (
    <div className="workspace-page">
      <PageHeader eyebrow="Collector source registry" title="数据源" description="管理 SignalFlow 的信息来源、采集方式与来源健康状态。" />
      <section className="source-type-strip" aria-label="支持的数据源类型">
        <span className="source-type-label">Source Types</span>
        {sourceTypes.map(({ label, icon: Icon }) => <span className="source-type" key={label}><Icon size={14} />{label}</span>)}
      </section>
      <TableScaffold label="数据源注册表" columns={["数据源", "类型", "状态", "健康检查", "最后抓取", "操作"]}>
        <EmptyState
          title="暂无数据源"
          description={<>后续将支持数据源添加、健康检查与抓取状态追踪。<br />当前阶段不启动 Collector。</>}
          meta="SOURCE REGISTRY · EMPTY"
        />
      </TableScaffold>
    </div>
  );
}
