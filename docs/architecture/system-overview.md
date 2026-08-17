# System Overview

## Product flow

```text
Public Sources
  ↓
Collector → Normalize → Deduplicate → Candidate Snapshot (max 20)
  ↓
SignalFlow Intelligence Repository
  ↓
Product Intelligence Agent daily-triage → 中文概述 + PM 价值分类 + 全量机会评分
  ↓
AI 产品情报池（机会分降序）→ 高分自动或人工 single-signal 深度分析 → Agent Run / Memory Repository → 候选需求 → Human Review

Fixed Historical Intelligence → Agent Eval → Effect Metrics + Bad Case Root Cause → Prompt / Strategy Iteration

Feishu Bitable → Demand Repository → 内部需求池
```

Phase 4 将 Product Intelligence Agent 纳入 Daily Intelligence 主链路。Collector 只生成最多 20 条低成本候选；Agent 统一负责中文概述、Memory 去重、PM 价值分类、机会评分排序和高分自动深度分析。公开页面只读取已经提交的候选快照和脱敏 Agent 运行记录，不在访客请求中调用 LLM。

## Product Intelligence Agent boundaries

```text
Latest dual-track Candidates (max 20)
  → list_daily_signals
  → search_memory for every Signal
  → score_candidates with Chinese overview + PM value type + fixed weighted formula
  → select_intelligence_for_pool
  → all intelligence sorted by opportunity score
  → priority Signal ID (max 3 automatic per day) or human-selected Signal ID
  → get_signal (Intelligence Repository)
  → search_memory (Agent Run Repository)
  → LLM chooses one next action
  → create_demand_proposal OR reject_signal
  → persist tool trace + decision + proposal
  → Human Review
```

这是同一个 Product Intelligence Agent 的两种受控运行模式，而不是多 Agent 编排。模型每轮只能调用一个工具，并必须等待 Observation 后再决定下一步。服务端强制候选全量覆盖、中文概述质量规则和工具顺序；机会分 70 以上每天最多自动深度分析 3 条，正式需求仍不会自动写入飞书。系统不保存模型思维链，只保存公开证据、结构化评分、工具调用摘要、Memory 命中、最终决策和运行指标。

## Agent Eval boundaries

```text
Historical Public Snapshot References + Human Labels
  → isolated daily-triage run (no production Memory writes)
  → deterministic evaluator
  → task completion / structured output / fact coverage
  → PM classification / score range / deep-analysis decision agreement
  → root-cause Bad Cases
  → versioned Evaluation Result
  → read-only Vercel dashboard
```

固定集运行不会修改每日情报、正式 Agent Memory 或飞书需求。评测结果记录数据集、Prompt、评分策略和模型版本；只有相同数据集版本的结果可以直接比较。当前属于作品集规模的离线 Eval，不把离线指标表述为真实线上用户任务完成率。

## Collector boundaries

```text
src/collector/sources.config.json
  → Registry validation
  → AI RSS / Domain RSS / GitHub Trending / AttentionVC adapters
  → Normalized IntelligenceCandidate
  → Canonical URL fingerprint deduplication
  → source-diverse candidate selection (max 20)
  → deterministic fallback overview → explicit --write gate
  → SignalFlow candidate snapshot
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
- Agent Eval 使用 `data/agent/evaluation` 中的固定真实情报引用、人工标签与版本化结果；生产页面保持静态打包只读。
- 所有凭据只在服务端环境变量读取。
- 页面以真实空状态为准，不创建假新闻或假需求。
- Collector 与 Product Intelligence Agent 保持边界清晰但由工作流串联；GitHub Actions 在 07:00 与 07:15 依次生成双轨候选，再于 07:30 执行 PM 价值分类、机会评分排序和最多 3 条高分自动深度分析。LLM 由 GitHub Secrets 注入，通知仍保留为未来能力。
