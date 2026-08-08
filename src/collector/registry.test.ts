import assert from "node:assert/strict";
import test from "node:test";

import { loadCollectorSources, validateSources } from "./registry";

test("collector registry contains only valid unique enabled sources", () => {
  const sources = loadCollectorSources();
  assert.equal(sources.length, 14);
  assert.equal(new Set(sources.map((source) => source.id)).size, sources.length);
  assert.ok(sources.every((source) => source.enabled));
  assert.equal(sources.filter((source) => source.track === "domain").length, 5);
});

test("collector registry rejects duplicate source ids", () => {
  const source = { id: "same", name: "One", type: "rss", url: "https://example.com/feed", track: "technical", category: "ai-media", enabled: true, limit: 10, trustTier: "primary" };
  assert.throws(() => validateSources([source, { ...source, name: "Two" }]), /Duplicate source id/);
});
