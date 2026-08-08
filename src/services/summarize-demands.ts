import type { DemandDashboardSummary, DemandProgressStage, OwnerDemandProgress, P0Countdown } from "@/types/demand-dashboard";
import type { DemandItem, DemandStatus } from "@/types/demands";

const DAY_MS = 86_400_000;
const activeStatuses = new Set<DemandStatus>(["submitted", "evaluating", "accepted", "developing", "testing"]);

function progressStage(status: DemandStatus): DemandProgressStage {
  if (status === "submitted" || status === "evaluating") return "pending";
  if (status === "accepted") return "accepted";
  if (status === "developing" || status === "testing") return "building";
  if (status === "released") return "completed";
  return "paused";
}

function buildCountdown(items: readonly DemandItem[], now: Date): P0Countdown {
  const urgent = items.filter((item) => item.priority === "urgent" && activeStatuses.has(item.status));
  if (urgent.length === 0) {
    return { state: "none", title: null, dueAt: null, days: null, hours: null, minutes: null, seconds: null };
  }

  const scheduled = urgent
    .filter((item): item is DemandItem & { dueAt: string } => Boolean(item.dueAt))
    .map((item) => ({ item, time: new Date(item.dueAt).getTime() }))
    .filter(({ time }) => Number.isFinite(time))
    .sort((left, right) => left.time - right.time);

  if (scheduled.length === 0) {
    return { state: "unset", title: urgent[0]?.title ?? null, dueAt: null, days: null, hours: null, minutes: null, seconds: null };
  }

  const next = scheduled.find(({ time }) => time >= now.getTime()) ?? scheduled.at(-1)!;
  const difference = next.time - now.getTime();
  const absolute = Math.abs(difference);
  return {
    state: difference >= 0 ? "active" : "overdue",
    title: next.item.title,
    dueAt: next.item.dueAt,
    days: Math.floor(absolute / DAY_MS),
    hours: Math.floor((absolute % DAY_MS) / 3_600_000),
    minutes: Math.floor((absolute % 3_600_000) / 60_000),
    seconds: Math.floor((absolute % 60_000) / 1_000),
  };
}

function buildOwnerProgress(items: readonly DemandItem[]): readonly OwnerDemandProgress[] {
  const owners = new Map<string, { total: number; stages: Record<DemandProgressStage, number> }>();
  for (const item of items) {
    const owner = item.owner ?? item.developerOwner ?? "未分配";
    const current = owners.get(owner) ?? {
      total: 0,
      stages: { pending: 0, accepted: 0, building: 0, completed: 0, paused: 0 },
    };
    current.total += 1;
    current.stages[progressStage(item.status)] += 1;
    owners.set(owner, current);
  }

  return [...owners.entries()]
    .map(([owner, value]) => ({ owner, ...value }))
    .sort((left, right) => right.total - left.total || left.owner.localeCompare(right.owner, "zh-CN"))
    .slice(0, 6);
}

export function summarizeDemands(items: readonly DemandItem[], now = new Date()): DemandDashboardSummary {
  const active = items.filter((item) => activeStatuses.has(item.status));
  const averageWaitingDays = active.length === 0
    ? 0
    : Math.round((active.reduce((total, item) => total + Math.max(0, now.getTime() - new Date(item.createdAt).getTime()), 0) / active.length / DAY_MS) * 10) / 10;

  const nonRejectedTotal = items.filter((item) => item.status !== "rejected").length;
  const reached = {
    submitted: nonRejectedTotal,
    accepted: items.filter((item) => ["accepted", "developing", "testing", "released"].includes(item.status)).length,
    developing: items.filter((item) => ["developing", "testing", "released"].includes(item.status)).length,
    testing: items.filter((item) => ["testing", "released"].includes(item.status)).length,
    released: items.filter((item) => item.status === "released").length,
  };
  const funnelBase = Math.max(reached.submitted, 1);
  const labels = {
    submitted: "进入评估",
    accepted: "已接受",
    developing: "进入开发",
    testing: "进入测试",
    released: "已上线",
  } as const;

  return {
    total: items.length,
    completed: reached.released,
    averageWaitingDays,
    p0: buildCountdown(items, now),
    funnel: (Object.keys(labels) as (keyof typeof labels)[]).map((key) => ({
      key,
      label: labels[key],
      count: reached[key],
      percentage: Math.round((reached[key] / funnelBase) * 1000) / 10,
    })),
    owners: buildOwnerProgress(items),
    paused: items.filter((item) => item.status === "rejected").length,
  };
}
