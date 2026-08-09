import fs from "node:fs/promises";
import path from "node:path";

import type { IntelligenceRepository, SeenIntelligenceItem } from "@/repositories/intelligence-repository";
import type { DailyIntelligenceBrief } from "@/types/intelligence";

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

interface SeenIndex {
  schemaVersion: 1;
  track: "technical" | "domain";
  updatedAt: string;
  items: readonly SeenIntelligenceItem[];
}

async function listBriefs(rootDirectory: string, track: "technical" | "domain"): Promise<readonly DailyIntelligenceBrief[]> {
  const trackDirectory = path.join(rootDirectory, track);
  try {
    const fileNames = (await fs.readdir(trackDirectory)).filter((fileName) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName));
    const briefs = await Promise.all(fileNames.map((fileName) => readBrief(path.join(trackDirectory, fileName))));
    return briefs
      .filter((brief): brief is DailyIntelligenceBrief => brief !== null)
      .sort((left, right) => left.briefingDate.localeCompare(right.briefingDate));
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
}

async function readSeenItems(rootDirectory: string, track: "technical" | "domain"): Promise<readonly SeenIntelligenceItem[]> {
  const index = await readBrief(path.join(rootDirectory, `${track}-seen.json`)) as unknown as SeenIndex | null;
  if (index && Array.isArray(index.items)) return index.items;
  const briefs = await listBriefs(rootDirectory, track);
  return briefs.flatMap((brief) => brief.items.map(({ url, title }) => ({ url, title })));
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
    getSeenItems(track) {
      return readSeenItems(rootDirectory, track);
    },
    async saveBrief(brief) {
      const trackDirectory = path.join(rootDirectory, brief.track);
      const archivePath = path.join(trackDirectory, `${brief.briefingDate}.json`);
      const latestPath = path.join(rootDirectory, `${brief.track}-latest.json`);
      const payload = `${JSON.stringify(brief, null, 2)}\n`;
      const seenItems = await readSeenItems(rootDirectory, brief.track);
      const seenByKey = new Map(
        [...seenItems, ...brief.items].map(({ url, title }) => [`${url}\n${title}`, { url, title }]),
      );
      const seenIndex: SeenIndex = {
        schemaVersion: 1,
        track: brief.track,
        updatedAt: brief.generatedAt,
        items: [...seenByKey.values()],
      };
      await fs.mkdir(trackDirectory, { recursive: true });
      await Promise.all([
        fs.writeFile(archivePath, payload, "utf8"),
        fs.writeFile(latestPath, payload, "utf8"),
        fs.writeFile(path.join(rootDirectory, `${brief.track}-seen.json`), `${JSON.stringify(seenIndex, null, 2)}\n`, "utf8"),
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
