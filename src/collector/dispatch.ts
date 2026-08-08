import { fetchAttentionVc } from "./fetchers/attentionvc";
import { fetchGitHubTrending } from "./fetchers/github-trending";
import { fetchRssSource } from "./fetchers/rss";
import type { CollectorSource, RawSignal } from "./types";

export async function fetchCollectorSource(source: CollectorSource): Promise<readonly RawSignal[]> {
  if (source.id === "github-trending") return fetchGitHubTrending(source);
  if (source.id === "attentionvc-ai") return fetchAttentionVc(source);
  if (source.type === "rss") return fetchRssSource(source);
  throw new Error(`No collector adapter registered for ${source.id}.`);
}
