## MODIFIED Requirements

### Requirement: Vehicle-to-slot assignment SHALL be randomized per session
比赛系统 SHALL 在每一个新建的比赛会话中，随机分配最终确定的五名参赛者与五个发车位槽位的对应关系；这里的“新建比赛会话”同时包括从菜单开始、从设置弹窗重开，以及从结果面板重开的路径。

#### Scenario: Session roster is mapped to the grid
- **WHEN** 比赛会话完成参赛名单与发车位网格准备
- **THEN** 每一名参赛者恰好分配到 5 个槽位中的 1 个
- **AND** 每一个槽位恰好被 1 名参赛者占用

#### Scenario: Restart path re-randomizes slot assignment
- **WHEN** 玩家通过设置弹窗中的“重新开始比赛”或结果面板中的 `RETRY` 创建新的比赛会话
- **THEN** 新会话会重新执行参赛者到发车位的随机分配
- **AND** 不会沿用上一场比赛的固定发车位映射

#### Scenario: Grid geometry remains fixed while occupants vary
- **WHEN** 多次比赛会话在相同赛道配置下开始
- **THEN** 5 个发车位槽位的相对几何结构保持不变
- **AND** 参赛者与槽位的映射关系可以在不同会话之间变化
