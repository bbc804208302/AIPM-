import type { CSSProperties, ReactNode } from "react";

export interface DataTableRow {
  id: string;
  cells: readonly ReactNode[];
}

export function DataTableRows({ rows }: Readonly<{ rows: readonly DataTableRow[] }>) {
  return (
    <div className="data-rows" role="rowgroup">
      {rows.map((row) => (
        <div
          className="data-row"
          key={row.id}
          role="row"
          style={{ "--table-columns": row.cells.length } as CSSProperties}
        >
          {row.cells.map((cell, index) => (
            <div className="data-cell" key={index} role="cell">{cell}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
