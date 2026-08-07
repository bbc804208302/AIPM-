import "server-only";

import { createTenantTokenProvider } from "./auth";
import { readFeishuConfig, type FeishuConfig } from "./config";
import { createFeishuRecordsApi, type FeishuRecordsApi } from "./records";
import { createFeishuTransport, type Fetcher } from "./transport";

export interface FeishuClient {
  records: FeishuRecordsApi;
  tables: Pick<FeishuConfig, "demandTableId" | "intelligenceTableId">;
}

export interface CreateFeishuClientOptions {
  config?: FeishuConfig;
  fetcher?: Fetcher;
  timeoutMs?: number;
}

export function createFeishuClient(options: CreateFeishuClientOptions = {}): FeishuClient {
  const config = options.config ?? readFeishuConfig();
  const transport = createFeishuTransport({
    baseUrl: config.baseUrl,
    fetcher: options.fetcher,
    timeoutMs: options.timeoutMs,
  });
  const tokenProvider = createTenantTokenProvider(config, transport);

  return {
    records: createFeishuRecordsApi(config.bitableAppToken, transport, tokenProvider),
    tables: {
      demandTableId: config.demandTableId,
      intelligenceTableId: config.intelligenceTableId,
    },
  };
}
