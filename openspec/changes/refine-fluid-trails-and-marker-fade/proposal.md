## Why

当前比赛尾流虽然已经具备基础颜色和采样逻辑，但视觉上仍偏向细线，缺少用户期望的 fluid / plasma wake 体积感，远不足以让玩家在高速比赛中明显感知尾流存在。

同时 NPC 头顶名字和三角指示器在距离摄像机过近时会遮挡视野，需要加入平滑透明淡出，避免近距离大面积挡住玩家画面。

## What Changes

- 将当前线式尾流升级为 fluid-like 视觉尾流，使用更长、更宽、更明显的体积化表现。
- 尾流采用多层 ribbon / billboard / glow 组合，呈现核心亮度、外层辉光、扰动和渐隐。
- 尾流长度加长，并继续随速度变化，低速短淡，高速长亮。
- 保持尾流没有物理 hitbox，不改变现有 draft 判定和载具碰撞规则。
- 为 NPC 头顶名字和三角指示器增加近距离透明淡出。
- 名字和三角作为同一个 marker 视觉组一起淡出，避免只隐藏部分元素。
- 不重新设计公平性能、碰撞、draft charge、动态 FOV 等已有玩法规则。

## Capabilities

### New Capabilities

- `fluid-race-trails`: 定义 fluid-like 尾流的长度、体积感、可见性、速度响应和非阻挡边界。
- `race-marker-proximity-fade`: 定义 NPC 头顶名字和三角指示器在靠近摄像机时的透明淡出规则。

### Modified Capabilities

- 无。

## Impact

- 主要影响 `src/scenes/GameScene.ts` 和 `src/utils/raceConfig.ts` 中的尾流渲染、尾流配置和 marker 更新逻辑。
- 不引入新运行时依赖，不新增外部贴图资源。
- 不改变现有 `draftCharge`、尾流距离判定、车辆碰撞、性能公平和动态 FOV 行为。
- 需要继续通过 `npm run build` 验证，并进行比赛页视觉 smoke test。
