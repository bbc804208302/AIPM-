# SignalFlow

**AI 产品情报与需求协同工作台**

SignalFlow 是一个面向 AI 产品经理的长期作品集项目，把外部产品信号与内部需求协作放进同一条可追踪的工作流：

`External Signal → Product Insight → Potential Demand → Internal Demand`

当前仓库处于 Phase 0：仅包含工程基础、设计系统、应用外壳和飞书数据访问边界。尚未接入真实数据、采集器、LLM、定时任务或通知。

## 当前能力

- 深色、科技绿的中文工作台外壳
- 情报池、需求池、数据源、采集任务的导航边界
- 服务端飞书适配器与 Repository Pattern 的类型占位
- 飞书凭据校验、tenant token 缓存与 Bitable 分页读取基础
- 架构、参考项目与后续飞书接入计划
- TypeScript strict、ESLint、Tailwind CSS 4

## 本地开发

要求：Node.js 20.9+、pnpm 11+

```bash
pnpm install
pnpm dev
```

验证：

```bash
pnpm check
```

## 环境变量

```bash
cp .env.example .env.local
```

`.env.local` 仅用于本地真实值，禁止提交。浏览器端不得持有飞书 Secret。

## 架构原则

```text
React Component
  → Application Service / Repository
  → Feishu Adapter
  → Next.js Server
  → Feishu OpenAPI
  → Bitable
```

页面只依赖 Repository 接口，不直接调用飞书 API。详细说明见 [系统架构](docs/architecture/system-overview.md) 与 [飞书接入计划](docs/architecture/feishu-integration-plan.md)。

## 开发规则

Codex 或其他开发代理修改仓库前必须先阅读 [AGENTS.md](AGENTS.md)。第一次 bootstrap 可以直接落在 `main`；之后所有功能使用 `feat/*` 分支。

## 参考与许可证

调研笔记位于 `docs/references/`。DailyBrief（MIT）只考虑选择性复用并保留 attribution；TrendRadar（GPL-3.0）当前仅作为架构与产品参考，不复制源码；GPT Researcher（Apache-2.0）和 Plane 仅用于未来能力与交互研究。

## Repository

[bbc804208302/AIPM-](https://github.com/bbc804208302/AIPM-)
