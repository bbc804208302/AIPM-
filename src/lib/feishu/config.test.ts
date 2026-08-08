import assert from "node:assert/strict";
import test from "node:test";

import { readFeishuConfig } from "./config";
import { FeishuConfigurationError } from "./errors";

const completeEnvironment = {
  FEISHU_APP_ID: "app-id",
  FEISHU_APP_SECRET: "app-secret",
  FEISHU_BITABLE_APP_TOKEN: "base-token",
  FEISHU_DEMAND_TABLE_ID: "demand-table",
  FEISHU_INTELLIGENCE_TABLE_ID: "intelligence-table",
};

test("readFeishuConfig maps server environment variables", () => {
  assert.deepEqual(readFeishuConfig(completeEnvironment), {
    appId: "app-id",
    appSecret: "app-secret",
    bitableAppToken: "base-token",
    demandTableId: "demand-table",
    intelligenceTableId: "intelligence-table",
    baseUrl: "https://open.feishu.cn/open-apis",
  });
});

test("readFeishuConfig reports the missing variable without exposing values", () => {
  assert.throws(
    () => readFeishuConfig({ ...completeEnvironment, FEISHU_APP_SECRET: " " }),
    (error) => error instanceof FeishuConfigurationError && error.message.includes("FEISHU_APP_SECRET"),
  );
});

test("AI intelligence table is optional for the demand-only Feishu boundary", () => {
  const demandEnvironment: Record<string, string> = { ...completeEnvironment };
  delete demandEnvironment.FEISHU_INTELLIGENCE_TABLE_ID;
  assert.equal(readFeishuConfig(demandEnvironment).intelligenceTableId, undefined);
});
