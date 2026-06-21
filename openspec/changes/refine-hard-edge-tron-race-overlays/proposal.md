## Why

当前赛中 `SETTINGS` 与 `RACE RESULTS` 面板已经从原始 DOM HUD 迁移到 canvas，但视觉方向仍然偏圆润玻璃卡片，和用户要求的硬边、克制、带轻微 Tron 科幻气息的风格不一致。同时，结果页存在排行榜与分段计时排版重叠、按钮语言不统一、齿轮图标识别度不足等问题，已经直接影响可读性和整体完成度。

## What Changes

- 将 `SETTINGS` 与 `RACE RESULTS` 面板从大圆角、渐变玻璃风格重构为硬边半透明深色蒙版，只保留微弱的 Tron 蓝色辉光，不再使用明显圆角与渐变填充。
- 修复结果页 `SUMMARY / LAP SPLITS / LEADERBOARD` 的区块分配与文本排版，避免标题、分段计时、排行榜状态文本互相重叠。
- 统一 `SETTINGS` 与 `RACE RESULTS` 的按钮语言，使 `RESUME / RESTART RACE / EXIT TO MENU / BACK / RETRY` 都采用同一套视觉样式与按下反馈。
- 重绘右上角 settings icon，使其呈现更典型、更具机械辨识度的齿轮轮廓，而不是接近圆形表盘的图标。
- 保持当前字体方向与 HUD 顶部文字系统不变，只重构 overlays、按钮和齿轮图标的形状语言。

## Capabilities

### New Capabilities
- `hard-edge-tron-overlay-visuals`: 定义赛中 `SETTINGS` 与 `RACE RESULTS` 面板必须采用硬边、低透明、弱蓝辉光的 Tron 风格蒙版视觉。
- `race-results-layout-integrity`: 定义结果页的 `SUMMARY / LAP SPLITS / LEADERBOARD` 必须拥有稳定且互不重叠的排版结构。
- `unified-race-overlay-controls`: 定义 `SETTINGS` 与 `RACE RESULTS` 的按钮方案、按下反馈，以及可识别的齿轮 icon 行为。

### Modified Capabilities
- None.

## Impact

- 受影响代码：
  - `src/ui/RaceHud.ts`
  - `src/scenes/GameScene.ts`
  - 赛中 HUD canvas 点击热区与 overlay 绘制逻辑
- 受影响系统：
  - 赛中 settings overlay 的视觉与交互
  - 赛后 results overlay 的布局与视觉
  - overlay 按钮与 settings gear 的统一交互反馈
- 依赖影响：
  - 不引入新的 UI 库、字体或动画框架
  - 继续复用现有 `canvas HUD + Three.js` 结构
