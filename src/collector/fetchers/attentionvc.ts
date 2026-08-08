import type { CollectorSource, RawSignal } from "../types";

type Fetcher = typeof fetch;

interface AttentionEntry {
  rank?: number;
  tweetId?: string;
  title?: string;
  previewText?: string;
  tweetCreatedAt?: string;
  lang?: string;
  langsDetected?: string[];
  author?: { handle?: string; name?: string; followers?: number };
  viewCount?: number;
  likeCount?: number;
  retweetCount?: number;
}

interface AttentionResponse {
  entries?: AttentionEntry[];
}

function isEnglish(entry: AttentionEntry): boolean {
  if (entry.langsDetected?.length) return entry.langsDetected.includes("en");
  return entry.lang === "en" || entry.lang === "zxx" || entry.lang === undefined;
}

export async function fetchAttentionVc(source: CollectorSource, fetcher: Fetcher = fetch): Promise<readonly RawSignal[]> {
  const response = await fetcher(source.url, {
    headers: { Accept: "application/json", "User-Agent": "SignalFlowCollector/0.1" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`AttentionVC request failed with HTTP ${response.status}.`);
  const data = await response.json() as AttentionResponse;

  return (data.entries ?? []).filter(isEnglish).slice(0, source.limit).flatMap((entry, index) => {
    const handle = entry.author?.handle?.trim();
    const tweetId = entry.tweetId?.trim();
    const title = entry.title?.trim();
    if (!handle || !tweetId || !title) return [];
    const published = entry.tweetCreatedAt ? new Date(entry.tweetCreatedAt) : null;

    return [{
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      track: source.track,
      category: source.category,
      trustTier: source.trustTier,
      title,
      url: `https://x.com/${handle}/status/${tweetId}`,
      excerpt: entry.previewText ?? "",
      publishedAt: published && !Number.isNaN(published.getTime()) ? published.toISOString() : null,
      rank: entry.rank ?? index + 1,
      metadata: {
        author: `@${handle}`,
        followers: entry.author?.followers ?? 0,
        views: entry.viewCount ?? 0,
        likes: entry.likeCount ?? 0,
        reposts: entry.retweetCount ?? 0,
      },
    }];
  });
}
