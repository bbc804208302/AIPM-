# System Overview

## Product flow

```text
Public Sources
  ↓
Collector → Normalize → Deduplicate → AI Analyzer
  ↓
Product Intelligence
  ↓
Feishu Bitable
  ↓
SignalFlow Web App
  ↓
Dashboard / Intelligence / Demands / Notification
```

Collector 之后的能力属于未来阶段，本次初始化不实现。

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

## Phase 0 decisions

- Next.js App Router 作为 Web 与 Server boundary。
- 飞书多维表格在 Phase 1 是业务事实来源，不引入额外数据库。
- 所有凭据只在服务端环境变量读取。
- 页面以真实空状态为准，不创建假新闻或假需求。
- Collector、LLM、通知与自动化保留为独立 future bounded contexts。
