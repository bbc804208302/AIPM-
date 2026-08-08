import fs from "node:fs/promises";
import path from "node:path";

import type { IntelligenceRepository } from "@/repositories/intelligence-repository";
import type { DailyIntelligenceBrief } from "@/types/intelligence";

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function readBrief(filePath: string): Promise<DailyIntelligenceBrief | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as DailyIntelligenceBrief;
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

export function createFileIntelligenceRepository(
  rootDirectory = path.join(process.cwd(), "data", "intelligence"),
): IntelligenceRepository {
  return {
    getLatestBrief(track) {
      return readBrief(path.join(rootDirectory, `${track}-latest.json`));
    },
    getBrief(track, briefingDate) {
      return readBrief(path.join(rootDirectory, track, `${briefingDate}.json`));
    },
    async saveBrief(brief) {
      const trackDirectory = path.join(rootDirectory, brief.track);
      const archivePath = path.join(trackDirectory, `${brief.briefingDate}.json`);
      const latestPath = path.join(rootDirectory, `${brief.track}-latest.json`);
      const payload = `${JSON.stringify(brief, null, 2)}\n`;
      await fs.mkdir(trackDirectory, { recursive: true });
      await Promise.all([
        fs.writeFile(archivePath, payload, "utf8"),
        fs.writeFile(latestPath, payload, "utf8"),
      ]);
    },
    async findById(id) {
      for (const track of ["technical", "domain"] as const) {
        const brief = await this.getLatestBrief(track);
        const match = brief?.items.find((item) => item.id === id);
        if (match) return match;
      }
      return null;
    },
  };
}
