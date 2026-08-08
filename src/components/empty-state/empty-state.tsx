import { CircleDashed } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: ReactNode;
  meta?: string;
}

export function EmptyState({ title, description, meta }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-mark" aria-hidden="true"><CircleDashed size={20} strokeWidth={1.5} /></div>
      <div className="empty-state-copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {meta ? <span className="empty-state-meta">{meta}</span> : null}
    </div>
  );
}
