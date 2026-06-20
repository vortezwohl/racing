## Context

上一轮 `add-race-identity-trails-collisions` 已经为比赛载具建立了身份颜色、头顶标记、尾流采样、draft 判定、碰撞和动态 FOV。当前尾流视觉仍采用 `THREE.Line` 类方案，实际效果容易被 WebGL 线宽限制压成一条细线，不符合“fluid / plasma wake”的目标。

当前 marker 通过 sprite 显示在 NPC 头顶，并始终朝向摄像机。它能解决远距离识别问题，但在摄像机距离过近时会遮挡画面，需要增加按距离透明淡出。

本变更只处理视觉 refinement：让尾流更长、更明显、更像 fluid，并让近距离 marker 不遮挡摄像机。不重新设计 draft、碰撞、性能公平或 FOV 玩法。

## Goals / Non-Goals

**Goals:**

- 将尾流从细线升级为明显的 fluid-like 视觉效果。
- 尾流具备核心亮度、外层辉光、体积宽度、扰动和渐隐。
- 尾流更长，低速短淡，高速长亮，但仍有统一上限。
- 保持尾流颜色与车辆身份颜色一致。
- 保持尾流没有物理 hitbox，不影响车辆碰撞。
- 保持现有 draft 判定可复用，不因视觉升级改变玩法边界。
- 为 NPC 头顶名字和三角增加近距离平滑透明淡出。

**Non-Goals:**

- 不实现真实流体模拟。
- 不新增外部 shader 库、物理库或贴图资源。
- 不改变 `draftCharge` 规则、碰撞响应、公平性能、动态 FOV。
- 不重新设计菜单车辆名字。

## Decisions

### 1. 用 fluid-like 视觉替代真实流体模拟

采用“ribbon mesh + glow sprites”的组合来制造 fluid / plasma wake 感，而不是做真实流体模拟。

理由：真实流体模拟成本高，调试复杂，且对当前 4 台车规模没有必要。fluid-like 方案能在视觉上达到“立体、明显、流动”的效果，同时保持实现可控。

备选方案：GPU 粒子流体或后处理 shader。视觉潜力更高，但复杂度和风险不符合当前最小闭环。

### 2. 尾流主形态使用 ribbon mesh

每台车的尾流使用历史采样点生成带宽的 ribbon mesh。每个采样点根据相机方向或局部横向向量生成左右顶点，组成连续三角带。尾部宽度和 alpha 沿采样序列渐隐。

理由：ribbon 比 `THREE.Line` 更可控，不受浏览器线宽限制，也能提供真正的屏幕可见面积。

备选方案：只用 sprites。sprites 容易显得像一串点，不如 ribbon 连续。

### 3. 叠加 glow sprites 增强流体体积感

在采样点附近添加半透明 radial gradient sprites，表现火焰状/等离子雾化扩散。sprite 使用 canvas 生成纹理，不新增外部资源。

理由：ribbon 负责连续形状，glow sprites 负责体积和亮度层次，两者叠加比单一 mesh 更接近 fluid。

备选方案：只用 ribbon。实现更简单，但外层流体感不足。

### 4. 尾流扰动使用确定性正弦 wobble

尾流顶点和 glow sprites 可按时间、采样 index 和车辆 id 施加轻微正弦扰动，让边缘像流动中的 plasma。扰动只影响视觉，不影响 draft 判定使用的原始 trail positions。

理由：视觉扰动能让尾流不死板，同时不污染 gameplay 判定。

备选方案：随机扰动。随机每帧变化容易闪烁，不利于稳定视觉。

### 5. 加长尾流但保留上限

建议配置：

- `sampleCount`: 36
- `minLength`: 5
- `maxLength`: 18
- `coreWidth`: 0.35
- `glowWidth`: 1.4
- `wobbleStrength`: 0.35

长度仍按速度映射：低速短淡，高速长亮。同速车辆应得到一致长度规则。

理由：用户明确要求“再长一些”和“更明显”，但仍需避免拖满赛道或影响性能。

### 6. marker 淡出按摄像机距离计算

每帧更新 marker 时计算 `camera.position.distanceTo(marker.position)`，并将距离映射到整体透明度：

- 距离 >= 8：完全显示。
- 距离 3-8：线性或 smoothstep 淡出。
- 距离 <= 3：几乎透明或隐藏。

理由：近距离淡出能避免贴脸遮挡，同时远距离仍保持识别能力。

备选方案：直接隐藏 marker。突然消失会跳变，观感差。

### 7. marker 透明度应用到整个 group 的子 sprite 材质

名字 sprite 和三角 sprite 必须一起淡出。实现上遍历 marker group children，将 `SpriteMaterial.opacity` 设置为同一个距离 alpha，并保持 `transparent = true`。

理由：用户要求名字与小三角都不要近距离遮挡；只淡出文字或三角都会留下遮挡残留。

## Risks / Trade-offs

- 透明 sprite 和 ribbon 数量增加可能影响性能 -> 限制 sample count 和每车 glow sprite 数量，复用材质/纹理。
- ribbon 与 camera-facing 计算可能在极端视角扭曲 -> 优先使用稳定横向向量，并在烟测中检查近距离和高速视角。
- glow 过亮可能盖住赛道 -> 设置全局 opacity 上限，低速/远尾部渐隐。
- marker 过早淡出可能降低 NPC 识别 -> 使用 3-8 的淡出区间，远距离完全显示。
- 视觉尾流和 draft 判定不完全一致 -> 明确保留 gameplay 判定使用原采样线段，视觉扰动只影响展示。

## Migration Plan

1. 扩展 `raceTrail` 配置，加入长度、宽度、透明度、扰动和 marker 淡出参数。
2. 替换现有 `THREE.Line` 尾流渲染为 fluid trail group。
3. 增加 canvas glow texture 生成逻辑和可复用材质。
4. 每帧根据采样点更新 ribbon geometry 与 glow sprites。
5. 为 marker group 增加近距离透明淡出。
6. 跑 `npm run build`，再做比赛页视觉 smoke test。

## Open Questions

- 最终尾流亮度和长度需要通过实际比赛视角微调。
- marker 淡出阈值是否需要在移动端和桌面端分别配置。
