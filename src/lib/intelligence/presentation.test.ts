import assert from "node:assert/strict";
import test from "node:test";

import { presentAsIntelligence } from "./presentation";

test("presents legacy signal terminology as intelligence without changing SignalFlow", () => {
  assert.equal(presentAsIntelligence("该信号来自 SignalFlow，读取 Signal 后分析。"), "该情报来自 SignalFlow，读取情报后分析。");
});
