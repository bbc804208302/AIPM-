import { FeishuError, type FeishuErrorKind } from "./errors";

export type Fetcher = typeof fetch;

export interface FeishuTransport {
  request<T>(path: string, init?: RequestInit, accessToken?: string): Promise<T>;
}

export interface FeishuTransportOptions {
  baseUrl: string;
  fetcher?: Fetcher;
  timeoutMs?: number;
}

function classifyStatus(status: number): FeishuErrorKind {
  if (status === 401 || status === 403) return "authentication";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit";
  return "upstream";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

export function createFeishuTransport({
  baseUrl,
  fetcher = fetch,
  timeoutMs = 15_000,
}: FeishuTransportOptions): FeishuTransport {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    async request<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const headers = new Headers(init.headers);
        headers.set("Accept", "application/json");
        if (init.body) headers.set("Content-Type", "application/json; charset=utf-8");
        if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

        const response = await fetcher(`${normalizedBaseUrl}/${path.replace(/^\//, "")}`, {
          ...init,
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new FeishuError("Feishu OpenAPI request failed.", classifyStatus(response.status), {
            httpStatus: response.status,
          });
        }

        try {
          return (await response.json()) as T;
        } catch (error) {
          throw new FeishuError("Feishu OpenAPI returned invalid JSON.", "invalid_response", {}, { cause: error });
        }
      } catch (error) {
        if (error instanceof FeishuError) throw error;
        if (isAbortError(error) || controller.signal.aborted) {
          throw new FeishuError("Feishu OpenAPI request timed out.", "timeout", {}, { cause: error });
        }
        throw new FeishuError("Unable to reach Feishu OpenAPI.", "upstream", {}, { cause: error });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
