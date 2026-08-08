import { createHash } from "node:crypto";

import type { IntelligenceCandidate, RawSignal } from "./types";

const trackingParams = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source"]);

export function canonicalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || trackingParams.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizeSignal(raw: RawSignal, collectedAt: string): IntelligenceCandidate | null {
  const title = cleanText(raw.title, 500);
  if (!title || !URL.canParse(raw.url)) return null;
  const canonicalUrl = canonicalizeUrl(raw.url);
  const fingerprint = createHash("sha256").update(canonicalUrl).digest("hex").slice(0, 16);
  const dateKey = collectedAt.slice(0, 10).replaceAll("-", "");

  return {
    ...raw,
    title,
    excerpt: cleanText(raw.excerpt, 2_000),
    url: canonicalUrl,
    canonicalUrl,
    fingerprint,
    id: `SIG-${dateKey}-${fingerprint.slice(0, 8).toUpperCase()}`,
    collectedAt,
  };
}

export function deduplicateSignals(signals: readonly IntelligenceCandidate[]): readonly IntelligenceCandidate[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    if (seen.has(signal.fingerprint)) return false;
    seen.add(signal.fingerprint);
    return true;
  });
}
