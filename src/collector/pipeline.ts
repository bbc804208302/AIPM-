import { fetchCollectorSource } from "./dispatch";
import { deduplicateSignals, normalizeSignal } from "./normalize";
import { loadCollectorSources } from "./registry";
import type { CollectorRunResult, CollectorTrack, DomainFocusArea, IntelligenceCandidate, SourceRunReport } from "./types";

const categoryLimits = {
  "github-trending": 15,
  "ai-media": 60,
  "x-viral": 15,
} as const;

const mediaLookbackDays = 15;

export interface CollectOptions {
  sourceIds?: readonly string[];
  track?: CollectorTrack;
  perSourceLimit?: number;
  now?: () => Date;
  focusAreas?: readonly DomainFocusArea[];
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 240) : "Unknown collector error";
}

export function curateIntelligenceCandidates(signals: readonly IntelligenceCandidate[], collectedAt: string): readonly IntelligenceCandidate[] {
  const oldestMediaTime = Date.parse(collectedAt) - mediaLookbackDays * 24 * 60 * 60 * 1_000;
  return (Object.keys(categoryLimits) as (keyof typeof categoryLimits)[]).flatMap((category) => {
    const categorySignals = signals
      .filter((signal) => signal.category === category)
      .filter((signal) => category !== "ai-media" || !signal.publishedAt || Date.parse(signal.publishedAt) >= oldestMediaTime)
      .sort((a, b) => {
        if (category === "ai-media") return Date.parse(b.publishedAt ?? "1970-01-01") - Date.parse(a.publishedAt ?? "1970-01-01");
        return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
      });
    return categorySignals.slice(0, categoryLimits[category]);
  });
}

export async function collectIntelligenceSignals(options: CollectOptions = {}): Promise<CollectorRunResult> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const selected = loadCollectorSources().filter((source) => {
    if (!source.enabled) return false;
    if (source.track !== (options.track ?? "technical")) return false;
    if (source.track === "domain" && options.focusAreas?.length && !source.focusAreas?.some((area) => options.focusAreas?.includes(area))) return false;
    return !options.sourceIds?.length || options.sourceIds.includes(source.id);
  });
  const reports: SourceRunReport[] = [];
  const signals: IntelligenceCandidate[] = [];

  await Promise.all(selected.map(async (source) => {
    const started = Date.now();
    try {
      const sourceWithLimit = {
        ...source,
        limit: options.perSourceLimit ? Math.min(source.limit, options.perSourceLimit) : source.limit,
        focusAreas: source.focusAreas?.filter((area) => !options.focusAreas?.length || options.focusAreas.includes(area)),
      };
      const raw = await fetchCollectorSource(sourceWithLimit);
      const collectedAt = now().toISOString();
      const normalized = raw.flatMap((item) => {
        const signal = normalizeSignal(item, collectedAt);
        return signal ? [signal] : [];
      });
      signals.push(...normalized);
      reports.push({ sourceId: source.id, sourceName: source.name, status: "success", collected: normalized.length, durationMs: Date.now() - started });
    } catch (error) {
      reports.push({ sourceId: source.id, sourceName: source.name, status: "failed", collected: 0, durationMs: Date.now() - started, error: safeError(error) });
    }
  }));

  reports.sort((a, b) => selected.findIndex((source) => source.id === a.sourceId) - selected.findIndex((source) => source.id === b.sourceId));
  const unique = deduplicateSignals(signals);
  return { startedAt, finishedAt: now().toISOString(), signals: curateIntelligenceCandidates(unique, startedAt), sources: reports };
}
