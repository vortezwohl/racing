## MODIFIED Requirements

### Requirement: Starting a new race SHALL create a clean race session
每一次进入新比赛，无论入口来自菜单、比赛内设置弹窗还是赛后结果面板，系统都 SHALL 创建干净的比赛会话状态，而不是复用旧会话中的 HUD、弹窗或结算残留。

#### Scenario: Starting race after returning to menu resets countdown and HUD
- **WHEN** 玩家返回菜单后再次开始比赛
- **THEN** 新比赛会话重置倒计时状态、HUD 状态、计时状态、结算状态与设置弹窗状态
- **AND** 旧比赛中的可见数值或面板不会残留到新会话中

#### Scenario: Restarting race from in-race UI creates a fresh session
- **WHEN** 玩家通过设置弹窗中的“重新开始比赛”或结果面板中的 `RETRY` 触发重开
- **THEN** 系统创建新的比赛会话而不是在旧会话上局部复位
- **AND** 新比赛从正常的起跑前倒计时流程重新开始

### Requirement: Race recovery and black-screen effects SHALL continue to function after single-page migration
比赛专属 UI 流程，包括掉出赛道后的幕布恢复效果与完赛后的结算过渡，都 SHALL 在单页比赛壳体下继续工作；其中完赛过渡不再要求整屏黑场遮蔽比赛画面。

#### Scenario: Out-of-bounds recovery still drives curtain flow
- **WHEN** 玩家载具在比赛中掉出赛道
- **THEN** 比赛流程仍使用共享幕布层执行恢复过渡
- **AND** 玩家载具之后仍会被正确恢复到对应检查点

#### Scenario: Finishing race shows overlay results without page reload
- **WHEN** 玩家完成比赛
- **THEN** 系统无需页面重载即可进入赛后结算状态
- **AND** 结算信息以覆盖在比赛画面之上的结果面板形式显示，而不是依赖整屏黑场页面
