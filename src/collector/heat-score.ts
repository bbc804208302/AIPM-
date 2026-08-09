import type { CollectorCategory } from "./types";

type Metadata = Readonly<Record<string, string | number | boolean>>;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readNumber(metadata: Metadata, key: string): number {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function readStarsToday(metadata: Metadata): number {
  const value = metadata.starsToday;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Public attention score, not factual confidence. Returns null when a source
 * does not expose auditable engagement data.
 */
export function calculatePublicHeatScore(sourceGroup: CollectorCategory, metadata: Metadata): number | null {
  if (sourceGroup === "github-trending") {
    const starsToday = readStarsToday(metadata);
    return starsToday > 0 ? clampScore(32 + Math.log10(starsToday + 1) * 16) : null;
  }

  if (sourceGroup === "x-viral") {
    const views = readNumber(metadata, "views");
    const likes = readNumber(metadata, "likes");
    const reposts = readNumber(metadata, "reposts");
    if (views + likes + reposts === 0) return null;
    const attention = views * 0.01 + likes * 2 + reposts * 3;
    return clampScore(24 + Math.log10(attention + 1) * 15);
  }

  return null;
}
