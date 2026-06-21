## ADDED Requirements

### Requirement: Race results SHALL appear as an in-race translucent overlay
比赛系统 SHALL 在玩家完赛后，直接在比赛页之上显示半透明结果面板，而不是切换为整屏黑场式结算页。

#### Scenario: Race scene remains visible behind results
- **WHEN** 玩家完成比赛并触发结算
- **THEN** 结果面板以半透明质感叠加在比赛画面之上
- **AND** 赛道背景仍然可见

#### Scenario: Results overlay replaces black-screen presentation
- **WHEN** 结果面板进入显示状态
- **THEN** 结算信息不再依赖纯黑背景占满整个比赛页来呈现
- **AND** 主要结算内容集中在结果面板内部

### Requirement: Results overlay SHALL show player performance summary
比赛系统 SHALL 在结果面板中展示玩家最终名次、平均时速、总成绩时间以及每一圈的耗时。

#### Scenario: Player finish summary is displayed
- **WHEN** 玩家首次完成比赛
- **THEN** 结果面板显示玩家最终名次
- **AND** 结果面板显示玩家平均时速与总成绩时间

#### Scenario: Lap split times are displayed
- **WHEN** 玩家结果面板可见
- **THEN** 面板中列出每一圈的耗时记录
- **AND** 单圈结果可以与总成绩一同被读取

### Requirement: Results leaderboard SHALL update as NPCs finish
比赛系统 SHALL 在玩家完赛后继续更新本场排行榜，使后续冲线的 NPC 能追加到结果面板中。

#### Scenario: Leaderboard contains colored participant rows
- **WHEN** 结果面板显示本场排行榜
- **THEN** 排行榜按参赛者名字逐条显示
- **AND** 每个名字保留其身份颜色

#### Scenario: NPC finisher updates appear after player finish
- **WHEN** 玩家已经完赛且某个 NPC 随后冲线
- **THEN** 结果面板中的排行榜会新增或更新该 NPC 的结果
- **AND** 该更新不要求刷新页面或重新打开结算

### Requirement: Results overlay SHALL provide back and retry actions
比赛系统 SHALL 在结果面板底部提供可点击的 `BACK` 与 `RETRY` 操作。

#### Scenario: Back returns to menu from results
- **WHEN** 玩家点击结果面板中的 `BACK`
- **THEN** 系统退出当前比赛会话
- **AND** 返回菜单页

#### Scenario: Retry starts a fresh race from results
- **WHEN** 玩家点击结果面板中的 `RETRY`
- **THEN** 系统创建新的比赛会话
- **AND** 玩家直接重新进入新的比赛
