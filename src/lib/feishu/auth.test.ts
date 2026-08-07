import assert from "node:assert/strict";
import test from "node:test";

import { createTenantTokenProvider } from "./auth";
import type { FeishuTransport } from "./transport";

test("tenant token provider caches and invalidates tokens", async () => {
  let calls = 0;
  const transport: FeishuTransport = {
    async request<T>() {
      calls += 1;
      return { code: 0, msg: "success", tenant_access_token: `token-${calls}`, expire: 7200 } as T;
    },
  };
  const provider = createTenantTokenProvider({ appId: "id", appSecret: "secret" }, transport, () => 1_000);

  assert.equal(await provider.getToken(), "token-1");
  assert.equal(await provider.getToken(), "token-1");
  assert.equal(calls, 1);

  provider.invalidate();
  assert.equal(await provider.getToken(), "token-2");
  assert.equal(calls, 2);
});

test("tenant token provider coalesces simultaneous refreshes", async () => {
  let calls = 0;
  const transport: FeishuTransport = {
    async request<T>() {
      calls += 1;
      await Promise.resolve();
      return { code: 0, msg: "success", tenant_access_token: "shared-token", expire: 7200 } as T;
    },
  };
  const provider = createTenantTokenProvider({ appId: "id", appSecret: "secret" }, transport);

  assert.deepEqual(await Promise.all([provider.getToken(), provider.getToken()]), ["shared-token", "shared-token"]);
  assert.equal(calls, 1);
});
