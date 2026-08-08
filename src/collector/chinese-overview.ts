import type { DailyIntelligenceBrief, IntelligenceCategory, IntelligenceSignal } from "@/types/intelligence";

const categoryLabels: Record<IntelligenceCategory, string> = {
  "model-capability": "模型能力",
  agent: "AI Agent",
  "ai-coding": "AI Coding",
  multimodal: "AIGC 与多模态",
  product: "AI 产品",
  interaction: "产品交互",
  "business-model": "商业模式",
  other: "AI 行业",
};

function generatedTitle(item: IntelligenceSignal): string {
  const category = categoryLabels[item.category];
  if (item.sourceGroup === "github-trending") return `${item.title}：GitHub 热榜中的${category}项目`;
  if (item.sourceGroup === "x-viral") {
    const author = typeof item.sourceMetadata.author === "string" ? item.sourceMetadata.author : "AI 从业者";
    return `${author} 分享${category}新动态`;
  }
  return `${item.source} 发布${category}新动态`;
}

function generatedSummary(item: IntelligenceSignal): string {
  const category = categoryLabels[item.category];

  if (item.sourceGroup === "github-trending") {
    return `${item.title} 是一个与${category}相关的开源项目，主要提供可复用的工具、工作流或工程实现；具体功能、使用方式和适用边界以项目说明为准。`;
  }

  if (item.sourceGroup === "x-viral") {
    return `这是一则关于${category}的实践分享，主题为“${item.title}”，主要介绍相关产品、方法或使用场景；具体能力与结论以原帖内容为准。`;
  }

  return `${item.source} 发布了一则关于${category}的内容更新，主题为“${item.title}”，重点介绍相关技术、产品或应用进展；具体事实与边界以原文为准。`;
}

export function enrichBriefWithChineseOverview(
  brief: DailyIntelligenceBrief,
  previous: DailyIntelligenceBrief | null = null,
): DailyIntelligenceBrief {
  const reviewedByUrl = new Map(
    (previous?.items ?? [])
      .filter((item) => item.titleZh && item.summaryZh)
      .map((item) => [item.url, item]),
  );

  return {
    ...brief,
    items: brief.items.map((item) => {
      const reviewed = reviewedByUrl.get(item.url);
      if (reviewed) {
        return {
          ...item,
          titleZh: reviewed.titleZh,
          summaryZh: reviewed.summaryZh,
          translationStatus: reviewed.translationStatus ?? "reviewed",
        };
      }
      return {
        ...item,
        titleZh: item.titleZh || generatedTitle(item),
        summaryZh: item.summaryZh || generatedSummary(item),
        translationStatus: item.translationStatus ?? "generated",
      };
    }),
  };
}
