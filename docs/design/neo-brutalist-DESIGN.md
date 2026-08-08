# 新野兽派 (Neo-Brutalist) — Design Specification

> Category: expressive | Tags: expressive, high-contrast

## Design Philosophy

Neo-Brutalist（新野兽派）设计风格源于建筑领域的野兽派运动，强调原始、未经修饰的功能美学。在 Web 设计中，这种风格通过大胆的黑色边框、硬边缘阴影、锐利的直角和高对比度的配色方案来表达。

核心理念：
- 功能优先：每个元素都有明确的目的
- 诚实表达：不掩饰结构，不伪装功能
- 大胆直接：用视觉冲击力传达信息
- 反对圆滑：拒绝过度精致，拥抱粗犷

## Color System

| Role | Hex | Swatch | CSS Variable |
|------|-----|--------|-------------|
| Primary | `#000000` | ██ | `--color-primary` |
| Secondary | `#ffffff` | ██ | `--color-secondary` |
| Accent 1 | `#ff006e` | ██ | `--color-accent-1` |
| Accent 2 | `#ccff00` | ██ | `--color-accent-2` |
| Accent 3 | `#00d9ff` | ██ | `--color-accent-3` |
| Accent 4 | `#ff9500` | ██ | `--color-accent-4` |

## Typography

SignalFlow 使用系统无衬线字体承载中文正文，标题采用 800–900 字重形成粗砺层级；ID、时间、状态与技术标签使用等宽字体。界面不依赖全大写英文制造“科技感”，只对短标签和系统状态使用 uppercase。

| Level | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|----------------|
| h1 | 40px / 64px | 900 | 0.95 | -0.04em |
| h2 | 28px / 40px | 900 | 1.05 | -0.03em |
| h3 | 18px / 22px | 800 | 1.2 | -0.01em |
| Body | 14px / 16px | 500 | 1.65 | 0 |
| Caption | 10px / 12px | 700 | 1.4 | 0.08em |

## Component Specifications

### Button

- **Padding**: mobile `12px 20px`; desktop `16px 32px`
- **Border**: `2px` mobile / `4px` desktop solid black
- **Border Radius**: `0`
- **Background**: CTA pink `#ff006e`; secondary uses white or lime `#ccff00`
- **Text**: black weight 900; white only on pink or black backgrounds
- **Hover**: hard color switch, `translate(-4px, -4px)`, hard shadow grows from `6px` to `10px`
- **Active**: `translate(6px, 6px)` and no shadow; displacement equals the original shadow
- **Transition**: `150ms ease-out`; reduced-motion disables translation

### Card

- **Background & Backdrop**: solid white or black; no transparency or backdrop blur
- **Border & Glow**: `2px` mobile / `4px` desktop black border; `8px 8px 0 #000` hard shadow
- **Padding**: `16px` mobile / `32px` desktop
- **Hover**: high-contrast background switch and `12px 12px 0 #ff006e` hard shadow
- **Decorations**: functional index blocks, corner labels and grid lines only

### Input

- **Background**: solid white
- **Border**: `2px` mobile / `4px` desktop black
- **Border Radius**: `0`
- **Focus**: black hard shadow, no blur
- **Placeholder**: black at 55% visual weight, while retaining accessible contrast
- **Text**: 14–16px mono for query/status fields; sans-serif for Chinese long text

### Navigation

- **Background & Backdrop**: solid white or black; no translucent surface
- **Border**: `2px` mobile / `4px` desktop black separator
- **Height/Padding**: 56px mobile / 68px desktop; 16px / 32px horizontal padding
- **Brand**: 800–900 weight wordmark with an exposed square system mark

## Do ✅

- [ ] 使用纯黑边框，移动端 2px、桌面端 4px
- [ ] 使用不带模糊的硬边缘阴影
- [ ] 保持直角和可见结构
- [ ] 使用黑白基础与鲜艳强调色形成高对比
- [ ] 标题使用高字重，技术信息使用等宽字体
- [ ] 为移动端和桌面端提供响应式尺寸
- [ ] 按钮按下时完全压平硬阴影
- [ ] Hover 使用 150ms 硬切换而不是淡入淡出
- [ ] 卡片 Hover 保持生猛但短促的碰撞感
- [ ] 所有交互支持 `prefers-reduced-motion`

## Don't ❌

- [ ] 禁止使用中大圆角或药丸形内容容器
- [ ] 禁止使用模糊阴影
- [ ] 禁止使用渐变
- [ ] 禁止使用灰色边框弱化结构
- [ ] 禁止使用半透明玻璃拟态
- [ ] 禁止把所有数据区都包装成卡片
- [ ] 禁止按钮按下位移小于原始阴影距离
- [ ] 禁止 Hover 使用 opacity 淡变
- [ ] 禁止用无意义装饰压过产品数据

## AI Rules

```text
你是一个 Neo-Brutalist 设计风格的前端开发专家。生成的所有代码必须严格遵守以下约束：

## 绝对禁止

- 圆角：rounded-lg, rounded-md, rounded-xl, rounded-full（用于装饰圆除外）
- 模糊阴影：shadow-lg, shadow-xl, shadow-2xl, shadow-md
- 渐变：bg-gradient-*
- 灰色边框：border-gray-*, border-slate-*
- 淡入淡出的半透明效果

## 必须遵守

- 无圆角或 rounded-none
- 硬边缘阴影 shadow-[Xpx_Xpx_0px_0px_rgba(0,0,0,1)]
- 纯黑边框 border-black
- hover 时阴影消失 + translate 位移
- 标题 font-black，正文 font-mono

## 配色

主色：黑 #000000、白 #ffffff
强调色：
- accent-pink: #ff006e（CTA、hover）
- accent-green: #ccff00（成功、装饰）
- accent-blue: #00d9ff（链接、信息）
- accent-yellow: #ff9500（标签、警示）

## 响应式规则

所有样式必须包含移动端和桌面端两套值：
- 间距：p-4 md:p-8, py-12 md:py-32
- 边框：border-2 md:border-4
- 阴影：shadow-[4px] md:shadow-[8px]
- 字号：text-sm md:text-base, text-xl md:text-3xl
- 移动端约为桌面端的 50%

## Animation & Interaction Rules

- Physical Crushing: 按钮 active:translate-x-[Npx] active:translate-y-[Npx] active:shadow-none，N 必须等于原始阴影像素值，实现实体完全压平的碾压感。
- Brutal Snap: hover 时瞬间切换高对比背景色（如 hover:bg-[#ffff00]），duration-150 ease-out，禁止渐变或 opacity 过渡——必须是硬切。
- Zero Rounding Easing: 所有过渡 ease-out duration-150，保持生猛的碰撞感，拒绝柔化。
- Heavy Focus: 卡片 hover 时增大阴影并换为彩色（rgba(255,0,110,1)），同时背景变色，强调物理冲击。

## 自检

每次生成代码后检查：
1. 没有圆角
2. 没有模糊阴影
3. 边框是纯黑
4. active 位移量等于阴影像素值
5. 有 md: 响应式前缀
```

## Keywords

粗边框, 硬阴影, 无圆角, 高对比, 功能主义
