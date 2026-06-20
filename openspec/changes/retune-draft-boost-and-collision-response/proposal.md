## Why

当前比赛里的尾流加成已经能工作，但速度感和收益层次还不够明显：玩家进入尾流后，FOV 增益偏弱、最高速度提升偏保守，导致“吃到尾流”的反馈不够强。另外，载具碰撞现在对所有撞击方向都套用同一套减速与 debuff 逻辑，前后顶撞和侧面挤压手感混在一起，不符合当前想要的竞速对抗体验。

## What Changes

- 重新调校尾流收益参数，使尾流状态下的加速度、最高速度和 FOV 反馈更明确。
- 将尾流加速度加成调整为 `0.5`，最高速度加成调整为 `0.25`，FOV 加成调整为 `8`。
- 把车辆碰撞响应拆分为“侧撞”和“前后撞”两种行为分支。
- 侧撞继续保留现有减速 debuff 逻辑，但强化快车撞慢车时对慢车的横向撞飞和速度惩罚。
- 前后撞不再触发现有减速 debuff，而是改为回弹响应；前车回弹强于后车，幅度为后车的 `1.15x`。
- 保持当前尾流积累、尾流离开后缓慢衰减、以及车辆基础性能公平性不变，除上述参数与碰撞分型外不扩散改动范围。

## Capabilities

### New Capabilities
- `directional-collision-response`: 定义侧撞与前后撞使用不同的减速、debuff 和回弹规则。

### Modified Capabilities
- `fluid-race-trails`: 调整尾流状态下的加速度、最高速度与 FOV 反馈要求。

## Impact

- 影响尾流参数配置与玩家镜头 FOV 表现，主要涉及 [src/utils/raceConfig.ts](/D:/Projects/TypeScriptProjects/racing/src/utils/raceConfig.ts) 与 [src/objects/Player.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Player.ts)。
- 影响车辆碰撞分离、减速 debuff 和回弹处理，主要涉及 [src/scenes/GameScene.ts](/D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts)。
- 不引入新依赖，不修改菜单、UI 标记、尾流渲染结构和现有 checkpoint 判圈机制。
