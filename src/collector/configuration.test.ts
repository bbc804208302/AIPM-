import assert from "node:assert/strict";
import test from "node:test";

import { loadCollectorSchedule, renderCollectorWorkflow, saveCollectorSchedule, setCollectorSourceEnabled } from "./configuration";
import { loadCollectorSources } from "./registry";

async function withNodeEnv<T>(value: string | undefined, operation: () => T | Promise<T>): Promise<T> {
  const environment = process.env as Record<string, string | undefined>;
  const previous = environment.NODE_ENV;
  if (value === undefined) delete environment.NODE_ENV;
  else environment.NODE_ENV = value;
  try {
    return await operation();
  } finally {
    if (previous === undefined) delete environment.NODE_ENV;
    else environment.NODE_ENV = previous;
  }
}

test("loads bundled Collector configuration in production", async () => {
  const result = await withNodeEnv("production", async () => {
    const [technical, domain] = await Promise.all([
      loadCollectorSchedule("technical"),
      loadCollectorSchedule("domain"),
    ]);
    return { sources: loadCollectorSources(), technical, domain };
  });

  assert.equal(result.sources.length, 14);
  assert.equal(result.technical.timezone, "Asia/Shanghai");
  assert.deepEqual(result.domain.focusAreas, ["动漫", "短剧", "影视", "AIGC"]);
});

test("rejects Collector configuration writes in production", async () => {
  await withNodeEnv("production", async () => {
    await assert.rejects(() => setCollectorSourceEnabled("github-trending", false), /read-only/);
    await assert.rejects(
      () => saveCollectorSchedule({ enabled: true, time: "08:00", timezone: "Asia/Shanghai", dailyLimit: 10 }),
      /read-only/,
    );
  });
});

test("renders a production-safe workflow when a local schedule is edited", () => {
  const workflow = renderCollectorWorkflow(
    { enabled: true, time: "08:17", timezone: "Asia/Shanghai", dailyLimit: 10 },
    "technical",
  );

  assert.match(workflow, /cron: "17 08 \* \* \*"/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /node-version: 24/);
  assert.doesNotMatch(workflow, /LLM_API_KEY/);
  assert.doesNotMatch(workflow, /SIGNALFLOW_LLM_REVIEW/);
  assert.match(workflow, /git rebase origin\/main/);
  assert.doesNotMatch(workflow, /node-version: 20/);
});
