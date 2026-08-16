# SignalFlow Agent Rules

任何自动化开发代理在修改本仓库前，必须先完整阅读本文件。

## 1. 产品定位

SignalFlow（AI 产品情报与需求协同工作台）服务于 AI 产品经理。它连接外部 AI 产品信号、产品洞察、潜在用户需求与内部需求执行，目标是减少人工找信息与重复追问状态。

界面使用简体中文；代码、目录、类型和提交信息使用英文。AI、API、RSS、GitHub、Codex、LLM、MCP、URL 等技术名词可保留英文。

## 2. 当前阶段边界

当前为 Phase 4 / Agent-driven Intelligence MVP。允许：既有 Daily Intelligence 能力、单一 Product Intelligence Agent 的 `daily-triage` 与 `single-signal` 两种运行模式、受控 Tool Use、动态情报准入、Agent 中文概述、结构化机会评分、基于历史 Agent Run 的 Memory、每日最多 3 条高分自动深度分析、候选需求草稿、人工确认边界、GitHub Actions 定时或手动运行、文档与测试。

本阶段 Collector 继续覆盖两条独立链路，并只承担公开来源采集、近 3 日过滤、历史去重与最多 20 条候选准备。`daily-triage` 必须读取候选、逐条检索 Memory、生成事实型中文概述、完成全量结构化评分，随后动态决定情报池准入；70 分以上候选每天最多自动执行 3 条 `single-signal` 深度分析，50–69 分直接进入情报池但由用户选择是否深度分析，低分内容进入待审候选。候选需求必须等待人工确认，禁止自动写入飞书正式需求池。当前仍禁止 Deep Research、MCP、多 Agent 编排、飞书机器人推送或复杂需求自动化。不得生成虚构新闻或大批量 Mock Data。

## 3. 技术栈

- Next.js App Router、React、TypeScript strict
- Tailwind CSS、shadcn/ui 约定、Lucide；未来图表使用 Recharts
- pnpm 是唯一 package manager；不得提交 npm/yarn lockfile
- 优先 Server Components；仅在交互确有需要时使用 Client Components

## 4. 架构边界

内部需求链路：React Component → Application Service / Demand Repository → Feishu Adapter → Next.js Server → Feishu OpenAPI → Bitable。

情报链路：Source Registry → Source Adapter → Normalize → Deduplicate → Candidate Snapshot（最多 20）→ Agent Admission → Admitted Intelligence / Review Queue → SignalFlow Intelligence Repository + Agent Run Repository。采集源故障必须隔离；默认运行必须是 dry-run，只有显式 `--write` 才允许更新 SignalFlow 每日候选快照。

Agent 准入链路：Latest Dual-track Candidates → `list_daily_signals` → `search_memory` → `score_candidates`（中文概述 + 五维评分）→ `select_intelligence_for_pool` → Agent Run Repository。深度分析链路：高分 Signal 或人工选择 → `get_signal` → `search_memory` → LLM Decision → `create_demand_proposal` / `reject_signal` → Agent Run Repository → Human Review。不得保存或展示模型思维链，只保存输入证据、评分维度、工具调用摘要、最终结论与运行指标。

- React 页面不得直接调用飞书 OpenAPI。
- 页面依赖 `src/repositories` 中的领域接口。
- `src/lib/feishu` 只负责鉴权、请求、响应映射与错误翻译。
- `src/services` 编排用例，不承载具体 UI。
- 外部数据先映射到稳定领域类型，禁止让飞书字段结构泄漏到页面。

## 5. 数据与 Secret

内部需求池继续以飞书多维表格为事实来源。AI 产品情报池由 SignalFlow 自行采集并写入独立 Intelligence Repository；当前使用可公开审计的每日 JSON 快照，未来可替换为 PostgreSQL。

Product Intelligence Agent 的准入、深度分析与 Memory 当前保存在 `data/agent/runs.json`，仅包含公开 Signal、结构化评分、工具轨迹和候选需求。生产网页只读，LLM 运行由本地维护者或 GitHub Action 发起。

- `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`BITABLE_APP_TOKEN`、任何 `TABLE_ID`、`LLM_API_KEY` 永不进入 Git。
- 真实值只放 `.env.local` 或托管平台的 Secret 管理。
- `.env.example` 只保留空变量名。
- 不使用 `NEXT_PUBLIC_` 暴露服务端 Secret；日志不得打印凭据、完整 token 或敏感业务正文。
- 没有真实数据时显示明确空状态，不伪造业务数据。

## 6. Design System

视觉基调：低饱和 Bento Grid、AI Native、Developer Tool、Product Intelligence、Professional、Data Driven。以锌黑、近白和中性灰承担主体结构；蓝、紫、粉、橙只用于小面积状态、领域与交互提示，不得铺满大面积内容区域。

使用四列响应式网格、不同跨度的内容模块、16–28px 圆角、1px 低对比度边框和柔和扩散阴影。主要内容使用大卡片，指标和状态使用小卡片；情报正文与表格优先易读性，不强制所有内容卡片化或添加 hover 动画。避免粗黑边、硬阴影、高饱和色块、紫色渐变、Cyberpunk、glow、emoji、玻璃拟态和拥挤 Dashboard。优先清晰层级、适度留白、可访问对比度、键盘可用性与 `prefers-reduced-motion`。完整规则见 `docs/design/bento-grid-DESIGN.md`，设计 token 统一维护在 `src/styles/tokens.css`，应用覆盖规则位于 `src/styles/bento.css`。

## 7. Git 规则

- Bootstrap 首次提交允许直接使用 `main`；完成后功能开发必须使用 `feat/<scope>`。
- 推荐分支：`feat/feishu-integration`、`feat/dashboard-ui`、`feat/intelligence-pool`、`feat/demand-pool`、`feat/collector`、`feat/notifications`。
- 不建立 develop/staging/release 长期分支。
- Commit 使用清晰的英文 Conventional Commits，例如 `feat: bootstrap SignalFlow workspace`。
- 提交前检查 `git diff`、Secret、lint、typecheck 与 build；不得擅自覆盖用户未提交的改动。

## 8. 测试原则

验证应与风险匹配。每次变更至少运行相关 lint/typecheck；影响构建、路由或配置时运行 production build。未来 Repository/Adapter 使用契约测试，真实飞书调用以可替换 transport 隔离，测试不得依赖真实 Secret。

## 9. Reference Projects 与许可证

- `leiting-eric/DailyBrief` — MIT；Collector 已选择性参考 Source Registry、dispatch、GitHub Trending、RSS、AttentionVC、normalization 与容错模式。保留 `docs/references/dailybrief.md` attribution，不迁移无关模块。
- `SANSAN0/TrendRadar` — GPL-3.0；仅做产品与架构参考。未完成许可证影响评估前，不复制源码。
- `assafelovic/gpt-researcher` — Apache-2.0；未来高价值信号研究管线参考，当前不集成。
- `makeplane/plane` — 仅研究需求详情、状态、Kanban、Timeline 与过滤交互，不搬运大型源码。

## 10. 明确禁止

禁止浏览器持有飞书或 LLM Secret，禁止页面绕过 Repository，禁止提交 `.env.local`，禁止 Collector 默认写入，禁止 Agent 自动创建正式飞书需求，禁止保存或展示思维链，禁止把第三方公共端点当作稳定 SLA，禁止用昨日数据冒充今日情报，禁止无归属的大型工具函数，禁止提前建设 MCP 或多 Agent，禁止从 GPL 项目复制实现，禁止为了展示效果伪造真实来源或业务进度。
