import "server-only";

import { loadCollectorSchedule } from "@/collector/configuration";
import { loadCollectorSources } from "@/collector/registry";
import { isCollectorConfigurationEditable } from "@/collector/runtime";
import { createFileIntelligenceRepository } from "@/repositories/file/file-intelligence-repository";

export async function loadCollectorWorkspace() {
  const repository = createFileIntelligenceRepository();
  const [schedule, domainSchedule, latestBrief, domainBrief] = await Promise.all([
    loadCollectorSchedule("technical"),
    loadCollectorSchedule("domain"),
    repository.getLatestBrief("technical"),
    repository.getLatestBrief("domain"),
  ]);
  const allSources = loadCollectorSources();

  return {
    sources: allSources.filter((source) => source.track === "technical"),
    domainSources: allSources.filter((source) => source.track === "domain"),
    schedule,
    domainSchedule,
    latestBrief,
    domainBrief,
    editable: isCollectorConfigurationEditable(),
  };
}
