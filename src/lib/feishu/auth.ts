import type { FeishuConfig } from "./config";
import { FeishuError } from "./errors";
import type { FeishuTransport } from "./transport";

interface TenantTokenResponse {
  code: number;
  msg: string;
  tenant_access_token?: string;
  expire?: number;
}

interface CachedToken {
  value: string;
  refreshAt: number;
}

export interface TenantTokenProvider {
  getToken(): Promise<string>;
  invalidate(): void;
}

export function createTenantTokenProvider(
  config: Pick<FeishuConfig, "appId" | "appSecret">,
  transport: FeishuTransport,
  now: () => number = Date.now,
): TenantTokenProvider {
  let cached: CachedToken | undefined;
  let pending: Promise<string> | undefined;

  async function refresh(): Promise<string> {
    const response = await transport.request<TenantTokenResponse>(
      "/auth/v3/tenant_access_token/internal/",
      {
        method: "POST",
        body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
      },
    );

    if (response.code !== 0) {
      throw new FeishuError("Feishu rejected the application credentials.", "authentication", {
        apiCode: response.code,
      });
    }

    const value = response.tenant_access_token?.trim();
    const expiresInSeconds = response.expire;
    if (!value || !Number.isFinite(expiresInSeconds) || (expiresInSeconds ?? 0) <= 0) {
      throw new FeishuError("Feishu returned an invalid tenant token response.", "invalid_response");
    }

    const safetyWindowMs = Math.min(5 * 60_000, expiresInSeconds! * 100);
    cached = { value, refreshAt: now() + expiresInSeconds! * 1_000 - safetyWindowMs };
    return value;
  }

  return {
    async getToken() {
      if (cached && now() < cached.refreshAt) return cached.value;
      pending ??= refresh().finally(() => {
        pending = undefined;
      });
      return pending;
    },
    invalidate() {
      cached = undefined;
    },
  };
}
