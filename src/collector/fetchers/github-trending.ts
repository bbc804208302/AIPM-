import * as cheerio from "cheerio";

import type { CollectorSource, RawSignal } from "../types";

type Fetcher = typeof fetch;

function matchesKeywords(text: string, keywords: readonly string[]): boolean {
  const haystack = text.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function fetchGitHubTrending(source: CollectorSource, fetcher: Fetcher = fetch): Promise<readonly RawSignal[]> {
  const response = await fetcher(source.url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; SignalFlowCollector/0.1)",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`GitHub Trending request failed with HTTP ${response.status}.`);
  const $ = cheerio.load(await response.text());
  const results: RawSignal[] = [];

  $("article.Box-row").each((index, element) => {
    if (results.length >= source.limit) return false;
    const href = $(element).find("h2 a").first().attr("href")?.trim();
    const repository = href?.replace(/^\//, "");
    if (!repository || !repository.includes("/")) return;
    const description = compactText($(element).find("p").first().text());
    if (source.keywords?.length && !matchesKeywords(`${repository} ${description}`, source.keywords)) return;
    const language = compactText($(element).find("[itemprop=programmingLanguage]").first().text());
    const starsToday = compactText($(element).find("span.d-inline-block.float-sm-right").first().text());

    results.push({
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      track: source.track,
      category: source.category,
      trustTier: source.trustTier,
      title: repository,
      url: `https://github.com/${repository}`,
      excerpt: description,
      publishedAt: null,
      rank: index + 1,
      metadata: { language, starsToday },
    });
  });

  return results;
}
