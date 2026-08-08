import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/workspace/page-header";
import { loadDemandDetail } from "@/services/load-demand-workspace";

export const metadata: Metadata = { title: "需求详情 · SignalFlow" };
export const dynamic = "force-dynamic";

export default async function DemandDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const { item, state } = await loadDemandDetail(id);
  if (state === "ready" && !item) notFound();

  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="Feishu demand record"
        title={item?.title ?? "需求详情不可用"}
        description={item ? `需求编号 ${item.id} · 以下内容只读同步自飞书多维表格。` : "暂时无法读取该条飞书需求，请检查连接配置。"}
        action={<Link className="detail-back-link" href="/demands">返回需求池</Link>}
      />
      {item ? (
        <section className="demand-detail-sheet" aria-label="飞书需求完整字段">
          <header><span>FIELD</span><span>VALUE</span></header>
          {item.detailFields.map((field) => (
            <div className="demand-detail-row" key={field.label}>
              <strong>{field.label}</strong>
              <span>{field.value}</span>
            </div>
          ))}
        </section>
      ) : <p className="dashboard-data-warning">飞书需求数据暂时不可用。</p>}
    </div>
  );
}
