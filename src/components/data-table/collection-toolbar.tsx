"use client";

import { Filter, KanbanSquare, List, Search, Table2 } from "lucide-react";
import { useState } from "react";

type ViewMode = "list" | "table" | "kanban";

interface CollectionToolbarProps {
  searchPlaceholder: string;
  modes?: readonly ViewMode[];
}

const modeMeta = {
  list: { label: "列表", icon: List },
  table: { label: "表格", icon: Table2 },
  kanban: { label: "看板", icon: KanbanSquare },
} satisfies Record<ViewMode, { label: string; icon: typeof List }>;

export function CollectionToolbar({ searchPlaceholder, modes = ["list", "table"] }: CollectionToolbarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(modes[0]);
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="collection-toolbar">
      <label className="search-field">
        <Search size={15} aria-hidden="true" />
        <span className="sr-only">搜索</span>
        <input type="search" placeholder={searchPlaceholder} />
      </label>
      <div className="toolbar-actions">
        <div className="filter-control">
          <button className={`toolbar-button${filterOpen ? " active" : ""}`} type="button" onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen}>
            <Filter size={14} />筛选
          </button>
          {filterOpen ? <div className="filter-popover">暂无可用筛选项</div> : null}
        </div>
        <div className="view-switch" aria-label="视图切换">
          {modes.map((mode) => {
            const { label, icon: Icon } = modeMeta[mode];
            return (
              <button className={viewMode === mode ? "active" : ""} type="button" key={mode} onClick={() => setViewMode(mode)} aria-pressed={viewMode === mode} title={`${label}视图`}>
                <Icon size={14} /><span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
