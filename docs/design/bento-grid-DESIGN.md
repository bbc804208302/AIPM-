# 便当盒布局 (Bento Grid) — Design Specification

> Category: modern | Tags: modern, responsive

## Design Philosophy

Bento Grid（便当盒布局）是一种源于日式便当盒分隔设计的现代布局风格。通过不同尺寸的卡片在网格中的组合排列，创造出既有秩序又富有变化的视觉效果。

核心理念：
- 模块化：每个区块独立但相互关联
- 层次感：通过尺寸差异突出重点内容
- 留白：适当间隙让布局呼吸
- 响应式：在不同屏幕上优雅适配
- Widget 把玩感：每张卡片如独立的 iOS 小组件

## Color System

| Role | Hex | Swatch | CSS Variable |
|------|-----|--------|-------------|
| Graphite | `#202428` | ██ | `--sf-black` |
| Warm Canvas | `#f3f2ee` | ██ | `--sf-bg` |
| Ivory Surface | `#fcfbf8` | ██ | `--sf-white` |
| Mist Blue | `#3f6578` | ██ | `--sf-accent` |
| Sage Success | `#67806d` | ██ | `--sf-success` |
| Amber Warning | `#a97842` | ██ | `--sf-warning` |
| Brick Danger | `#a65353` | ██ | `--sf-danger` |

SignalFlow 应用约束：采用“情报编辑部”低饱和配色。暖灰画布、象牙白卡片与石墨侧栏承担主要结构，雾霾蓝只用于链接、选中和焦点，鼠尾草绿、琥珀棕与砖红只表达业务状态，不允许作为大面积卡片背景。

## Typography

| Level | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|----------------|
| h1 | 40–56px | 700 | 1.08 | -0.035em |
| h2 | 26–34px | 700 | 1.15 | -0.025em |
| h3 | 18–22px | 650 | 1.3 | -0.015em |
| Body | 14–16px | 400–550 | 1.65 | 0 |
| Caption | 12–13px | 550–650 | 1.45 | 0.02em |

- 中文正文使用系统无衬线字体，避免等宽字体承担长文本。
- 等宽字体只用于 ID、时间、来源状态与技术元数据。
- 情报标题最多使用 700 字重，减少当前 900 字重造成的视觉噪声。

## Component Specifications

### Button

- **Padding**: `12px 24px`
- **Border**: 1px 中性边框或无边框
- **Border Radius**: 12px
- **Background**: Primary 使用石墨色 `#202428`，Secondary 使用象牙白 `#fcfbf8`
- **Text**: 14px / 600
- **Hover**: 上浮 2px，背景轻微变化，阴影扩散
- **Active**: `scale(.95)`
- **Transition**: 200ms ease-out

### Card

- **Background**: 白色或近白色，不使用玻璃拟态
- **Border**: 1px 中性灰
- **Border Radius**: 16–24px
- **Padding**: 20–28px
- **Shadow**: 默认极浅，hover 扩散到 `0 8px 30px rgba(0,0,0,.08)`
- **Hover**: 只用于可点击卡片；表格行和情报正文不整体浮动
- **Hierarchy**: 主要内容允许跨两列，指标和状态使用小卡片

### Input

- **Background**: `#f7f6f2`
- **Border**: 1px `#d8d7d1`
- **Border Radius**: 12px
- **Focus**: 雾霾蓝 20% ring 与同色边框
- **Text**: 14px 正文字号

### Navigation

- **Background**: 白色或深锌色侧栏
- **Border**: 1px 低对比度分隔线
- **Padding**: 16–24px
- **Active**: 低饱和填充与清晰文字，不使用硬阴影

## Do ✅

- [x] 使用 CSS Grid 布局 grid grid-cols-4
- [x] 卡片跨越多行或多列 col-span-2, row-span-2
- [x] 保持一致的间隙 gap-4 或 gap-6
- [x] 使用圆角 rounded-xl 或 rounded-2xl
- [x] 大卡片放置主要内容，小卡片放置次要信息
- [x] 使用 aspect-ratio 保持卡片比例
- [x] 悬停时平滑上浮 + 微放大 hover:-translate-y-1 hover:scale-[1.01]
- [x] 悬停时阴影从紧凑变宽广（shadow-sm -> shadow-xl）
- [x] 卡片内图标在 group-hover 时独立变色或 scale-110
- [x] 使用类弹簧缓动 ease-out，duration-200 到 300

## Don't ❌

- [x] 禁止所有卡片大小相同（失去 Bento 特色）
- [x] 禁止间隙不一致
- [x] 禁止卡片过于拥挤无留白
- [x] 禁止忽略响应式适配
- [x] 禁止在卡片内堆砌过多内容
- [x] 禁止使用硬边阴影（shadow-[Xpx_Ypx_0px]）
- [x] 禁止使用直角（需要圆角）

## AI Rules

```text
必须使用四列响应式 CSS Grid、不同跨度的卡片、一致间隙、圆角和柔和阴影。交互卡片 hover 上浮并微放大，active 提供按压反馈。禁止全部卡片同尺寸、硬边阴影、直角、拥挤内容和不一致间距。SignalFlow 额外限制大面积鲜艳背景，Accent 仅服务状态与操作。
```

## Keywords

网格, 卡片, 不规则, 作品集, 现代
