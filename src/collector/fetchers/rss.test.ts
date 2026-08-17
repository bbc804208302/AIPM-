import assert from "node:assert/strict";
import test from "node:test";

import { fetchRssSource } from "./rss";
import type { CollectorSource } from "../types";

const feed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"><channel><title>Product updates</title>
  <item><title>General company update</title><link>https://example.com/company</link><description>Our Agent platform appears in a footnote.</description><pubDate>Mon, 17 Aug 2026 00:00:00 GMT</pubDate></item>
  <item><title>Agent Skills 1.0 launches</title><link>https://example.com/agent-skills</link><description>A reusable tool system.</description><pubDate>Mon, 17 Aug 2026 01:00:00 GMT</pubDate></item>
</channel></rss>`;

function source(keywordScope: "title" | "all"): CollectorSource {
  return {
    id: "official-changelog",
    name: "Official Changelog",
    type: "rss",
    url: "https://example.com/feed.xml",
    track: "technical",
    category: "ai-media",
    enabled: true,
    limit: 10,
    trustTier: "primary",
    keywords: ["agent"],
    keywordScope,
  };
}

const fetcher = async () => new Response(feed, {
  status: 200,
  headers: { "Content-Type": "application/rss+xml" },
});

test("title-scoped RSS filtering excludes incidental body mentions", async () => {
  const signals = await fetchRssSource(source("title"), fetcher);
  assert.deepEqual(signals.map((signal) => signal.title), ["Agent Skills 1.0 launches"]);
});

test("all-content RSS filtering keeps products whose description contains the keyword", async () => {
  const signals = await fetchRssSource(source("all"), fetcher);
  assert.equal(signals.length, 2);
});
