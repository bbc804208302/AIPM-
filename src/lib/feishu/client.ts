import "server-only";

export interface FeishuClient {
  listRecords(tableId: string): Promise<unknown>;
  getRecord(tableId: string, recordId: string): Promise<unknown>;
}

/** Phase 1 will provide the authenticated server-only implementation. */
export function createFeishuClient(): FeishuClient {
  throw new Error("Feishu adapter is not configured in Phase 0.");
}
