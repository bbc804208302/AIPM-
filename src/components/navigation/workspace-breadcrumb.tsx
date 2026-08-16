"use client";

import { usePathname } from "next/navigation";

const pageNames: Record<string, string> = {
  "/": "产品需求看板",
  "/intelligence": "AI 产品情报池",
  "/agent": "Agent 运行记录",
  "/demands": "内部需求池",
  "/sources": "数据源",
  "/tasks": "采集任务",
};

export function WorkspaceBreadcrumb() {
  const pathname = usePathname();
  return (
    <div className="breadcrumb">
      <span>SignalFlow</span>
      <span>/</span>
      <strong>{pageNames[pathname] ?? "工作空间"}</strong>
    </div>
  );
}
