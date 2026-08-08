import { FeishuError } from "./errors";
import type { FeishuTransport } from "./transport";
import type { TenantTokenProvider } from "./auth";

export interface BitableRecord {
  record_id: string;
  fields: Record<string, unknown>;
  created_time?: number;
  last_modified_time?: number;
}

interface FeishuEnvelope<T> {
  code: number;
  msg: string;
  data?: T;
}

interface SearchRecordsData {
  items?: BitableRecord[];
  has_more?: boolean;
  page_token?: string;
  total?: number;
}

interface BatchGetRecordsData {
  records?: BitableRecord[];
  forbidden_record_ids?: string[];
  absent_record_ids?: string[];
}

interface BatchCreateRecordsData {
  records?: BitableRecord[];
}

export interface SearchRecordsOptions {
  fieldNames?: readonly string[];
  pageSize?: number;
}

export interface FeishuRecordsApi {
  searchAll(tableId: string, options?: SearchRecordsOptions): Promise<readonly BitableRecord[]>;
  getByIds(tableId: string, recordIds: readonly string[]): Promise<readonly BitableRecord[]>;
  createMany(tableId: string, fields: readonly Record<string, unknown>[], clientToken?: string): Promise<readonly BitableRecord[]>;
}

function assertSuccess<T>(response: FeishuEnvelope<T>): T {
  if (response.code !== 0) {
    throw new FeishuError("Feishu Bitable request was rejected.", "upstream", { apiCode: response.code });
  }
  if (!response.data) {
    throw new FeishuError("Feishu Bitable response has no data.", "invalid_response");
  }
  return response.data;
}

function validatePageSize(pageSize: number): number {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new RangeError("pageSize must be an integer between 1 and 500.");
  }
  return pageSize;
}

export function createFeishuRecordsApi(
  appToken: string,
  transport: FeishuTransport,
  tokenProvider: TenantTokenProvider,
): FeishuRecordsApi {
  const encodedAppToken = encodeURIComponent(appToken);

  return {
    async searchAll(tableId, options = {}) {
      const pageSize = validatePageSize(options.pageSize ?? 500);
      const records: BitableRecord[] = [];
      let pageToken: string | undefined;

      do {
        const token = await tokenProvider.getToken();
        const query = new URLSearchParams({ page_size: String(pageSize) });
        if (pageToken) query.set("page_token", pageToken);

        const response = await transport.request<FeishuEnvelope<SearchRecordsData>>(
          `/bitable/v1/apps/${encodedAppToken}/tables/${encodeURIComponent(tableId)}/records/search?${query}`,
          {
            method: "POST",
            body: JSON.stringify({
              field_names: options.fieldNames ? [...options.fieldNames] : undefined,
              automatic_fields: true,
            }),
          },
          token,
        );
        const data = assertSuccess(response);
        records.push(...(data.items ?? []));

        if (data.has_more && !data.page_token) {
          throw new FeishuError("Feishu pagination response is missing page_token.", "invalid_response");
        }
        pageToken = data.has_more ? data.page_token : undefined;
      } while (pageToken);

      return records;
    },

    async getByIds(tableId, recordIds) {
      if (recordIds.length === 0) return [];
      if (recordIds.length > 100) throw new RangeError("recordIds cannot contain more than 100 values.");

      const token = await tokenProvider.getToken();
      const response = await transport.request<FeishuEnvelope<BatchGetRecordsData>>(
        `/bitable/v1/apps/${encodedAppToken}/tables/${encodeURIComponent(tableId)}/records/batch_get`,
        {
          method: "POST",
          body: JSON.stringify({ record_ids: [...recordIds], automatic_fields: true }),
        },
        token,
      );
      return assertSuccess(response).records ?? [];
    },

    async createMany(tableId, fields, clientToken) {
      if (fields.length === 0) return [];
      if (fields.length > 1_000) throw new RangeError("fields cannot contain more than 1,000 records.");

      const token = await tokenProvider.getToken();
      const query = new URLSearchParams();
      if (clientToken) query.set("client_token", clientToken);
      const suffix = query.size ? `?${query}` : "";
      const response = await transport.request<FeishuEnvelope<BatchCreateRecordsData>>(
        `/bitable/v1/apps/${encodedAppToken}/tables/${encodeURIComponent(tableId)}/records/batch_create${suffix}`,
        {
          method: "POST",
          body: JSON.stringify({ records: fields.map((recordFields) => ({ fields: recordFields })) }),
        },
        token,
      );
      return assertSuccess(response).records ?? [];
    },
  };
}
