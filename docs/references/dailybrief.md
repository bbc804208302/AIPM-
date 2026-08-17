# DailyBrief Reference Note

Source: [leiting-eric/DailyBrief](https://github.com/leiting-eric/DailyBrief) · License: MIT · reviewed 2026-08-07

## What to learn

- `sources.config.json` 是 Source Registry 的单一事实来源；配置包含 source id、type、category、locale、enabled、URL/feed 等，registry 负责 schema 校验和 locale/enable 过滤。
- `lib/sources/dispatch.ts` 提供单一 dispatch 入口；通用 RSS 走共享 fetcher，特殊公共 API 按 id 路由到独立实现。
- 所有 fetcher 返回统一 `RawArticle[]`，把 title、url、source、publishedAt 等字段先归一化，再交给下游。
- `lib/ai/llm.ts` 通过 `LLM_BACKEND` 选择实现，调用方只依赖 `runLlm()`，不直接 import vendor backend。
- 每个 source 的失败是 non-fatal；单源 try/catch、timeout、结构化日志和 dry-run 让部分故障不阻断整批任务。
- GitHub Actions 用时区 gate 与环境变量控制调度；启动前先校验 LLM backend/key 配对，减少晚失败。
- `lib/ai/prompts.ts` 与 `lib/ai/enrich.ts` 不使用统一套话，而是按 GitHub、新闻/RSS、X 分别定义中文编辑任务：GitHub 解释项目做什么与解决什么问题，新闻保留关键事实和数字，X 以正文预览为事实来源。
- 中文摘要要求高信息密度、事实中性、避免营销表达；证据不足时宁可缩短，也不补写无法验证的能力。输出固定为结构化 JSON，并通过稳定 id/URL 对齐原始条目。

## SignalFlow adaptation

Phase 2 Collector 已采用 `SourceDefinition → Registry → Dispatcher → Adapter → NormalizedSignal`，并提供 registry validation、fetch-only dry-run、per-source fault isolation、timeout 与 URL 指纹去重。

选择性参考范围：

- `sources.config.json` 的配置驱动模式
- `lib/sources/dispatch.ts` 的单一 dispatch 入口
- `lib/sources/github-trending.ts` 的 daily trending HTML 解析思路
- `lib/sources/rss.ts` 的共享 RSS adapter
- `lib/sources/attentionvc.ts` 对 AttentionVC AI leaderboard 公共端点的接入思路
- `lib/ai/prompts.ts`、`lib/ai/enrich.ts` 的分来源中文总结契约、中文输出锁定与“信息不足不编造”原则

SignalFlow 的实现使用独立领域类型、AI 产品关键词过滤、飞书 Schema 映射和显式写入门禁，并非整仓 Fork。DailyBrief 的 MIT 版权声明与许可条件见其 [LICENSE](https://github.com/leiting-eric/DailyBrief/blob/main/LICENSE)。

不迁移股票、Crypto、交易分析、财经/政治栏目和日报 HTML renderer。若选择性复用 MIT 代码，保留许可证与必要 attribution，不 fork 整仓改名。

DailyBrief 的新闻管线允许更宽的历史时间窗；SignalFlow 当前采用近 15 个 `Asia/Shanghai` 自然日，并在选取前排除历史快照中 URL 或规范化标题相同的已读内容。GitHub Trending 因属于实时日榜而作为无发布时间的例外；每日以 10 条为目标、20 条为硬上限，严格去重后不足 10 条时不复用旧内容填充。
