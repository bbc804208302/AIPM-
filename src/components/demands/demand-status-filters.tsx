import Link from "next/link";

export type DemandFilter = "all" | "pending" | "developing" | "released";

interface DemandStatusFiltersProps {
  active: DemandFilter;
  metrics: readonly { key: DemandFilter; label: string; value: number; hint: string }[];
}

export function DemandStatusFilters({ active, metrics }: Readonly<DemandStatusFiltersProps>) {
  return (
    <nav className="demand-filter-strip" aria-label="按需求状态筛选">
      {metrics.map((metric) => (
        <Link
          className={active === metric.key ? "active" : undefined}
          href={metric.key === "all" ? "/demands" : `/demands?status=${metric.key}`}
          key={metric.key}
          aria-current={active === metric.key ? "page" : undefined}
        >
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.hint}</small>
        </Link>
      ))}
    </nav>
  );
}
