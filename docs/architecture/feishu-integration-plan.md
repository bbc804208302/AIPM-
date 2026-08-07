# Phase 1: Feishu Integration Plan

## Goal

以只读方式接入“内部需求池”和“AI 产品情报池”，验证字段映射、鉴权、安全边界与 Repository contract。第一阶段不写回数据，不做机器人推送。

## Implementation status

Completed on `feat/feishu-integration`:

- server-only environment validation;
- custom-app `tenant_access_token` acquisition with cache, refresh safety window and concurrent request coalescing;
- injectable HTTP transport with timeout and safe error classification;
- current Bitable record search API with complete cursor pagination;
- batch record retrieval and offline unit tests.

Pending real schema and credentials:

1. 确认两张 Bitable 表的字段 schema、唯一标识、状态枚举与时间字段。
2. 分别实现 `FeishuDemandRepository` 与 `FeishuIntelligenceRepository`，把 records 映射为稳定领域类型。
3. 在 Application Service 中编排列表与详情用例；页面只依赖这些用例。
4. 增加字段缺失与 Repository contract 测试。
5. 使用真实小规模数据完成只读验收，再评估写回、缓存与 webhook。

## Required inputs

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_BITABLE_APP_TOKEN`
- `FEISHU_DEMAND_TABLE_ID`
- `FEISHU_INTELLIGENCE_TABLE_ID`
- 两张表的字段名、字段类型与至少一条脱敏样例

这些值只能进入 `.env.local` 或部署平台 Secret 管理。

## Acceptance criteria

- 浏览器 bundle 不包含任何飞书 Secret。
- 页面或 Client Component 不直接请求 Feishu OpenAPI。
- 两个 Repository 可由测试替身替换。
- API timeout、鉴权失败、限流和空数据有明确错误语义。
- UI 展示真实数据或真实空状态，不回退到伪造内容。

## OpenAPI decisions

- 自建应用使用 `POST /auth/v3/tenant_access_token/internal/` 获取应用身份凭证。
- 记录读取使用 `POST /bitable/v1/apps/:app_token/tables/:table_id/records/search`；不使用已标记为历史接口的旧 records list。
- 单页最多 500 条，服务端持续消费 `page_token`，直到 `has_more=false`。
- 按 ID 获取使用 `records/batch_get`，单次最多 100 个 ID。
