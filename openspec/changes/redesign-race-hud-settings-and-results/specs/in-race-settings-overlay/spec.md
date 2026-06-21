## ADDED Requirements

### Requirement: Race view SHALL expose a persistent settings button
比赛系统 SHALL 在比赛页右上角提供一个可点击的齿轮设置按钮，并保持其相对位置位于时速显示的上方。

#### Scenario: Settings button is visible during active race
- **WHEN** 比赛正在进行且 HUD 可见
- **THEN** 右上角存在可见的齿轮设置按钮
- **AND** 该按钮位置稳定，不与时速文字重叠

#### Scenario: Settings button remains visible during results
- **WHEN** 玩家已经完赛且结算面板已显示
- **THEN** 右上角仍显示同一位置的齿轮设置按钮
- **AND** 该按钮仍可用于打开设置弹窗

### Requirement: Opening settings SHALL NOT pause the race
比赛系统 SHALL 在打开比赛内设置弹窗时保持比赛会话继续运行，而不是暂停整个比赛。

#### Scenario: Race simulation continues while modal is open
- **WHEN** 玩家在比赛过程中打开设置弹窗
- **THEN** 比赛不会进入暂停态
- **AND** 计时、NPC 行为或其他赛会推进逻辑仍可继续更新

#### Scenario: Results collection continues while modal is open after finish
- **WHEN** 玩家完赛后打开设置弹窗
- **THEN** 结果面板之外的赛会结果收集逻辑仍可继续运行
- **AND** 后续冲线的 NPC 结果仍可被记录

### Requirement: Settings modal SHALL provide restart and exit-to-menu actions
比赛系统 SHALL 在设置弹窗中提供“重新开始比赛”和“退出到菜单”两个主操作。

#### Scenario: Restart starts a fresh race session
- **WHEN** 玩家点击设置弹窗中的“重新开始比赛”
- **THEN** 当前比赛会话被放弃
- **AND** 系统创建新的比赛会话并重新进入比赛页

#### Scenario: Exit returns to menu
- **WHEN** 玩家点击设置弹窗中的“退出到菜单”
- **THEN** 当前比赛会话结束
- **AND** 系统返回菜单页而不是停留在旧比赛状态
