# DailyBrief Reference Note

Source: [leiting-eric/DailyBrief](https://github.com/leiting-eric/DailyBrief) · License: MIT · reviewed 2026-08-07

## What to learn

- `sources.config.json` 是 Source Registry 的单一事实来源；配置包含 source id、type、category、locale、enabled、URL/feed 等，registry 负责 schema 校验和 locale/enable 过滤。
- `lib/sources/dispatch.ts` 提供单一 dispatch 入口；通用 RSS 走共享 fetcher，特殊公共 API 按 id 路由到独立实现。
- 所有 fetcher 返回统一 `RawArticle[]`，把 title、url、source、publishedAt 等字段先归一化，再交给下游。
- `lib/ai/llm.ts` 通过 `LLM_BACKEND` 选择实现，调用方只依赖 `runLlm()`，不直接 import vendor backend。
- 每个 source 的失败是 non-fatal；单源 try/catch、timeout、结构化日志和 dry-run 让部分故障不阻断整批任务。
- GitHub Actions 用时区 gate 与环境变量控制调度；启动前先校验 LLM backend/key 配对，减少晚失败。

## SignalFlow adaptation

未来 Collector 可采用 `SourceDefinition → Registry → Dispatcher → Adapter → NormalizedSignal`，并提供 registry schema check 与 fetch-only smoke test。保留 per-source fault isolation、超时、错误分类和可插拔分析后端。

不迁移股票、Crypto、交易分析、财经/政治栏目和日报 HTML renderer。若选择性复用 MIT 代码，保留许可证与必要 attribution，不 fork 整仓改名。
