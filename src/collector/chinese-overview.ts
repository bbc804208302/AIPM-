import type { DailyIntelligenceBrief, IntelligenceSignal } from "@/types/intelligence";

function sourceText(item: IntelligenceSignal): string {
  return `${item.title} ${item.summary}`.replace(/\s+/g, " ").trim();
}

function domainTopic(item: IntelligenceSignal): string {
  const text = sourceText(item).toLowerCase();
  if (/microdrama|vertical drama|reelshort|短剧/.test(text)) return "短剧行业";
  if (/ai animation|animation generator|generative video|video generation|aigc/.test(text)) return "AIGC 制作";
  if (/screenplay|screenwriting|romance writing|storytelling|script/.test(text)) return "影视编剧与叙事";
  if (/greenlight|pitch|financing|film fund/.test(text)) return "影视项目开发";
  if (/camera|matte box|gimbal|drone|filmmaking/.test(text)) return "影视制作";
  if (/anime|animation|cartoon/.test(text)) return "动漫制作";
  return "业务领域";
}

function trimExcerpt(item: IntelligenceSignal, limit = 180): string {
  const excerpt = item.summary.replace(/\s+/g, " ").trim();
  if (excerpt.length <= limit) return excerpt;
  return `${excerpt.slice(0, limit).trimEnd()}…`;
}

function knownDomainOverview(item: IntelligenceSignal): { title: string; summary: string } | null {
  const text = sourceText(item).toLowerCase();

  if (/microdrama platform on track to earn \$1b/.test(text)) {
    return {
      title: "微短剧平台收入有望达到 10 亿美元",
      summary: "这则行业报道聚焦微短剧平台的商业化规模：平台收入预计将达到 10 亿美元，反映出竖屏、短时长内容正在形成更成熟的内容分发与变现市场。具体统计口径和预测依据请以原文为准。",
    };
  }
  if (/reelshort|vertical drama/.test(text)) {
    return {
      title: "ReelShort：竖屏短剧正在重塑内容叙事",
      summary: "报道讨论 ReelShort 所代表的竖屏短剧形态：以移动端连续剧情和高频内容消费为核心，正在改变故事设计、发行节奏与内容产品的组织方式。文章关注的是短剧叙事与平台产品形态，而非新的 AI 工具发布。",
    };
  }
  if (/ai animation.*real production tool|real production tool.*ai animation/.test(text)) {
    return {
      title: "AI 动画正从“噱头”走向常规制作工具",
      summary: "该文讨论团队如何把 AI 动画纳入实际制作流程，而不是将其仅作为展示性技术。对产品经理而言，重点在于生成工具与既有动画流程、协作分工和交付质量如何衔接。",
    };
  }
  if (/framia/.test(text) && /animation generator|video production/.test(text)) {
    return {
      title: "Framia：面向快速视频制作的 AI 动画生成工具",
      summary: "文章介绍 Framia 这一 AI 动画生成工具，主张用更快的生成和编辑流程支持创意视频制作。其具体能力、输出质量和商业化方案仍应以产品原文与实际试用为准。",
    };
  }
  if (/tilta matte box|matte boxes/.test(text)) {
    return {
      title: "Tilta 遮光斗促销：面向轻量化机位的镜头控制配件",
      summary: "这是一则影视拍摄器材信息，介绍 Tilta 遮光斗在手持、稳定器和无人机等轻量化机位中的使用场景，并包含相关产品促销信息。它关注的是拍摄流程中的控光与滤镜管理，不是 AI 产品新闻。",
    };
  }
  if (/romance writing|\bheart\b/.test(text)) {
    return {
      title: "HEART 叙事框架：用人物关系推进爱情故事",
      summary: "文章提出 HEART 写作框架，用于帮助创作者从人物关系、情感变化和冲突推进等角度组织爱情故事。这是一条编剧方法论信息，可用于观察内容创作工具和创作辅助能力的需求。",
    };
  }
  if (/greenlit|pitch.*film|film.*pitch/.test(text)) {
    return {
      title: "影视项目立项：从提案到获得制作资金的路径",
      summary: "文章围绕影视项目的提案、开发与立项过程展开，讨论导演和创作者如何让项目获得资金与制作机会。它反映的是影视项目开发流程，不应被误标为 AI 行业动态。",
    };
  }
  return null;
}

function hasEnoughContext(item: IntelligenceSignal): boolean {
  return trimExcerpt(item).length >= 90 && item.summary !== item.title;
}

function generatedTitle(item: IntelligenceSignal): string {
  if (item.track === "domain") {
    return knownDomainOverview(item)?.title ?? `${domainTopic(item)}原文待审校`;
  }
  return item.title;
}

function generatedSummary(item: IntelligenceSignal): string {
  if (item.track === "domain") {
    const known = knownDomainOverview(item);
    if (known) return known.summary;
    if (hasEnoughContext(item)) {
      return `这是一条${domainTopic(item)}公开来源信息，原文围绕“${item.title}”展开。来源摘要：${trimExcerpt(item)}。当前未接入运行时 LLM 翻译，请以原文核对具体事实。`;
    }
    return `该来源只提供了标题或信息量有限的摘要，当前无法可靠生成中文说明。已保留原始标题、来源与链接，建议查看原文；后续可由人工或离线审校补充中文概述。`;
  }
  const excerpt = trimExcerpt(item);
  return excerpt
    ? `AI 概述暂未生成。原始来源摘要：${excerpt}`
    : "原始来源信息不足，等待 AI 审校补充中文概述。";
}

function generatedStatus(item: IntelligenceSignal): NonNullable<IntelligenceSignal["translationStatus"]> {
  if (item.track !== "domain") return "needs-review";
  return knownDomainOverview(item) || hasEnoughContext(item) ? "generated" : "needs-review";
}

export function enrichBriefWithChineseOverview(
  brief: DailyIntelligenceBrief,
  previous: DailyIntelligenceBrief | null = null,
): DailyIntelligenceBrief {
  const reviewedByUrl = new Map(
    (previous?.items ?? [])
      .filter((item) => item.translationStatus === "reviewed" && item.titleZh && item.summaryZh)
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
        translationStatus: item.translationStatus ?? generatedStatus(item),
      };
    }),
  };
}
