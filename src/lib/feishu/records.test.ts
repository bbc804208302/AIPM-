import assert from "node:assert/strict";
import test from "node:test";

import { createFeishuRecordsApi } from "./records";
import type { TenantTokenProvider } from "./auth";
import type { FeishuTransport } from "./transport";

const tokenProvider: TenantTokenProvider = {
  async getToken() { return "token"; },
  invalidate() {},
};

test("records API follows page tokens until the result is complete", async () => {
  const paths: string[] = [];
  const transport: FeishuTransport = {
    async request<T>(path: string): Promise<T> {
      paths.push(path);
      if (paths.length === 1) {
        return { code: 0, msg: "success", data: { items: [{ record_id: "one", fields: {} }], has_more: true, page_token: "next" } } as T;
      }
      return { code: 0, msg: "success", data: { items: [{ record_id: "two", fields: {} }], has_more: false } } as T;
    },
  };
  const api = createFeishuRecordsApi("app-token", transport, tokenProvider);

  const records = await api.searchAll("table-id");
  assert.deepEqual(records.map((record) => record.record_id), ["one", "two"]);
  assert.match(paths[1], /page_token=next/);
});

test("records API enforces Feishu page size limits before requesting", async () => {
  const transport: FeishuTransport = { async request<T>() { return {} as T; } };
  const api = createFeishuRecordsApi("app-token", transport, tokenProvider);

  await assert.rejects(() => api.searchAll("table-id", { pageSize: 501 }), RangeError);
});

test("records API batch creates records with an idempotency token", async () => {
  let requestPath = "";
  let requestBody = "";
  const transport: FeishuTransport = {
    async request<T>(path: string, init?: RequestInit): Promise<T> {
      requestPath = path;
      requestBody = String(init?.body);
      return { code: 0, msg: "success", data: { records: [{ record_id: "created", fields: {} }] } } as T;
    },
  };
  const api = createFeishuRecordsApi("app-token", transport, tokenProvider);

  const created = await api.createMany("table-id", [{ 标题: "Signal" }], "client-token");
  assert.equal(created[0]?.record_id, "created");
  assert.match(requestPath, /batch_create\?client_token=client-token/);
  assert.deepEqual(JSON.parse(requestBody), { records: [{ fields: { 标题: "Signal" } }] });
});
