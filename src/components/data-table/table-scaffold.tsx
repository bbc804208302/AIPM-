import type { ReactNode } from "react";

interface TableScaffoldProps {
  columns: readonly string[];
  children: ReactNode;
  label: string;
}

export function TableScaffold({ columns, children, label }: TableScaffoldProps) {
  return (
    <section className="table-scaffold" aria-label={label}>
      <div className="table-header" role="row">
        {columns.map((column) => <span key={column} role="columnheader">{column}</span>)}
      </div>
      <div className="table-body">{children}</div>
    </section>
  );
}
