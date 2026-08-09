import assert from "node:assert/strict";
import test from "node:test";

import { calculatePublicHeatScore } from "./heat-score";

test("derives GitHub heat from today's public stars", () => {
  assert.equal(calculatePublicHeatScore("github-trending", { starsToday: "2,483 stars today" }), 86);
});

test("derives X heat from public views and interactions", () => {
  const score = calculatePublicHeatScore("x-viral", { views: 493_863, likes: 851, reposts: 138 });
  assert.ok(score !== null && score >= 80 && score <= 100);
});

test("does not invent heat for RSS without public engagement", () => {
  assert.equal(calculatePublicHeatScore("ai-media", {}), null);
});
