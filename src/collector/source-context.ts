import * as cheerio from "cheerio";

import type { DailyIntelligenceBrief } from "@/types/intelligence";

type FetchLike = typeof fetch;

const maximumHtmlLength = 600_000;
const maximumContextLength = 1_600;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractPageContext(html: string): string {
  const $ = cheerio.load(html.slice(0, maximumHtmlLength));
  const description = cleanText(
    $('meta[property="og:description"]').attr("content")
      || $('meta[name="description"]').attr("content")
      || $('meta[name="twitter:description"]').attr("content")
      || "",
  );
  const paragraphs = $("article p, main p")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .filter((value) => value.length >= 40)
    .slice(0, 3)
    .join(" ");
  return cleanText([description, paragraphs].filter(Boolean).join(" ")).slice(0, maximumContextLength);
}

async function fetchPageContext(url: string, fetcher: FetchLike): Promise<string> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    const response = await fetcher(url, {
      headers: { "user-agent": "SignalFlow/1.0 (+public intelligence review)" },
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return "";
    return extractPageContext(await response.text());
  } catch {
    return "";
  }
}

export async function enrichBriefWithSourceContext(
  brief: DailyIntelligenceBrief,
  fetcher: FetchLike = fetch,
): Promise<DailyIntelligenceBrief> {
  const contexts = await Promise.all(brief.items.map((item) => fetchPageContext(item.url, fetcher)));
  return {
    ...brief,
    items: brief.items.map((item, index) => {
      const pageDescription = contexts[index];
      return pageDescription
        ? { ...item, sourceMetadata: { ...item.sourceMetadata, pageDescription } }
        : item;
    }),
  };
}
