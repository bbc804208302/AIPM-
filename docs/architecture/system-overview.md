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

Feishu Bitable → Demand Repository → 内部需求池
```

Phase 2 已实现公开源采集、归一化、去重、来源多样化今日 Top 10 与版本化每日快照。AI 产品情报不再以飞书为主数据源；可选 LLM 审校层仅在 Collector 显式写入阶段运行，不在公开页面运行。

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
- 所有凭据只在服务端环境变量读取。
- 页面以真实空状态为准，不创建假新闻或假需求。
- Collector 是独立 bounded context；GitHub Actions 承担每日执行，可选 LLM 审校以 GitHub Secrets 注入，通知仍保留为未来能力。
