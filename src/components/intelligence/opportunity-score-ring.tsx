import type { CSSProperties } from "react";

function scoreLevel(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function OpportunityScoreRing({ score }: Readonly<{ score: number }>) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const style = { "--opportunity-score-angle": `${normalizedScore * 3.6}deg` } as CSSProperties;

  return (
    <div
      className={`opportunity-score-ring score-${scoreLevel(normalizedScore)}`}
      style={style}
      aria-label={`PM 机会分 ${normalizedScore} 分`}
      title={`PM 机会分 ${normalizedScore} 分`}
    >
      <div><strong>{normalizedScore}</strong><span>机会分</span></div>
    </div>
  );
}
