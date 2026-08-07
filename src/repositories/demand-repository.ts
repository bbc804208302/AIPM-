import type { Demand } from "@/types/domain";

export interface DemandRepository {
  list(): Promise<readonly Demand[]>;
  findById(id: string): Promise<Demand | null>;
}
