## Context

当前 `RaceHud` 已经接管了赛中 `SETTINGS` 与 `RACE RESULTS` 的 canvas 绘制，但现状仍有三类问题。第一，overlay 面板和按钮大量使用大圆角、柔和渐变与玻璃卡片表达，整体更偏 iOS 毛玻璃，而不是用户要求的硬边 Tron 科幻语汇。第二，结果页 `SUMMARY / LAP SPLITS / LEADERBOARD` 之间的纵向节奏没有被硬性切区，导致标题、分段时间、排行榜状态文本存在重叠风险。第三，`SETTINGS` 与 `RESULTS` 的按钮语言没有统一，齿轮 icon 也不够像一个典型 gear。

约束条件：
- 保持当前字体方向与顶部 HUD 信息布局，不在这次 change 中改动字体系统。
- 继续使用现有 `RaceHud` canvas 绘制与点击热区结构，不引入 DOM overlay、CSS 按钮或第三方 UI 库。
- `SETTINGS` 与 `RESULTS` 必须继续兼容当前 `GameScene` 的点击分发逻辑。
- 风格必须避免大圆角和明显渐变，但仍允许极轻微的蓝色辉光作为 Tron 味道。

## Goals / Non-Goals

**Goals:**

- 将 `SETTINGS` 与 `RACE RESULTS` 收敛为硬边、半透明、低彩度的 Tron 蒙版风格。
- 修复结果页中 summary、lap splits、leaderboard 之间的重叠与节奏混乱问题。
- 统一 overlay 按钮方案，使 settings 与 results 使用同一类交互控件与按下反馈。
- 将 settings icon 重绘成更明确的齿轮轮廓。

**Non-Goals:**

- 不修改顶部 `TIME / LAP / POS / KM/H` 的字体方向。
- 不重做赛道背景、菜单页或车辆视觉。
- 不在本次方案中处理完赛判定或加圈逻辑 bug。

## Decisions

### 1. Overlay 视觉从“圆润玻璃卡片”切换为“硬边半透明 Tron 面”

`SETTINGS` 与 `RACE RESULTS` 不再使用大圆角、胶囊按钮和明显纵向渐变，而是统一改为：

- 深色中性半透明底面
- 细直线边框
- 很弱的蓝色外发光
- 极小倒角或切角，避免大圆角

这样做的原因：

- 直接回应“不要大圆角、不要渐变”的用户要求。
- 让 overlay 与赛道、线框、霓虹感更统一，不再显得像独立的 iOS 浮层。

备选方案：

- 保留当前玻璃卡片，只降低圆角和渐变强度。放弃，因为底层形状语言仍然偏软，风格不会真正转向。

### 2. 结果页采用显式分区布局，而不是自由堆叠文本

结果页将被拆成明确的结构区：

- Header 区：标题与最终名次
- Summary 区：最终名次、平均时速、完成时间
- Lap Splits 区：逐圈耗时
- Leaderboard 区：名次、名字、状态、时间
- Actions 区：`BACK / RETRY`

每个区块拥有独立的高度预算与起止边界，排行榜行高也由可见高度反推，而不是让 summary 和 leaderboard 共用自由流式空间。

这样做的原因：

- 结果页当前最核心的问题不是配色，而是内容区互相侵占。
- 只有先做硬性切区，才能保证不同屏宽下文字不再撞车。

备选方案：

- 继续在一个大面板里微调坐标常量。放弃，因为这会把问题维持在“碰运气摆位置”的状态。

### 3. Settings 与 Results 共用一套 action control primitive

`RESUME / RESTART RACE / EXIT TO MENU / BACK / RETRY` 将共用同一套按钮原语：

- 同样的边框与底面处理
- 同样的按下形态反馈
- 同样的文本对齐和字重规则

结果页底部的 `BACK / RETRY` 不再只是漂浮文字，而是与 settings 中的三个动作属于同一种控制语言，只是在尺寸与排布上更适合结果页底部。

这样做的原因：

- 统一交互语言，避免一个 overlay 像菜单按钮，另一个只像标签文字。
- 更容易把 press feedback 一次实现并复用。

备选方案：

- 只把 results 底部文字稍微加描边。放弃，因为仍然不是统一控件系统。

### 4. Gear icon 使用更典型的机械齿轮轮廓

settings icon 将从“近似圆形的机械表盘”重绘为更标准的 gear：

- 明确的外齿
- 清晰的内环与中心轴孔
- 保持无外框，但通过轮廓本身表达可识别性
- 按下时缩放与辉光提升，提供形态反馈

这样做的原因：

- 当前 icon 的问题不是大小，而是轮廓语言不够像 gear。
- 典型 gear 轮廓在小尺寸下也更容易被快速识别。

## Risks / Trade-offs

- [硬边面板如果处理过重，可能压过顶部 HUD 的轻量字体] → 保持 overlay 底色偏中性、发光极弱，只让边线承担风格识别。
- [结果页强行切区后，窄屏空间可能变紧] → 优先压缩装饰留白与行距，不牺牲文字互不重叠这一硬要求。
- [统一按钮后，`BACK / RETRY` 可能比现在更显眼] → 通过尺寸和透明度控制次级层级，而不是回退到纯文字按钮。

## Migration Plan

1. 先抽出新的 panel / action button / gear icon 绘制原语。
2. 用新原语重画 settings overlay，并确认按钮热区不变。
3. 重构 results overlay 的结构分区，修复 summary、lap splits、leaderboard 的重叠。
4. 将 `BACK / RETRY` 切换到统一控件风格，并加入按下反馈。
5. 回归检查不同视口尺寸下的 overlay 布局稳定性。

回滚策略：

- 若新风格不满意，可保留新的结果页分区布局，只单独回退颜色与边线样式。
- 若统一按钮方案影响点击辨识度，可保留统一按钮原语，但分别微调 settings 与 results 的尺寸。

## Open Questions

- 是否接受非常小的切角 / 倒角作为“硬边面板”的收边方式，还是要求完全直角？
- `BACK / RETRY` 是否需要在结果页底部保持左右对称，还是允许改成更接近 settings 的垂直堆叠？
