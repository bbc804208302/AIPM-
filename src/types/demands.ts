export type DemandStatus =
  | "submitted"
  | "evaluating"
  | "accepted"
  | "rejected"
  | "developing"
  | "testing"
  | "released";

export type DemandPriority = "low" | "medium" | "high" | "urgent";

export interface DemandItem {
  id: string;
  title: string;
  description: string;
  status: DemandStatus;
  priority: DemandPriority;
  sourceSignalId: string | null;
  owner: string | null;
  createdAt: string;
}
