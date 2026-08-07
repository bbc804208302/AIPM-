import assert from "node:assert/strict";
import test from "node:test";

import { FeishuError } from "./errors";
import { createFeishuTransport, type Fetcher } from "./transport";

test("transport attaches authorization without leaking it into errors", async () => {
  let authorization: string | null = null;
  const fetcher: Fetcher = async (_input, init) => {
    authorization = new Headers(init?.headers).get("Authorization");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const transport = createFeishuTransport({ baseUrl: "https://example.test", fetcher });

  assert.deepEqual(await transport.request("/resource", {}, "private-token"), { ok: true });
  assert.equal(authorization, "Bearer private-token");
});

test("transport classifies rate limits", async () => {
  const fetcher: Fetcher = async () => new Response("limited", { status: 429 });
  const transport = createFeishuTransport({ baseUrl: "https://example.test", fetcher });

  await assert.rejects(
    () => transport.request("/resource"),
    (error) => error instanceof FeishuError && error.kind === "rate_limit" && error.details.httpStatus === 429,
  );
});
