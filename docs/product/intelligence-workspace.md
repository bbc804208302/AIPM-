# AI 产品情报池产品定义

## 定位

AI 产品情报池是 SignalFlow 自有数据产品，不再以飞书多维表格为主要来源。内部需求池继续通过服务端 Feishu Repository 读取飞书数据。

## 信息架构

- AI 行业情报：新模型、AI 技术、Agent、AI Coding、多模态、AI Native 产品、有价值的 AI 工具与开源项目。
- 业务领域情报：动漫、短剧、影视和 AIGC 的生产流程、平台规则、工具、案例、商业模式和 AI 影响。当前使用独立 RSS Source Registry、领域关键词过滤与 Product Intelligence Agent 机会评分。

AI 行业情报支持按 GitHub Trending、AI 媒体和 X 动态筛选。AI 媒体包含 OpenAI、Google DeepMind、Hugging Face、TLDR AI、Smol AI、Latent Space 与 MIT Technology Review AI。

## 今日情报

“今日情报”是当日生成的情报批次，候选内容允许来自 `Asia/Shanghai` 当天及此前十四个自然日。RSS、媒体和 X 内容必须具有近 15 日内的 `publishedAt`；GitHub Trending 是当天实时榜单，允许没有原始发布时间。两条 Collector 轨道分别最多准备 20 条候选；Agent 分批处理双轨全部情报，并按机会分降序展示。

- `briefingDate`：今日批次日期。
- `publishedAt`：原始来源发布时间。
- `collectedAt`：SignalFlow 采集时间。
- Collector 每日以 10 条为目标、20 条为硬上限，按来源配额构造双轨候选，避免单一来源垄断；严格去重后允许不足，不以旧内容填充。AI 行业来源额外覆盖 Product Hunt AI 产品、GitHub AI Changelog 与 Vercel AI Changelog，同一来源内优先具体产品发布、功能更新、Agent、Skill、插件、工具和真实应用案例，最终展示顺序由 Agent 评分决定。
- 选取前通过持久化已展示索引对全部历史内容执行去重，包括当天重复手动采集：规范化 URL 相同，或去除标点、符号和空白后的原始标题相同，均视为已展示内容，不再录入新批次。索引只保存公开 URL 与原始标题。
- 页面不得用昨日数据冒充今日数据；当天没有快照时显示明确空状态。
- 两条情报轨道统一显示 `generatedAt` 对应的“最后更新时间”。

## 数据与控制边界

- 情报：`SignalFlow Intelligence Repository`，当前为公开来源的版本化每日 JSON 快照，未来可替换为 PostgreSQL。
- 内部需求：飞书多维表格。
- 本地维护者可在 `/sources` 修改来源开关，在 `/tasks` 修改计划并立即运行。
- 公开部署只读，访客不能改来源、改计划或触发采集。
- GitHub Actions 只在配置进入默认分支后按计划运行。

## 内容规则

每条情报至少保留原始标题、来源分组、具体来源、原文 URL、来源摘要、原始发布时间、采集时间、来源排名或公开热度元数据。中文 UI 可并列保存 `titleZh`、`summaryZh` 与 `translationStatus`；译文必须以保留的原文为依据，不得扩写成未经来源支持的产品结论。`summaryZh` 必须回答“这是什么、主要讲什么或具有什么能力”，不得复述排名、入选原因或泛化的产品经理建议；`selectionReason` 单独承担入选依据。

每日 Product Intelligence Agent 读取 AI 行业与业务领域两条轨道的全部公开候选，以每批最多 10 条的方式逐条生成可追溯到原始标题和摘要的中文标题与概述，标注产品创意、设计思路、竞品动态、能力变化、业务机会或行业判断，并按业务相关性、新颖性、用户价值、可行动性和证据质量评分。各批结果合并后统一按机会分从高到低展示；70 分以上自动触发深度分析，每日最多 3 条，其余内容可由用户手动分析。X 热度和 GitHub 排名不能作为事实可信度。

Collector 仍保留 `SIGNALFLOW_LLM_REVIEW=true` 的本地兼容审校能力，但 GitHub 定时采集不再重复调用该层，避免中文审校与 Agent 评分产生双份 LLM 消耗。

DeepSeek 等 OpenAI 兼容服务返回近似 JSON 时，先使用 `jsonrepair` 做结构修复；仍无法解析则使用更短上下文重试一次。当天快照存在 `needs-review` 条目时，下一次显式写入优先重新审校该快照，成功后再由后续批次选取新的未读内容。

AI 行业与业务领域共用同一概述契约：标题准确说明主体或事件，概述用一句高信息密度中文回答“它是什么、做什么、解决什么问题或发生了什么”。`heatScore` 只从 GitHub 当日 stars 或 X 浏览、喜欢、转发等公开互动计算，取值 0–100；没有可审计互动数据的 RSS 不生成分数，热度不等于事实可信度或产品价值。
