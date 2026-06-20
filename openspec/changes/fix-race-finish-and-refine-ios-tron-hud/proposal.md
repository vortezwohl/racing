## Why

当前比赛页存在两个直接影响体验的问题：玩家在体感上已经跑完两圈时，结算面板并不总是可靠弹出；同时，赛中 HUD 的视觉语言仍然偏厚重、偏装饰化，与用户要求的简约现代、接近 iPhone / iOS 的轻量风格不一致。此外，比赛内返回菜单的不同入口如果各自直接切场，会让转场体验割裂，和菜单点击 `PLAY` 时已有的黑幕帘感受不统一。现在需要把“完赛触发可靠性”、“HUD 轻量化重构”以及“返回菜单统一黑幕帘转场”一起收敛，否则比赛内 UI 会同时存在功能缺陷和体验不一致问题。

## What Changes

- 修复比赛完赛判定链路，使玩家完成最后一圈后，结算面板能够稳定出现，不再依赖脆弱的额外帧时序读取。
- 为完赛逻辑补充明确的过线事件与保护条件，避免漏触发、重复触发或“已完赛但无面板”的异常状态。
- 将比赛 HUD 视觉重构为简约、轻量、现代的 iOS 风格排版，只保留少量 Tron 科幻色彩，不再使用大量描边框和装饰性面板。
- 调整 HUD 字体表现为更细、更小的白色文字，并保留克制的浅蓝辉光，提高可读性同时降低土重感。
- 将右上角设置按钮重绘为无外框的简洁齿轮图标，并在点击时提供按压反馈。
- 在设置弹窗中新增 `RESUME` 操作，用于关闭弹窗并继续比赛；保留 `RESTART RACE` 与 `EXIT TO MENU`。
- 统一比赛内所有返回菜单路径，使设置弹窗 `EXIT TO MENU`、结算面板 `BACK` 以及未来直接退出入口都复用与菜单 `PLAY` 相同的黑幕帘转场：先渐黑，再切换菜单，最后从黑幕中渐显菜单。
- 将设置弹窗和结算面板的视觉语言统一调整为更轻的玻璃质感卡片，减少多余图形与赛博边框堆叠。

## Capabilities

### New Capabilities
- `reliable-race-finish-overlay`: 定义玩家完成最后一圈后，结算面板必须稳定出现的比赛结束触发行为。
- `minimalist-ios-tron-race-hud`: 定义简约 iOS 风格、带少量 Tron 色彩的比赛 HUD 布局、字重、字号、发光和齿轮视觉规范。
- `interactive-race-settings-resume`: 定义比赛内设置按钮的按压反馈，以及设置弹窗中的 `RESUME / RESTART RACE / EXIT TO MENU` 行为。
- `race-to-menu-curtain-transition`: 定义比赛页返回菜单时必须复用统一黑幕帘转场，并保持不同返回入口行为一致。

### Modified Capabilities
- None.

## Impact

- 受影响代码：
  - `src/scenes/GameScene.ts`
  - `src/ui/RaceHud.ts`
  - `src/app.ts`
  - `src/scenes/MenuScene.ts`
  - `src/utils/interfaces.ts`
  - 比赛 HUD 相关样式与比赛页壳体结构
- 受影响系统：
  - 比赛结束判定与结果面板显示链路
  - 赛中 HUD Canvas 绘制与点击热区反馈
  - 设置弹窗交互流与会话恢复/退出路径
  - 菜单页与比赛页之间的统一黑幕帘转场链路
- 依赖影响：
  - 不引入新的前端框架或第三方 UI 库
  - 继续复用现有 `webpack + TypeScript + Three.js + canvas HUD` 结构
