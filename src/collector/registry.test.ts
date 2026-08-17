import assert from "node:assert/strict";
import test from "node:test";

import { loadCollectorSources, validateSources } from "./registry";

test("collector registry contains only valid unique enabled sources", () => {
  const sources = loadCollectorSources();
  assert.equal(sources.length, 17);
  assert.equal(new Set(sources.map((source) => source.id)).size, sources.length);
  assert.ok(sources.every((source) => source.enabled));
  assert.equal(sources.filter((source) => source.track === "domain").length, 5);
  assert.equal(sources.filter((source) => source.track === "technical").length, 12);
  assert.deepEqual(
    sources.filter((source) => ["product-hunt-ai", "github-ai-changelog", "vercel-ai-changelog"].includes(source.id)).map((source) => source.type),
    ["rss", "rss", "rss"],
  );
});

test("collector registry rejects duplicate source ids", () => {
  const source = { id: "same", name: "One", type: "rss", url: "https://example.com/feed", track: "technical", category: "ai-media", enabled: true, limit: 10, trustTier: "primary" };
  assert.throws(() => validateSources([source, { ...source, name: "Two" }]), /Duplicate source id/);
});
