export interface MetricDefinition {
  label: string;
  value?: string;
  hint?: string;
}

export function MetricStrip({ metrics }: Readonly<{ metrics: readonly MetricDefinition[] }>) {
  return (
    <section className="metric-strip" aria-label="关键指标">
      {metrics.map((metric) => (
        <div className="metric-item" key={metric.label}>
          <span className="metric-label">{metric.label}</span>
          <strong className="metric-value">{metric.value ?? "—"}</strong>
          <span className="metric-hint">{metric.hint ?? "等待数据"}</span>
        </div>
      ))}
    </section>
  );
}
