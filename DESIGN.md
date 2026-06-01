---
name: Nimbus Notes
description: A quiet personal knowledge garden where notes grow useful connections.
colors:
  forest-canopy: "#234d3d"
  moss-ink: "#17221d"
  garden-muted: "#68756e"
  soft-ground: "#f6f3eb"
  leaf-paper: "#fffdf8"
  new-growth: "#dceeb5"
  tag-meadow: "#edf3dd"
  tag-ink: "#526738"
  terracotta-marker: "#e77b4c"
  placeholder-muted: "#a4aaa4"
typography:
  display:
    fontFamily: "Georgia, Songti SC, serif"
    fontSize: "clamp(54px, 8vw, 92px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.08em"
  headline:
    fontFamily: "Georgia, Songti SC, serif"
    fontSize: "30px"
    fontWeight: 400
  title:
    fontFamily: "Georgia, Songti SC, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "Arial, PingFang SC, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: "Arial, PingFang SC, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.16em"
rounded:
  none: "0"
  mark: "50%"
  pill: "30px"
spacing:
  chip-x: "8px"
  chip-y: "5px"
  field: "10px"
  button-x: "16px"
  button-y: "11px"
  card: "20px"
  composer: "28px"
components:
  button-primary:
    backgroundColor: "{colors.forest-canopy}"
    textColor: "{colors.leaf-paper}"
    rounded: "{rounded.none}"
    padding: "{spacing.button-y} {spacing.button-x}"
  tag-chip:
    backgroundColor: "{colors.tag-meadow}"
    textColor: "{colors.tag-ink}"
    rounded: "{rounded.pill}"
    padding: "{spacing.chip-y} {spacing.chip-x}"
  note-card:
    backgroundColor: "{colors.leaf-paper}"
    textColor: "{colors.moss-ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.card}"
---

# Design System: Nimbus Notes

## 1. Overview

**Creative North Star: "生长中的知识花园"**

Nimbus 是一个安静的个人知识花园。界面给记录、阅读和回顾留出空间，让标签与笔记连接像新枝一样自然出现。颜色来自叶片、土壤和少量手写标记，但产品始终服务于用户的思考，不把视觉隐喻变成装饰负担。

系统保持 Notion 的克制、Linear 的清晰，以及 Readwise 的知识回顾感。它明确拒绝企业后台式的信息堆叠、过度花哨的装饰，以及让用户承担整理工作的复杂控件。

**Key Characteristics:**
- 森林绿作为主要行动色，使用克制。
- 纸面色承载阅读，淡青柠只提示新生和连接。
- 陶土橙只用于少量强调，不成为大面积装饰。
- 平面为主，结构性阴影只出现在输入和悬停反馈。
- 组件保持熟悉、直接、轻触感。

## 2. Colors

这是一组偏自然的学习工具色彩：稳定的深绿承载行动，纸面中性色承载内容，淡青柠与陶土橙提供少量生命力。

### Primary
- **Forest Canopy** (`forest-canopy`): 主要操作、品牌标记、连接文本和短标签标题。
- **Moss Ink** (`moss-ink`): 主文本与高对比内容。

### Secondary
- **New Growth** (`new-growth`): 输入区偏移阴影与悬停反馈，表达知识正在长出新连接。
- **Terracotta Marker** (`terracotta-marker`): 标题强调、序号和轻量图形提示。只用于稀疏标记。

### Neutral
- **Soft Ground** (`soft-ground`): 页面背景。
- **Leaf Paper** (`leaf-paper`): 输入区域、卡片和详情抽屉表面。
- **Garden Muted** (`garden-muted`): 次要文本、日期和状态信息。
- **Tag Meadow** (`tag-meadow`): 标签胶囊背景。
- **Tag Ink** (`tag-ink`): 标签文本。
- **Placeholder Muted** (`placeholder-muted`): 输入提示；上线前必须验证其对比度。

### Named Rules

**The Garden Restraint Rule.** 森林绿用于行动，淡青柠用于状态，陶土橙用于标记。任何一屏都不得让三个强调色同时大面积争夺注意力。

**The Paper Surface Rule.** 阅读内容始终落在纸面中性色上。禁止用饱和色铺满笔记卡片。

## 3. Typography

**Display Font:** Georgia（中文回退为 Songti SC）

**Body Font:** Arial（中文回退为 PingFang SC）

**Character:** 衬线字体只承载品牌、标题和笔记标题，让页面有阅读感。无衬线字体负责输入、正文、按钮和状态信息，保证操作清晰。

### Hierarchy
- **Display**（400，`display`，0.98）：仅用于首页主标题。
- **Headline**（400，`headline`）：用于输入区和主要区域标题。
- **Title**（400，`title`，1.25）：用于卡片标题。
- **Body**（400，`body`，1.9）：用于详情正文；长文本限制在 65–75ch。
- **Label**（700，`label`）：用于少量短标签和状态提示，不作为正文。

### Named Rules

**The Quiet Type Rule.** 衬线字体只用于内容层级，不用于按钮、表单控件和数据标签。

**The Breathing Room Rule.** 标题必须清晰分组，正文必须保留行距。禁止为了展示更多卡片压缩可读性。

## 4. Elevation

Nimbus 平面为主。层级首先通过纸面色、边界和间距表达。阴影不是装饰，只在需要表现输入区域的重要性、卡片悬停反馈或详情抽屉覆盖关系时出现。

### Shadow Vocabulary
- **Composer Growth Offset**（`8px 8px 0 var(--lime)`）：输入区域的结构性偏移阴影。
- **Card Hover Lift**（`5px 5px 0 var(--lime)`）：卡片悬停时的短暂反馈。
- **Drawer Overlay**（`-15px 0 45px rgba(23, 34, 29, .12)`）：详情抽屉覆盖主页面时使用。

### Named Rules

**The Flat Garden Rule.** 静止状态下保持平面。除输入区外，卡片只有在交互反馈中获得阴影。

## 5. Components

### Buttons
- **Shape:** 矩形直角（`0`）。
- **Primary:** Forest Canopy 背景、Leaf Paper 文本，内边距为 `button-y button-x`。
- **Hover / Focus:** 后续实现必须补充清晰的 `:hover`、`:focus-visible` 与 `:active` 状态。
- **Disabled:** 降低不透明度，并保持不可操作指针反馈。

### Chips
- **Style:** Tag Meadow 背景、Tag Ink 文本，胶囊圆角（`pill`）。
- **State:** 用于展示 AI 标签，不承担复杂筛选交互。

### Cards / Containers
- **Corner Style:** 直角（`0`）。
- **Background:** Leaf Paper。
- **Shadow Strategy:** 静止状态无阴影，悬停时使用 Card Hover Lift。
- **Border:** 使用低对比边界线。
- **Internal Padding:** `card`。

### Inputs / Fields
- **Style:** 主输入区使用无边框大文本区域；详情输入框与下拉框使用单线边界和 Leaf Paper 表面。
- **Focus:** 后续实现必须增加可见焦点环，不允许仅依赖浏览器默认值或颜色变化。
- **Error / Disabled:** 错误文案应出现在当前操作附近，并使用文本说明状态。

### Navigation
- **Style:** 顶部栏保持单层、轻量和低密度。品牌标记使用 Forest Canopy 圆形底色，状态指示只传达本地工作区状态。

### Note Detail Drawer
- **Style:** 右侧渐进展开，不使用模态对话框。保持上下文可见，避免打断用户回顾笔记的节奏。

## 6. Do's and Don'ts

### Do:
- **Do** 让输入动作成为页面最直接的操作。
- **Do** 使用 Forest Canopy 承载主要操作，使用 Terracotta Marker 做少量标记。
- **Do** 让卡片和详情抽屉保持清晰边界与充足留白。
- **Do** 支持键盘焦点、减少动态效果和移动端触控区域。
- **Do** 使用熟悉的按钮、输入框和渐进式详情抽屉。

### Don't:
- **Don't** 做成企业后台：禁止密集表格、复杂导航和管理系统式的信息堆叠。
- **Don't** 过度花哨：禁止无意义装饰、喧宾夺主的动画和强烈视觉噪音。
- **Don't** 制造整理负担：禁止要求用户在记录前先理解复杂分类体系。
- **Don't** 让卡片静止时堆叠宽泛柔和阴影。
- **Don't** 用陶土橙或淡青柠铺满大面积背景。
