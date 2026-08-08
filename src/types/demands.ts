export type DemandStatus =
  | "submitted"
  | "evaluating"
  | "accepted"
  | "rejected"
  | "developing"
  | "testing"
  | "released";

export type DemandPriority = "low" | "medium" | "high" | "urgent";

export interface DemandDetailField {
  label: string;
  value: string;
}

export interface DemandItem {
  id: string;
  title: string;
  description: string;
  status: DemandStatus;
  priority: DemandPriority;
  source: string | null;
  requester: string | null;
  sourceSignalId: string | null;
  owner: string | null;
  developerOwner: string | null;
  dueAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  detailFields: readonly DemandDetailField[];
}
