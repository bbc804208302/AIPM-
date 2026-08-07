# TrendRadar Reference Note

Source: [SANSAN0/TrendRadar](https://github.com/SANSAN0/TrendRadar) · License: GPL-3.0 · reviewed 2026-08-07

## What to learn

- 多平台热榜与 RSS 使用统一的关键词分组和展示语义；配置按 app/report/notification/storage/platforms/rss/advanced 分区。
- RSS 以 `guid > normalized URL` 作为去重优先级，并提供 freshness filter；URL normalization 处理动态参数带来的重复。
- daily/current/incremental 三种模式把“完整快照、当前排名、只看新增”作为明确产品选择。
- 存储层抽象本地 SQLite 与 S3-compatible remote；采集、分析、查询和通知可独立演进。
- AI filter、趋势比较、聚合去重、Feishu 多渠道通知与 MCP 展示了完整产品上限，但不是 Phase 0 范围。

## SignalFlow adaptation

借鉴其去重键策略、增量 watermark、source health、配置分层和通知通道边界。SignalFlow 的产品默认应强调“高价值产品信号”，而非热搜总量。

GPL-3.0 具有 copyleft 影响。完成正式许可证评估前只参考概念和交互，不复制实现、配置模板或大段源码。
