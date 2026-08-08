"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

import type { P0Countdown } from "@/types/demand-dashboard";

function twoDigits(value: number | null): string {
  return value === null ? "--" : String(value).padStart(2, "0");
}

function calculateCountdown(initial: P0Countdown): P0Countdown {
  if (!initial.dueAt) return initial;
  const difference = new Date(initial.dueAt).getTime() - Date.now();
  const absolute = Math.abs(difference);
  return {
    ...initial,
    state: difference >= 0 ? "active" : "overdue",
    days: Math.floor(absolute / 86_400_000),
    hours: Math.floor((absolute % 86_400_000) / 3_600_000),
    minutes: Math.floor((absolute % 3_600_000) / 60_000),
    seconds: Math.floor((absolute % 60_000) / 1_000),
  };
}

export function P0Countdown({ initial }: Readonly<{ initial: P0Countdown }>) {
  const [countdown, setCountdown] = useState(initial);

  useEffect(() => {
    if (!initial.dueAt) return;
    const update = () => setCountdown(calculateCountdown(initial));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [initial]);

  const label = countdown.state === "overdue" ? "已逾期" : countdown.state === "active" ? "距离预计上线" : countdown.state === "unset" ? "P0 未设置预计上线时间" : "当前没有进行中的 P0 需求";
  const units = [
    [twoDigits(countdown.days), "天"],
    [twoDigits(countdown.hours), "时"],
    [twoDigits(countdown.minutes), "分"],
    [twoDigits(countdown.seconds), "秒"],
  ];

  return (
    <article className={`demand-kpi demand-countdown countdown-${countdown.state}`}>
      <div className="demand-kpi-heading"><span>P0 需求倒计时</span><Clock3 size={18} /></div>
      <div className="countdown-units" aria-label={label} aria-live="off">
        {units.map(([value, unit]) => <div key={unit}><strong>{value}</strong><span>{unit}</span></div>)}
      </div>
      <p>{label}{countdown.title ? ` · ${countdown.title}` : ""}</p>
    </article>
  );
}
