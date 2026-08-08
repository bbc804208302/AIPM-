import "server-only";

import type { CollectorTrack } from "@/collector/types";
import { createFileIntelligenceRepository } from "@/repositories/file/file-intelligence-repository";
import type { DailyIntelligenceBrief } from "@/types/intelligence";
import { loadCollectorSchedule } from "@/collector/configuration";
import type { DomainFocusArea } from "@/collector/types";

export interface IntelligenceWorkspaceData {
  brief: DailyIntelligenceBrief | null;
  state: "ready" | "empty" | "error";
  focusAreas: readonly DomainFocusArea[];
}

export async function loadIntelligenceWorkspace(track: CollectorTrack, date?: string): Promise<IntelligenceWorkspaceData> {
  try {
    const repository = createFileIntelligenceRepository();
    const [brief, schedule] = await Promise.all([
      date ? repository.getBrief(track, date) : repository.getLatestBrief(track),
      track === "domain" ? loadCollectorSchedule("domain") : Promise.resolve(null),
    ]);
    return { brief, state: brief ? "ready" : "empty", focusAreas: schedule?.focusAreas ?? [] };
  } catch {
    return { brief: null, state: "error", focusAreas: [] };
  }
}
