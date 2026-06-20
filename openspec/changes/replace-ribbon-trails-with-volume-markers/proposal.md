## Why

当前比赛尾流虽然已经具备长度、颜色和加速判定，但视觉主体仍然是 ribbon 带状结构，流体感、粒子感和体积感都不够清晰，和目标中的 TRON 风格立体尾迹仍有明显差距。与此同时，NPC 头顶名字与三角标记目前仍属于世界空间 sprite，距离远时会明显变小，不符合“固定大小、稳定穿透地图、远近都易读”的体验目标。

## What Changes

- 将当前 ribbon 主导的尾流视觉替换为体积粒子尾流，使尾流由多层雾团、偏移副团和稀疏粒子构成，而不是以带状 mesh 为主要视觉轮廓。
- 保留现有尾流长度随速度增长、视觉长度与实际加速生效长度一致的规则，但将“视觉宽度”和“加速判定宽度”拆分为独立配置。
- 让尾流的实际加速判定横向更宽一些，以降低跟尾流上手门槛，但不要求视觉宽度同步变粗。
- 将 NPC 头顶名字与三角从世界空间 sprite 标记改为屏幕空间 overlay 标记，由 3D 锚点投影驱动屏幕位置。
- 使名字和三角的屏幕尺寸固定，不再因距离变化而变小，仅根据近距遮挡策略和屏幕中心遮挡策略调节透明度。
- 调整名字字重和样式，去掉较强的艺术化霓虹观感，改为更细、更稳定、更偏竞技 HUD 的读法。
- 保持玩家自己看不到自己的名字和三角标记。
- 保持现有性能公平、碰撞、draft charge、动态 FOV 等已建立玩法规则不变，除非为适配新尾流判定宽度而做最小必要配置调整。

## Capabilities

### New Capabilities
- `volume-race-trails`: 定义非 ribbon 的体积粒子尾流、独立视觉宽度与判定宽度、以及与速度关联的长度/密度表现。
- `screen-space-race-markers`: 定义基于 3D 锚点投影的固定大小 NPC 名字与三角标记，以及其透明度与可见性规则。

### Modified Capabilities
- `fluid-race-trails`: 现有尾流 REQUIREMENTS 需要改为“非 ribbon 主导的体积尾流”，并明确视觉宽度与 draft 判定宽度分离。
- `race-marker-proximity-fade`: 现有近距淡出 REQUIREMENTS 需要改为适配固定屏幕尺寸 overlay 标记，而不是世界空间 sprite。

## Impact

- 主要影响 [GameScene.ts](D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts) 中的尾流渲染、marker 更新、3D 到 2D 投影和 HUD 绘制逻辑。
- 主要影响 [raceConfig.ts](D:/Projects/TypeScriptProjects/racing/src/utils/raceConfig.ts) 中尾流视觉参数、尾流判定参数、标记尺寸和透明度参数。
- 可能需要在 [interfaces.ts](D:/Projects/TypeScriptProjects/racing/src/utils/interfaces.ts) 或新的 race UI 辅助结构中补充屏幕空间 marker 容器定义。
- 不引入新的运行时依赖，不引入外部贴图资源，不改变已有比赛控制、车辆基础性能或碰撞规则。
