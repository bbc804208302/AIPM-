import type { IntelligenceSignal } from "@/types/domain";

export interface IntelligenceRepository {
  list(): Promise<readonly IntelligenceSignal[]>;
  findById(id: string): Promise<IntelligenceSignal | null>;
}
