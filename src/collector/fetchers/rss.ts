import Parser from "rss-parser";

import type { CollectorSource, RawSignal } from "../types";

type Fetcher = typeof fetch;

const parser = new Parser<Record<string, never>, Record<string, unknown>>();

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function safeDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function fetchRssSource(source: CollectorSource, fetcher: Fetcher = fetch): Promise<readonly RawSignal[]> {
  const response = await fetcher(source.url, {
    headers: {
      Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "SignalFlowCollector/0.1 (+https://github.com/bbc804208302/AIPM-)",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`RSS request failed with HTTP ${response.status}.`);
  const feed = await parser.parseString(await response.text());

  return (feed.items ?? []).flatMap((item, index) => {
    const title = typeof item.title === "string" ? item.title : "";
    const url = typeof item.link === "string" ? item.link : "";
    if (!title.trim() || !URL.canParse(url)) return [];
    const content = [item.contentSnippet, item.content, item.summary].find((value) => typeof value === "string") as string | undefined;
    const searchable = (source.keywordScope === "title" ? title : `${title} ${content ?? ""}`).toLowerCase();
    if (source.keywords?.length && !source.keywords.some((keyword) => searchable.includes(keyword.toLowerCase()))) return [];
    const metadata: Readonly<Record<string, string | number | boolean>> = source.focusAreas?.length
      ? { topic: source.focusAreas.join(" / ") }
      : {};
    return [{
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      track: source.track,
      category: source.category,
      trustTier: source.trustTier,
      title,
      url,
      excerpt: stripHtml(content ?? ""),
      publishedAt: safeDate(item.isoDate ?? item.pubDate),
      rank: index + 1,
      metadata,
    }];
  }).slice(0, source.limit);
}
