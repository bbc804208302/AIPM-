import fs from "node:fs";
import path from "node:path";

import bundledSources from "./sources.config.json";

import { isProductionCollectorRuntime } from "./runtime";
import type { CollectorCategory, CollectorSource, CollectorSourceType, CollectorTrack, SourceKeywordScope, SourceTrustTier } from "./types";

const sourceTypes = new Set<CollectorSourceType>(["rss", "api", "scrape"]);
const tracks = new Set<CollectorTrack>(["technical", "domain"]);
const categories = new Set<CollectorCategory>(["github-trending", "ai-media", "x-viral"]);
const trustTiers = new Set<SourceTrustTier>(["primary", "curated", "community"]);
const keywordScopes = new Set<SourceKeywordScope>(["title", "all"]);
const domainFocusAreas = new Set(["动漫", "短剧", "影视", "AIGC"]);

function localSourcesConfigPath(): string {
  return path.join(process.cwd(), "src", "collector", "sources.config.json");
}

export function validateSources(value: unknown): readonly CollectorSource[] {
  if (!Array.isArray(value)) throw new Error("Collector source registry must be an array.");
  const ids = new Set<string>();

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw new Error(`Source ${index} must be an object.`);
    const source = entry as Record<string, unknown>;
    const at = `Source ${index}`;
    if (typeof source.id !== "string" || !source.id.trim()) throw new Error(`${at} has no id.`);
    if (ids.has(source.id)) throw new Error(`Duplicate source id: ${source.id}`);
    ids.add(source.id);
    if (typeof source.name !== "string" || !source.name.trim()) throw new Error(`${at} has no name.`);
    if (!sourceTypes.has(source.type as CollectorSourceType)) throw new Error(`${at} has invalid type.`);
    if (!tracks.has(source.track as CollectorTrack)) throw new Error(`${at} has invalid track.`);
    if (!categories.has(source.category as CollectorCategory)) throw new Error(`${at} has invalid category.`);
    if (!trustTiers.has(source.trustTier as SourceTrustTier)) throw new Error(`${at} has invalid trust tier.`);
    if (typeof source.url !== "string" || !URL.canParse(source.url)) throw new Error(`${at} has invalid URL.`);
    if (typeof source.limit !== "number" || !Number.isInteger(source.limit) || source.limit < 1 || source.limit > 100) {
      throw new Error(`${at} limit must be an integer between 1 and 100.`);
    }
    if (source.keywords !== undefined && (!Array.isArray(source.keywords) || source.keywords.some((item) => typeof item !== "string"))) {
      throw new Error(`${at} keywords must be strings.`);
    }
    if (source.keywordScope !== undefined && !keywordScopes.has(source.keywordScope as SourceKeywordScope)) {
      throw new Error(`${at} has invalid keyword scope.`);
    }
    if (source.focusAreas !== undefined && (!Array.isArray(source.focusAreas) || source.focusAreas.some((item) => !domainFocusAreas.has(item as string)))) {
      throw new Error(`${at} has invalid focus areas.`);
    }
    return source as unknown as CollectorSource;
  });
}

export function loadCollectorSources(): readonly CollectorSource[] {
  const parsed: unknown = isProductionCollectorRuntime()
    ? bundledSources
    : JSON.parse(fs.readFileSync(localSourcesConfigPath(), "utf8"));
  return validateSources(parsed);
}
