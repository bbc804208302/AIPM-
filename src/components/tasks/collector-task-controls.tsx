"use client";

import { Play, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CollectorSchedule } from "@/collector/configuration";
import type { CollectorTrack, DomainFocusArea } from "@/collector/types";

export function CollectorTaskControls({
  schedule,
  editable,
  enabledSources,
  track,
  title,
  availableFocusAreas = [],
}: Readonly<{
  schedule: CollectorSchedule;
  editable: boolean;
  enabledSources: number;
  track: CollectorTrack;
  title: string;
  availableFocusAreas?: readonly DomainFocusArea[];
}>) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(schedule.enabled);
  const [time, setTime] = useState(schedule.time);
  const [dailyLimit, setDailyLimit] = useState(schedule.dailyLimit);
  const [focusAreas, setFocusAreas] = useState<readonly DomainFocusArea[]>(schedule.focusAreas ?? []);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"save" | "run" | null>(null);

  async function save() {
    setBusy("save");
    setStatus("");
    try {
      const response = await fetch("/api/collector/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-schedule", track, enabled, time, dailyLimit, focusAreas }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "计划保存失败。");
      setStatus("计划已保存；提交配置后 GitHub Actions 生效。");
      router.refresh();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "计划保存失败。");
    } finally {
      setBusy(null);
    }
  }

  async function runNow() {
    setBusy("run");
    setStatus("正在采集公开来源并生成今日 Top 10…");
    try {
      const response = await fetch("/api/collector/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, focusAreas }),
      });
      const data = await response.json() as { error?: string; selected?: number; candidates?: number; failedSources?: number; chineseOverviews?: number; llmReviewed?: number };
      if (!response.ok) throw new Error(data.error || "采集任务执行失败。");
      setStatus(`真实采集完成：入选 ${data.selected ?? 0} 条，LLM 审校 ${data.llmReviewed ?? 0} 条，中文概述 ${data.chineseOverviews ?? 0} 条；候选 ${data.candidates ?? 0} 条，失败来源 ${data.failedSources ?? 0} 个。`);
      router.refresh();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "采集任务执行失败。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="task-control-panel" aria-labelledby={`${track}-daily-task-title`}>
      <div className="task-control-heading">
        <div><span>DAILY / {track === "domain" ? "BUSINESS DOMAIN" : "AI INDUSTRY"}</span><h2 id={`${track}-daily-task-title`}>{title}</h2></div>
        <span className={`status-badge ${enabled ? "status-released" : "status-rejected"}`}>{enabled ? "计划已启用" : "计划已停用"}</span>
      </div>
      <div className="task-control-grid">
        <label className="task-switch-field">
          <span>每日定时任务</span>
          <button className={`source-toggle${enabled ? " active" : ""}`} type="button" role="switch" aria-checked={enabled} disabled={!editable} onClick={() => setEnabled((value) => !value)}>
            <span aria-hidden="true" />{enabled ? "启用" : "停用"}
          </button>
        </label>
        <label><span>执行时间</span><input type="time" value={time} disabled={!editable} onChange={(event) => setTime(event.target.value)} /></label>
        <label><span>时区</span><input type="text" value="Asia/Shanghai" disabled /></label>
        <label><span>今日输出</span><input type="number" min="1" max="30" value={dailyLimit} disabled={!editable} onChange={(event) => setDailyLimit(Number(event.target.value))} /></label>
      </div>
      {availableFocusAreas.length > 0 ? (
        <fieldset className="domain-focus-control">
          <legend>选择业务领域</legend>
          <div>
            {availableFocusAreas.map((area) => {
              const selected = focusAreas.includes(area);
              return (
                <button
                  className={selected ? "active" : undefined}
                  type="button"
                  aria-pressed={selected}
                  disabled={!editable}
                  key={area}
                  onClick={() => setFocusAreas((current) => selected ? current.filter((item) => item !== area) : [...current, area])}
                >{area}</button>
              );
            })}
          </div>
          <p>只会启用与所选领域匹配的数据源和关键词规则。</p>
        </fieldset>
      ) : null}
      <div className="task-control-actions">
        <button className="brutal-control-button secondary" type="button" disabled={!editable || busy !== null} onClick={save}><Save size={15} />{busy === "save" ? "保存中" : "保存计划"}</button>
        <button className="brutal-control-button primary" type="button" disabled={!editable || busy !== null || enabledSources === 0 || (track === "domain" && focusAreas.length === 0)} onClick={runNow}><Play size={15} />{busy === "run" ? "采集中" : "重新采集今日情报"}</button>
      </div>
      {status ? <p className="task-control-status" aria-live="polite">{status}</p> : null}
      <p className="control-note">{editable ? `该操作会真实请求已启用的${track === "domain" ? "业务领域" : "AI 行业"}来源并覆盖对应当天快照；配置 LLM 后会在写入前进行中文审校，人工审校内容会保留。` : "公开站点只展示任务状态，不允许访客修改计划或触发采集。"}</p>
    </section>
  );
}
