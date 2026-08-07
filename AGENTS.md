# SignalFlow Agent Rules

任何自动化开发代理在修改本仓库前，必须先完整阅读本文件。

## 1. 产品定位

SignalFlow（AI 产品情报与需求协同工作台）服务于 AI 产品经理。它连接外部 AI 产品信号、产品洞察、潜在用户需求与内部需求执行，目标是减少人工找信息与重复追问状态。

界面使用简体中文；代码、目录、类型和提交信息使用英文。AI、API、RSS、GitHub、Codex、LLM、MCP、URL 等技术名词可保留英文。

## 2. 当前阶段边界

当前为 Phase 1.5 / Product Experience Layer。允许：工程基础、设计系统、真实业务路由、无虚构数据的空状态、数据访问接口、文档与测试基础。

禁止在没有明确新任务时实现：真实信息采集、新闻爬虫、RSS Collector、LLM 分析、GitHub Actions 定时任务、Deep Research、MCP、多 Agent、飞书机器人推送或复杂需求自动化。不得生成虚构新闻或大批量 Mock Data。

## 3. 技术栈

- Next.js App Router、React、TypeScript strict
- Tailwind CSS、shadcn/ui 约定、Lucide；未来图表使用 Recharts
- pnpm 是唯一 package manager；不得提交 npm/yarn lockfile
- 优先 Server Components；仅在交互确有需要时使用 Client Components

## 4. 架构边界

目标链路：React Component → Application Service / Repository → Feishu Adapter → Next.js Server → Feishu OpenAPI → Bitable。

- React 页面不得直接调用飞书 OpenAPI。
- 页面依赖 `src/repositories` 中的领域接口。
- `src/lib/feishu` 只负责鉴权、请求、响应映射与错误翻译。
- `src/services` 编排用例，不承载具体 UI。
- 外部数据先映射到稳定领域类型，禁止让飞书字段结构泄漏到页面。

## 5. 数据与 Secret

Phase 1 的业务数据源是飞书多维表格：内部需求池、AI 产品情报池。

- `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`BITABLE_APP_TOKEN`、任何 `TABLE_ID`、`LLM_API_KEY` 永不进入 Git。
- 真实值只放 `.env.local` 或托管平台的 Secret 管理。
- `.env.example` 只保留空变量名。
- 不使用 `NEXT_PUBLIC_` 暴露服务端 Secret；日志不得打印凭据、完整 token 或敏感业务正文。
- 没有真实数据时显示明确空状态，不伪造业务数据。

## 6. Design System

视觉基调：深色/黑色、科技绿 Accent、AI Native、Developer Tool、Command Center、Minimal、Professional、Data Driven。

避免蓝白 OA、紫色 AI 渐变、满屏卡片、Cyberpunk、大量 glow、emoji 和模板化 Dashboard。优先清晰层级、紧凑信息密度、细边框、克制圆角、可访问对比度和键盘可用性。设计 token 统一维护在 `src/styles/tokens.css`。

## 7. Git 规则

- Bootstrap 首次提交允许直接使用 `main`；完成后功能开发必须使用 `feat/<scope>`。
- 推荐分支：`feat/feishu-integration`、`feat/dashboard-ui`、`feat/intelligence-pool`、`feat/demand-pool`、`feat/collector`、`feat/notifications`。
- 不建立 develop/staging/release 长期分支。
- Commit 使用清晰的英文 Conventional Commits，例如 `feat: bootstrap SignalFlow workspace`。
- 提交前检查 `git diff`、Secret、lint、typecheck 与 build；不得擅自覆盖用户未提交的改动。

## 8. 测试原则

验证应与风险匹配。每次变更至少运行相关 lint/typecheck；影响构建、路由或配置时运行 production build。未来 Repository/Adapter 使用契约测试，真实飞书调用以可替换 transport 隔离，测试不得依赖真实 Secret。

## 9. Reference Projects 与许可证

- `leiting-eric/DailyBrief` — MIT；重点参考 Source Registry、dispatch、normalization、LLM abstraction、容错与配置。选择性复用必须保留必要 attribution。
- `SANSAN0/TrendRadar` — GPL-3.0；仅做产品与架构参考。未完成许可证影响评估前，不复制源码。
- `assafelovic/gpt-researcher` — Apache-2.0；未来高价值信号研究管线参考，当前不集成。
- `makeplane/plane` — 仅研究需求详情、状态、Kanban、Timeline 与过滤交互，不搬运大型源码。

## 10. 明确禁止

禁止浏览器持有飞书 Secret，禁止页面绕过 Repository，禁止提交 `.env.local`，禁止无归属的大型工具函数，禁止提前建设 Collector/LLM/MCP/Agent，禁止从 GPL 项目复制实现，禁止为了展示效果伪造真实来源或业务进度。
