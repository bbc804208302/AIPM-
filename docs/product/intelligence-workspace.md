# AI 产品情报池产品定义

## 定位

AI 产品情报池是 SignalFlow 自有数据产品，不再以飞书多维表格为主要来源。内部需求池继续通过服务端 Feishu Repository 读取飞书数据。

## 信息架构

- AI 行业情报：新模型、AI 技术、Agent、AI Coding、多模态、AI Native 产品、有价值的 AI 工具与开源项目。
- 业务领域情报：动漫、短剧、影视和 AIGC 的生产流程、平台规则、工具、案例、商业模式和 AI 影响。当前使用独立 RSS Source Registry、领域关键词过滤、每日 Top 10 与人工中文审校保护层。

AI 行业情报支持按 GitHub Trending、AI 媒体和 X 动态筛选。AI 媒体包含 OpenAI、Google DeepMind、Hugging Face、TLDR AI、Smol AI、Latent Space 与 MIT Technology Review AI。

## 今日情报

“今日情报”指 Asia/Shanghai 当天 Collector 批次选出的重点信号，不等于所有原文都在当天发布。

- `briefingDate`：今日批次日期。
- `publishedAt`：原始来源发布时间。
- `collectedAt`：SignalFlow 采集时间。
- 默认展示 10 条；来源配额先按 AI 媒体 4、GitHub 4、X 2，再在来源不足时回填。
- 页面不得用昨日数据冒充今日数据；当天没有快照时显示明确空状态。

## 数据与控制边界

- 情报：`SignalFlow Intelligence Repository`，当前为公开来源的版本化每日 JSON 快照，未来可替换为 PostgreSQL。
- 内部需求：飞书多维表格。
- 本地维护者可在 `/sources` 修改来源开关，在 `/tasks` 修改计划并立即运行。
- 公开部署只读，访客不能改来源、改计划或触发采集。
- GitHub Actions 只在配置进入默认分支后按计划运行。

## 内容规则

每条情报至少保留原始标题、来源分组、具体来源、原文 URL、来源摘要、原始发布时间、采集时间、来源排名或公开热度元数据。中文 UI 可并列保存 `titleZh`、`summaryZh` 与 `translationStatus`；译文必须以保留的原文为依据，不得扩写成未经来源支持的产品结论。`summaryZh` 必须回答“这是什么、主要讲什么或具有什么能力”，不得复述排名、入选原因或泛化的产品经理建议；`selectionReason` 单独承担入选依据。

Collector 在显式写入时可选执行 LLM 审校层：仅当 `SIGNALFLOW_LLM_REVIEW=true` 且服务端存在 `LLM_API_KEY` 时启用。模型只能处理已选中的公开 Top 10，并必须输出可追溯到原始标题和摘要的中文标题、概述；任何请求、超时或输出解析失败都会回退到确定性规则，不会阻止快照保存。`translationStatus: llm-reviewed` 用于在页面透明标识该内容。X 热度和 GitHub 排名不能作为事实可信度。
