export type DemandStatus = "submitted" | "evaluating" | "accepted" | "rejected" | "developing" | "testing" | "released";

export interface Demand {
  id: string;
  title: string;
  status: DemandStatus;
  ownerName?: string;
  updatedAt: string;
}

export interface IntelligenceSignal {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  capturedAt: string;
}
