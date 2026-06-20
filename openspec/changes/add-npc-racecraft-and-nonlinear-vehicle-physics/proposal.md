## Why

当前 NPC 通过赛道路径向量直接改方向、直接写速度，导致它们起步和过弯表现更像“路径吸附”而不是熟练驾驶；玩家则使用输入驱动的车辆物理，因此双方体感不公平。这个变更要把玩家和 NPC 收敛到同一套非线性车辆物理上，同时为 NPC 增加可解释、可调校、可验证的尾流、超车、防守和轻度对抗决策。

## What Changes

- 将载具加速调整为基于当前速度与有效极速比例的非线性曲线：低速段略快，接近极速时逐渐变慢。
- 将转向调整为非线性响应：初始转向更灵敏，持续转向后增量略降，并在高速时适度降低转向效率。
- 保留尾流提高有效极速的规则，但尾流状态下接近更高极速时加速度也会自然下降，避免瞬间顶到尾流极速。
- 移除 NPC 直接设置速度和直接贴合赛道方向的驾驶方式，改为通过油门、刹车和转向输入驱动。
- 在比赛开始后的 2 秒内给 NPC 短暂加速度倍率 `1.75x`，只影响加速度，不改变极速、转向、碰撞、尾流收益或车辆基础性能。
- 为 NPC 建立每场比赛固定的轻微熟练度差异，主要影响过弯控制、回正、噪声和战术判断，不改变基础性能公平性。
- 为 NPC 增加过弯控制：前视目标点、转向误差、轻微噪声、回正、转向过度回撤、转向不足时主动减速。
- 为 NPC 增加尾流偏好：主动寻找玩家或其他 NPC 的尾流，在接近前车尾部时优先超车，并以 `20%` 概率选择故意顶撞前车尾部。
- 为 NPC 增加并行对抗：与玩家或其他 NPC 并行时，以 `30%` 概率短时间主动侧向挤压。
- 为 NPC 增加防守别车：当自身尾流被玩家或其他 NPC 吃到时，以 `40%` 概率主动阻挡超车线，甚至诱导后车追尾。
- 不引入外部物理引擎，不重写赛道、checkpoint、尾流视觉或现有车辆碰撞框架。

## Capabilities

### New Capabilities

- `nonlinear-vehicle-physics`: 定义玩家和 NPC 共用的非线性加速、非线性转向、尾流极速与接近极速加速度衰减规则。
- `npc-racecraft-control`: 定义 NPC 使用输入驱动的驾驶控制、起步 buff、过弯减速、转向噪声、回正和轻微熟练度差异。
- `npc-draft-and-combat-behavior`: 定义 NPC 主动吃尾流、超车、追尾概率、并行侧挤、防守别车和避撞优先级。

### Modified Capabilities

- 无。当前仓库没有已归档的 OpenSpec 基线能力；现有尾流、碰撞、五车发车相关变更仍作为实现上下文保留，不在本 proposal 中直接修改其 spec 名称。

## Impact

- 主要影响 [src/objects/Vehicle.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Vehicle.ts)、[src/objects/Player.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Player.ts)、[src/objects/NPC.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/NPC.ts)、[src/scenes/GameScene.ts](/D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts) 和 [src/utils/raceConfig.ts](/D:/Projects/TypeScriptProjects/racing/src/utils/raceConfig.ts)。
- 需要复用现有 `RaceVehicleState`、尾流采样、碰撞分离和五车发车逻辑，并在其上增加 NPC 决策所需的轻量上下文。
- 不新增运行时依赖，不改变模型资源、菜单选车、赛道数据结构、UI 标记渲染或 checkpoint 判圈机制。
- 验证需要覆盖玩家手感、NPC 起步 buff 时限、NPC 过弯不再路径吸附、尾流追逐、超车避撞、随机追尾、并行侧挤和防守别车。
