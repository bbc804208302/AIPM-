import "server-only";

import { createFeishuClient } from "@/lib/feishu/client";
import { createFeishuDemandRepository } from "@/repositories/feishu/feishu-demand-repository";
import type { DemandItem } from "@/types/demands";

export interface DemandWorkspaceData {
  items: readonly DemandItem[];
  state: "ready" | "error";
}

export async function loadDemandWorkspace(): Promise<DemandWorkspaceData> {
  try {
    const client = createFeishuClient();
    const repository = createFeishuDemandRepository(client.records, client.tables.demandTableId);
    return { items: await repository.list(), state: "ready" };
  } catch {
    return { items: [], state: "error" };
  }
}

export async function loadDemandDetail(id: string): Promise<{ item: DemandItem | null; state: "ready" | "error" }> {
  try {
    const client = createFeishuClient();
    const repository = createFeishuDemandRepository(client.records, client.tables.demandTableId);
    return { item: await repository.findById(id), state: "ready" };
  } catch {
    return { item: null, state: "error" };
  }
}
