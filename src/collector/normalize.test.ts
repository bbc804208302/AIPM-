import assert from "node:assert/strict";
import test from "node:test";

import { deduplicateSignals, normalizeSignal } from "./normalize";
import type { RawSignal } from "./types";

const raw: RawSignal = {
  sourceId: "openai-news",
  sourceName: "OpenAI News",
  sourceType: "rss",
  track: "technical",
  category: "ai-media",
  trustTier: "primary",
  title: "  Product update  ",
  url: "https://example.com/update/?utm_source=test#section",
  excerpt: "New   capability",
  publishedAt: "2026-08-08T00:00:00.000Z",
  rank: 1,
  metadata: {},
};

test("normalizes URLs and creates stable signal identities", () => {
  const signal = normalizeSignal(raw, "2026-08-08T08:00:00.000Z");
  assert.ok(signal);
  assert.equal(signal.title, "Product update");
  assert.equal(signal.canonicalUrl, "https://example.com/update");
  assert.match(signal.id, /^SIG-20260808-[A-F0-9]{8}$/);
});

test("deduplicates candidates by canonical URL fingerprint", () => {
  const first = normalizeSignal(raw, "2026-08-08T08:00:00.000Z");
  const second = normalizeSignal({ ...raw, sourceId: "tldr-ai" }, "2026-08-08T08:01:00.000Z");
  assert.ok(first && second);
  assert.equal(deduplicateSignals([first, second]).length, 1);
});
