import type { Metadata } from "next";

import { AtSign, Braces, Github, Rss, Webhook } from "lucide-react";

import { MetricStrip } from "@/components/metric-card/metric-strip";
import { SourceRegistryControls } from "@/components/sources/source-registry-controls";
import { PageHeader } from "@/components/workspace/page-header";
import { loadCollectorWorkspace } from "@/services/load-collector-workspace";

export const metadata: Metadata = { title: "数据源 · SignalFlow" };
export const dynamic = "force-dynamic";

const sourceTypes = [
  { label: "RSS", icon: Rss },
  { label: "API", icon: Webhook },
  { label: "GitHub", icon: Github },
  { label: "Website", icon: Braces },
  { label: "Newsletter", icon: AtSign },
];

export default async function SourcesPage() {
  const { sources, latestBrief, domainBrief, domainSources, editable } = await loadCollectorWorkspace();
  const reports = latestBrief?.sources ?? [];
  const metrics = [
    { label: "全部来源", value: String(sources.length + domainSources.length), hint: "AI 行业 + 业务领域" },
    { label: "自动采集", value: String(sources.filter((source) => source.enabled).length), hint: `共 ${sources.length} 个 AI 行业来源` },
    { label: "业务领域来源", value: String(domainSources.length), hint: domainBrief?.briefingDate ?? "尚无快照" },
    { label: "最近异常", value: String(reports.filter((source) => source.status === "failed").length), hint: "单源失败隔离" },
  ];

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="Collector source registry" title="数据源" description="分别管理 AI 行业自动采集来源与业务领域人工审校来源。" />
      <MetricStrip metrics={metrics} />
      <section className="source-type-strip" aria-label="支持的数据源类型">
        <span className="source-type-label">Source Types</span>
        {sourceTypes.map(({ label, icon: Icon }) => <span className="source-type" key={label}><Icon size={14} />{label}</span>)}
      </section>
      <section className="registry-group-heading registry-group-technical">
        <div><span>01 / AUTOMATED</span><h2>AI 行业情报数据源</h2><p>GitHub Trending、AI 媒体与 AttentionVC AI 的自动采集来源。</p></div>
        <strong>{sources.length} SOURCES</strong>
      </section>
      <SourceRegistryControls sources={sources} reports={reports} editable={editable} />
      <section className="registry-group-heading registry-group-domain">
        <div><span>02 / CURATED</span><h2>业务领域情报数据源</h2><p>动漫、短剧、影视与 AIGC 制作流程的聚焦来源。</p></div>
        <strong>{domainSources.length} SOURCES</strong>
      </section>
      <SourceRegistryControls sources={domainSources} reports={domainBrief?.sources ?? []} editable={editable} label="业务领域情报数据源" />
      <p className="page-footnote">AI 行业与业务领域使用独立来源集合；关闭来源后，下一次对应采集任务将不再请求该来源。</p>
    </div>
  );
}
