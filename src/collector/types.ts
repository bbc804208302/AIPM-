export type CollectorSourceType = "rss" | "api" | "scrape";
export type CollectorCategory = "github-trending" | "ai-media" | "x-viral";
export type CollectorTrack = "technical" | "domain";
export type SourceTrustTier = "primary" | "curated" | "community";
export type DomainFocusArea = "动漫" | "短剧" | "影视" | "AIGC";

export interface CollectorSource {
  id: string;
  name: string;
  type: CollectorSourceType;
  url: string;
  track: CollectorTrack;
  category: CollectorCategory;
  enabled: boolean;
  limit: number;
  trustTier: SourceTrustTier;
  keywords?: readonly string[];
  focusAreas?: readonly DomainFocusArea[];
  notes?: string;
}

export interface RawSignal {
  sourceId: string;
  sourceName: string;
  sourceType: CollectorSourceType;
  track: CollectorTrack;
  category: CollectorCategory;
  trustTier: SourceTrustTier;
  title: string;
  url: string;
  excerpt: string;
  publishedAt: string | null;
  rank: number | null;
  metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface IntelligenceCandidate extends RawSignal {
  id: string;
  canonicalUrl: string;
  fingerprint: string;
  collectedAt: string;
}

export interface SourceRunReport {
  sourceId: string;
  sourceName: string;
  status: "success" | "failed";
  collected: number;
  durationMs: number;
  error?: string;
}

export interface CollectorRunResult {
  startedAt: string;
  finishedAt: string;
  signals: readonly IntelligenceCandidate[];
  sources: readonly SourceRunReport[];
}
