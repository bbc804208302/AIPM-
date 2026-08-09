import fs from "node:fs/promises";
import path from "node:path";

import bundledDomainSchedule from "./domain-schedule.config.json";
import bundledTechnicalSchedule from "./schedule.config.json";

import { loadCollectorSources, validateSources } from "./registry";
import { isCollectorConfigurationEditable, isProductionCollectorRuntime } from "./runtime";
import type { CollectorSource, CollectorTrack, DomainFocusArea } from "./types";

export const domainFocusAreaOptions = ["动漫", "短剧", "影视", "AIGC"] as const satisfies readonly DomainFocusArea[];

export interface CollectorSchedule {
  enabled: boolean;
  time: string;
  timezone: "Asia/Shanghai";
  dailyLimit: number;
  focusAreas?: readonly DomainFocusArea[];
}

function scheduleConfigPath(track: CollectorTrack): string {
  return path.join(process.cwd(), "src", "collector", track === "domain" ? "domain-schedule.config.json" : "schedule.config.json");
}

function sourceConfigPath(): string {
  return path.join(process.cwd(), "src", "collector", "sources.config.json");
}

function workflowPath(track: CollectorTrack): string {
  return path.join(process.cwd(), ".github", "workflows", track === "domain" ? "domain-collector.yml" : "collector.yml");
}

export function validateCollectorSchedule(value: unknown, track: CollectorTrack = "technical"): CollectorSchedule {
  if (!value || typeof value !== "object") throw new Error("Collector schedule must be an object.");
  const schedule = value as Record<string, unknown>;
  if (typeof schedule.enabled !== "boolean") throw new Error("Collector schedule enabled must be a boolean.");
  if (typeof schedule.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) {
    throw new Error("Collector schedule time must use HH:mm.");
  }
  if (schedule.timezone !== "Asia/Shanghai") throw new Error("Collector schedule timezone must be Asia/Shanghai.");
  if (typeof schedule.dailyLimit !== "number" || !Number.isInteger(schedule.dailyLimit) || schedule.dailyLimit < 1 || schedule.dailyLimit > 30) {
    throw new Error("Collector daily limit must be an integer between 1 and 30.");
  }
  if (track === "domain") {
    if (!Array.isArray(schedule.focusAreas) || schedule.focusAreas.length === 0 || schedule.focusAreas.some((area) => !domainFocusAreaOptions.includes(area as DomainFocusArea))) {
      throw new Error("Domain collector must select at least one valid focus area.");
    }
  }
  return schedule as unknown as CollectorSchedule;
}

export async function loadCollectorSchedule(track: CollectorTrack = "technical"): Promise<CollectorSchedule> {
  const value: unknown = isProductionCollectorRuntime()
    ? (track === "domain" ? bundledDomainSchedule : bundledTechnicalSchedule)
    : JSON.parse(await fs.readFile(scheduleConfigPath(track), "utf8"));
  return validateCollectorSchedule(value, track);
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function renderCollectorWorkflow(schedule: CollectorSchedule, track: CollectorTrack): string {
  const [hour, minute] = schedule.time.split(":");
  const scheduleTrigger = schedule.enabled
    ? `  schedule:\n    - cron: "${minute} ${hour} * * *"\n      timezone: "${schedule.timezone}"\n`
    : "";
  const taskName = track === "domain" ? "Business Domain Intelligence" : "AI Industry Intelligence";
  const command = track === "domain" ? "pnpm collector:write:domain" : "pnpm collector:write";
  return `name: SignalFlow ${taskName}

on:
  workflow_dispatch:
${scheduleTrigger}
permissions:
  contents: write

concurrency:
  group: signalflow-daily-intelligence
  cancel-in-progress: false

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.16.0

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Collect and save today's intelligence
        run: ${command}
        env:
          SIGNALFLOW_LLM_REVIEW: \${{ secrets.SIGNALFLOW_LLM_REVIEW }}
          LLM_API_KEY: \${{ secrets.LLM_API_KEY }}
          LLM_API_BASE_URL: \${{ secrets.LLM_API_BASE_URL }}
          LLM_MODEL: \${{ secrets.LLM_MODEL }}

      - name: Commit daily snapshot
        run: |
          if git diff --quiet -- data/intelligence; then
            echo "No intelligence snapshot changed."
            exit 0
          fi
          git config user.name "signalflow-bot"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/intelligence
          git commit -m "data: update daily intelligence"
          git fetch origin main
          git rebase origin/main
          if ! git push origin HEAD:main; then
            echo "main changed while publishing; syncing once more."
            git fetch origin main
            git rebase origin/main
            git push origin HEAD:main
          fi
`;
}

function assertCollectorConfigurationEditable(): void {
  if (!isCollectorConfigurationEditable()) {
    throw new Error("Collector configuration is read-only outside local development.");
  }
}

export async function setCollectorSourceEnabled(sourceId: string, enabled: boolean): Promise<readonly CollectorSource[]> {
  assertCollectorConfigurationEditable();
  const sources = loadCollectorSources();
  if (!sources.some((source) => source.id === sourceId)) throw new Error(`Unknown collector source: ${sourceId}`);
  const updated = validateSources(sources.map((source) => source.id === sourceId ? { ...source, enabled } : source));
  await writeJson(sourceConfigPath(), updated);
  return updated;
}

export async function saveCollectorSchedule(value: unknown, track: CollectorTrack = "technical"): Promise<CollectorSchedule> {
  assertCollectorConfigurationEditable();
  const schedule = validateCollectorSchedule(value, track);
  await Promise.all([
    writeJson(scheduleConfigPath(track), schedule),
    fs.writeFile(workflowPath(track), renderCollectorWorkflow(schedule, track), "utf8"),
  ]);
  return schedule;
}
