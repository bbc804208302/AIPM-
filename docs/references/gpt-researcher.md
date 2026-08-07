# GPT Researcher Reference Note

Source: [assafelovic/gpt-researcher](https://github.com/assafelovic/gpt-researcher) · License: Apache-2.0 · reviewed 2026-08-07

## What to learn

其核心管线把 planning 与 execution 分开：先基于研究问题生成子问题，再并行检索和抓取，逐来源总结并跟踪引用，最后过滤、聚合与发布报告。多源与引用链用于降低单一来源偏差。

## SignalFlow future use

只在某条信号已经通过价值筛选后触发 Deep Research：

`High Value Signal → Research Brief → Sub-questions → Evidence Gathering → Source Validation → Synthesis → Product Implication`

研究输出必须保留 claim-to-source 关系、来源时间、可信度和不确定性。当前不安装、不调用、不集成任何 research agent。
