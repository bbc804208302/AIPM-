# System Overview

## Product flow

```text
Public Sources
  ↓
Collector → Normalize → Deduplicate → Daily Top 10
  ↓
SignalFlow Intelligence Repository
  ↓
AI 产品情报池
  ↓
Product Opportunity Agent daily-triage → Top 3 推荐 → single-signal 深度分析 → Agent Run / Memory Repository → 候选需求 → Human Review

Feishu Bitable → Demand Repository → 内部需求池
```

Phase 3 在 Daily Intelligence 基础上增加 Product Opportunity Agent。AI 产品情报不再以飞书为主数据源；可选 LLM 审校层仅在 Collector 显式写入阶段运行。Agent 初筛由本地维护者或每日 GitHub Action 发起，单条深度分析由本地维护者或手动 GitHub Action 发起；公开页面只读取已经提交的脱敏运行记录。

## Opportunity Agent boundaries

```text
Latest dual-track Signals
  → list_daily_signals
  → search_memory for every Signal
  → score_candidates with fixed weighted formula
  → recommend_top_signals (up to Top 3)
  → selected Signal ID
  → get_signal (Intelligence Repository)
  → search_memory (Agent Run Repository)
  → LLM chooses one next action
  → create_demand_proposal OR reject_signal
  → persist tool trace + decision + proposal
  → Human Review
```

这是同一个 Product Opportunity Agent 的两种受控运行模式，而不是多 Agent 编排。模型每轮只能调用一个工具，并必须等待 Observation 后再决定下一步。服务端强制初筛的全量覆盖与工具顺序，也强制深度分析的 `get_signal → search_memory` 前置顺序；候选需求不会自动写入飞书。系统不保存模型思维链，只保存公开证据、结构化评分、工具调用摘要、Memory 命中、最终决策和运行指标。

## Collector boundaries

```text
src/collector/sources.config.json
  → Registry validation
  → AI RSS / Domain RSS / GitHub Trending / AttentionVC adapters
  → Normalized IntelligenceCandidate
  → Canonical URL fingerprint deduplication
  → source-diverse daily selection
  → deterministic Chinese overview → optional LLM review → explicit --write gate
  → SignalFlow daily snapshot
```

每个数据源独立超时和失败，单源异常不阻塞整批。Collector 默认 dry-run；显式写入只更新当天的公开情报快照，不读取或修改飞书内部需求。

## Web application boundaries

```text
Presentation (src/app, src/components, src/features)
  ↓ depends on
Application (src/services)
  ↓ depends on
Domain repository interfaces (src/repositories, src/types)
  ↓ implemented by
Infrastructure adapters (src/lib/feishu)
  ↓ server-side only
Feishu OpenAPI / Bitable
```

依赖方向始终向内：领域类型不依赖飞书字段，页面不理解 token、分页或 OpenAPI 错误。这样未来可增加缓存、测试替身或其他数据源，而不重写页面。

## Current decisions

- Next.js App Router 作为 Web 与 Server boundary。
- 飞书多维表格只作为内部需求池事实来源。
- AI 产品情报当前使用版本化 JSON Repository，未来通过同一接口迁移 PostgreSQL。
- Agent Memory 当前使用 `data/agent/runs.json`，生产读取使用静态打包快照，写入只允许本地或 GitHub Action。
- 所有凭据只在服务端环境变量读取。
- 页面以真实空状态为准，不创建假新闻或假需求。
- Collector 与 Opportunity Agent 是独立 bounded context；GitHub Actions 分别承担每日采集、09:15 机会初筛和手动深度分析，LLM 由 GitHub Secrets 注入，通知仍保留为未来能力。
