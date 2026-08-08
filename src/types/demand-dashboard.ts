export type DemandProgressStage = "pending" | "accepted" | "building" | "completed" | "paused";

export interface DemandFunnelStep {
  key: "submitted" | "accepted" | "developing" | "testing" | "released";
  label: string;
  count: number;
  percentage: number;
}

export interface OwnerDemandProgress {
  owner: string;
  total: number;
  stages: Readonly<Record<DemandProgressStage, number>>;
}

export interface P0Countdown {
  state: "active" | "overdue" | "unset" | "none";
  title: string | null;
  dueAt: string | null;
  days: number | null;
  hours: number | null;
  minutes: number | null;
  seconds: number | null;
}

export interface DemandDashboardSummary {
  total: number;
  completed: number;
  averageWaitingDays: number;
  p0: P0Countdown;
  funnel: readonly DemandFunnelStep[];
  owners: readonly OwnerDemandProgress[];
  paused: number;
}
