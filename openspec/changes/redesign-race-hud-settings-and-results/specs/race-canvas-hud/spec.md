## ADDED Requirements

### Requirement: Race HUD SHALL render on a dedicated canvas overlay
比赛系统 SHALL 在比赛主画面之上使用专用的 Canvas HUD 层渲染核心比赛信息，而不是继续依赖分散的 DOM 文本节点作为主显示方式。

#### Scenario: HUD canvas is active during race
- **WHEN** 玩家进入正常比赛会话
- **THEN** 比赛页存在可见的 HUD Canvas 覆盖层
- **AND** 该覆盖层承担圈数、名次、计时、倒计时和时速的主要显示职责

#### Scenario: HUD canvas adapts to viewport changes
- **WHEN** 比赛页在不同窗口尺寸或方向下渲染
- **THEN** HUD Canvas 仍保持元素可读
- **AND** 关键 HUD 元素不会因为视口变化而偏离其目标区域

### Requirement: Race HUD SHALL use the requested information layout
比赛系统 SHALL 按固定布局显示 HUD 信息：左上显示圈数和名次，中上显示计时，右上显示时速，且设置按钮位于右上角时速的上方。

#### Scenario: Top-left shows lap and position
- **WHEN** 比赛 HUD 处于正常显示状态
- **THEN** 左上区域显示当前圈数信息
- **AND** 左上区域同时显示玩家当前名次信息

#### Scenario: Top-center and top-right show timer and speed
- **WHEN** 比赛 HUD 处于正常显示状态
- **THEN** 中上区域显示比赛计时
- **AND** 右上区域显示当前时速与 `KM/H` 标识

### Requirement: Race HUD SHALL use a unified Tron-style visual treatment
比赛系统 SHALL 以统一的蓝色复古科幻风格渲染比赛 HUD，包括文字、描边、发光层次和面板细节，使其与当前菜单页的霓虹视觉方向一致。

#### Scenario: HUD typography is visually consistent
- **WHEN** HUD 同时显示圈数、名次、计时和时速
- **THEN** 这些元素使用统一的 Tron 风格文字体系
- **AND** 视觉差异仅来自信息层级，而不是风格断裂

#### Scenario: HUD styling remains readable over gameplay
- **WHEN** HUD 覆盖在赛道和太空背景之上
- **THEN** 文字与图形仍保持清晰可辨
- **AND** 不会因过强发光而丢失主要信息

### Requirement: Race HUD SHALL update countdown and live telemetry during active racing
比赛系统 SHALL 在比赛开始前显示倒计时，并在比赛进行中持续更新计时、名次和时速。

#### Scenario: Countdown appears before race start
- **WHEN** 比赛处于起跑前倒计时阶段
- **THEN** HUD 在中心区域显示倒计时或 `GO!`
- **AND** 倒计时结束后该提示从主 HUD 区域退出

#### Scenario: Live telemetry updates while racing
- **WHEN** 玩家在正常比赛中移动并经过检查点
- **THEN** HUD 会持续更新时速显示
- **AND** HUD 会在名次变化或圈数变化后反映最新状态
