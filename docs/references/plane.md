# Plane Reference Note

Source: [makeplane/plane](https://github.com/makeplane/plane) · reviewed 2026-08-07

## Interaction patterns to learn

- 同一 issue/work item 可在 list、Kanban、calendar 与 timeline 等视图间切换，视图是同一数据的投影。
- Issue detail 把状态、优先级、负责人、周期、关系、活动、评论与附件组织成可逐步展开的工作上下文。
- Filter / sort / group 配置与具体视图解耦，支持保存工作视角而不是复制数据。
- Intake 与正式 issue 分开，有利于实现“提出 → 评估 → 接受/驳回”的入口治理。
- Timeline 适合呈现已接受需求的执行承诺，不应在尚未评估时制造虚假日期确定性。

## SignalFlow adaptation

需求池优先实现列表 + 详情 + 状态时间线，再评估 Kanban。保持信息密度与快速切换，但不复制 Plane 的大型状态管理、组件库或源码。
