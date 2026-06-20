## Context

当前比赛逻辑已经具备五车发车、尾流积累、尾流视觉、车辆碰撞、玩家动态 FOV 和 checkpoint 判圈等基础能力。问题集中在驾驶模型不一致：玩家通过 `Player.handleInput()` 持续累加速度和转向，NPC 则在 `NPC.update()` 中每帧直接读取 `Track.pathVectors`，直接覆盖 `direction`，再直接覆盖 `velocity`。这使 NPC 过弯没有转向误差、没有入弯速度判断、没有反应延迟，也不会像玩家一样受到转向不足或接近极速加速度下降的限制。

本设计把“车辆物理”和“驾驶决策”分开：`Vehicle` 提供玩家和 NPC 共用的非线性加速、非线性转向、限速、尾流加成和碰撞减速计算；`Player` 继续把键盘/触控输入映射为车辆控制；`NPC` 改为根据赛道、尾流、附近车辆和自身技能画像输出油门、刹车、转向与战术偏移；`GameScene` 负责把所有车辆状态、尾流关系和比赛计时传给 NPC。

这个变更不需要外部物理引擎，也不需要把现有碰撞、尾流视觉或赛道资源推倒重写。核心是移除 NPC 的路径吸附特权，让它成为一个“熟练玩家风格”的输入驱动控制器。

## Goals / Non-Goals

**Goals:**

- 玩家和 NPC 使用同一套基础加速、极速、摩擦、转向和尾流收益规则。
- 载具低速加速略快，接近普通极速或尾流极速时加速度自然下降。
- 载具转向前段略快，持续转向后段略慢，高速时转向效率适度下降。
- NPC 比赛开始后 2 秒获得 `1.75x` 加速度倍率，随后完全回到普通参数。
- NPC 不再直接写入理想方向和理想速度，而是通过油门、刹车和转向输入跟随赛道。
- NPC 具备轻微且每场固定的熟练度差异，主要体现在过弯、回正、噪声和战术保守程度上。
- NPC 会主动寻找玩家和其他 NPC 的尾流，并在接近前车时超车或以小概率顶撞。
- NPC 会在并行时以一定概率侧向挤压，并在自身尾流被吃时以一定概率防守别车。
- 所有随机战术行为以“机会窗口”为单位抽样，避免每帧反复随机导致行为抖动。

**Non-Goals:**

- 不新增外部物理引擎、寻路库或 AI 行为树依赖。
- 不改变赛道曲线、checkpoint 判圈、完赛规则、菜单选车或模型资源。
- 不重写现有车辆碰撞分离框架，只在 NPC 决策中利用附近车辆态势。
- 不让 NPC 通过更高基础极速、更高基础转向或永久加速度优势获胜。
- 不要求 NPC 拥有人类级长期规划；第一版只做局部赛道跟随、尾流追逐、超车、避撞和短时攻防。

## Decisions

### 1. 将车辆控制统一为输入驱动，而不是给 NPC 单独写速度

玩家当前已经通过键盘输入调用加速、减速和转向。NPC 应复用同一套物理入口，内部只生成类似玩家输入的连续控制量：

```ts
type VehicleControlInput = {
    throttle: number; // 0..1
    brake: number; // 0..1
    steer: number; // -1..1, 正负号沿用现有 A/D 方向
    accelerationScale?: number; // 起步 buff 或调试倍率
};
```

`Vehicle` 负责提供 `applyControlInput(input, dt)` 或等价的内部方法：

1. 根据 `throttle` 调用非线性加速。
2. 根据 `brake` 调用减速。
3. 根据 `steer` 调用非线性转向。
4. 继续由 `Vehicle.update()` 处理赛道碰撞、摩擦、重力、限速和出界恢复。

这样 `Player` 只需要把键盘状态转成 `VehicleControlInput`，`NPC` 只需要把 AI 决策转成 `VehicleControlInput`。双方不再拥有两套车辆运动规则。

备选方案：保留玩家逻辑不动，只重写 NPC 的速度公式。该方案会继续保留两套物理模型，后续很难证明玩家和 NPC 公平，不采用。

### 2. 非线性加速使用“速度比例衰减曲线”

加速度基于当前速度与有效极速的比例衰减。有效极速必须包含尾流加成，因此尾流状态下极速更高，但接近尾流极速时加速度仍会下降。

建议配置：

```ts
const racePerformance = {
    acceleration: 0.00125,
    accelerationCurveExponent: 1.45,
    lowSpeedAccelerationScale: 1.12,
    minAccelerationScale: 0.28,
};
```

算法：

```text
effectiveMaxSpeed = maxSpeed * (1 + draftCharge * draftMaxSpeedBonus)
speedRatio = clamp(currentSpeed / effectiveMaxSpeed, 0, 1)
curveScale = minAccelerationScale +
    (lowSpeedAccelerationScale - minAccelerationScale) *
    (1 - speedRatio) ^ accelerationCurveExponent
effectiveAcceleration =
    acceleration *
    draftAccelerationScale *
    collisionSlowScale *
    curveScale *
    optionalInputScale
```

最终油门加速度：

```text
velocity += direction * effectiveAcceleration * throttle * dt
```

关键点：

- `currentSpeed` 第一版可以使用 `velocity.length()`，保持和现有 FOV、尾流长度逻辑一致。
- `draftAccelerationScale` 保留现有 `1 + draftCharge * draftAccelerationBonus`。
- `draftMaxSpeedBonus` 仍然提高 `effectiveMaxSpeed`，所以尾流状态仍能跑到更高速度。
- `curveScale` 让低速段略快，接近任意有效极速时自然下降，避免一下顶满。

备选方案：用固定速度区间分段表。分段表可调性强，但容易在段边界出现手感突变；当前目标是平滑手感，不采用。

### 3. 非线性转向使用“保持时间衰减 + 高速衰减”

转向需求是“前段略快，后段比前端略慢”。这更像持续按方向键时的响应曲线，而不是简单输入平方曲线。建议给每台车保存轻量转向状态：

```ts
type SteeringRuntimeState = {
    lastSteerSign: number;
    steerHoldMs: number;
};
```

每帧计算：

```text
steerSign = sign(steer)
if steerSign == 0:
    steerHoldMs = 0
else if steerSign != lastSteerSign:
    steerHoldMs = 0
else:
    steerHoldMs += dt
```

建议配置：

```ts
const racePerformance = {
    turnRate: 0.00076,
    turnInitialBoost: 1.16,
    turnSustainScale: 0.84,
    turnSustainMs: 700,
    highSpeedTurnDamping: 0.22,
};
```

算法：

```text
holdRatio = clamp(steerHoldMs / turnSustainMs, 0, 1)
holdScale = lerp(turnInitialBoost, turnSustainScale, holdRatio ^ 0.85)
speedRatio = clamp(currentSpeed / effectiveMaxSpeed, 0, 1)
speedScale = 1 - highSpeedTurnDamping * speedRatio ^ 1.2
turnAngle = steer * turnRate * holdScale * speedScale * dt
```

这样刚打方向时车头更愿意响应；长按后转向增量略收，不会后段越转越激进；高速时转向效率下降，减少高速抖动和过度转向。

备选方案：对 `steer` 输入做 `sqrt(abs(steer))`。它适合模拟摇杆输入，但键盘只有 -1/0/1，无法表达“持续转向前段和后段”的区别，不采用。

### 4. NPC 起步 buff 只作为输入倍率，持续时间由比赛有效开赛时间计算

`GameScene.update()` 当前在倒计时小于 `6000ms` 时不更新车辆，比赛开始点实际是倒计时达到 `6000ms` 后。NPC 起步 buff 应以“车辆开始更新后的比赛时间”为准，而不是页面加载时间或倒计时开始时间。

建议由 `GameScene` 计算：

```text
raceRunningMs = max(0, countdown - 6000)
npcStartBoostActive = raceRunningMs < 2000
```

传给 NPC context：

```ts
type NpcUpdateContext = {
    raceRunningMs: number;
    vehicleStates: Array<RaceVehicleState>;
    draftRelations: Array<DraftRelation>;
};
```

NPC 应用：

```text
accelerationScale = raceRunningMs < 2000 ? 1.75 : 1
```

此倍率只进入 `VehicleControlInput.accelerationScale`，不修改 `maxSpeed`、`turnRate`、`friction` 或 `draftCharge`。

备选方案：直接提高 NPC `acceleration` 字段，2 秒后改回。该方案容易在 reset、复赛或暂停时留下状态污染，不采用。

### 5. NPC 每场比赛生成轻微技能画像，差异只影响驾驶质量

每个 NPC 初始化时生成固定 profile，整场比赛保持不变：

```ts
type NpcSkillProfile = {
    skill: number; // 0.94..1.03
    cornerConfidence: number; // 0.96..1.04
    steerNoise: number; // 0.015..0.035
    steerRecovery: number; // 0.92..1.06
    draftPreference: number; // 0.95..1.08
    aggression: number; // 0.9..1.1
};
```

约束：

- 不改变基础 `acceleration`、`maxSpeed`、`turnRate`。
- 不让低 skill NPC 明显变笨；差异主要体现在入弯保守程度、噪声大小、回正速度和战术选择阈值。
- 使用 `Math.random()` 即可；若未来需要可复现调试，再在 debug 模式增加种子。

备选方案：给每个 NPC 使用不同性能参数。该方案和“其他参数都和玩家一样”的要求冲突，不采用。

### 6. NPC 赛道跟随基于前视目标点和转向误差，而不是直接贴方向

NPC 保留 `pathPointIndex`，但用途从“直接取方向”改为“寻找当前路径参考”。每帧流程：

1. 从上次 `pathPointIndex` 附近向前扫描，找最近路径点。
2. 根据速度确定前视距离。
3. 沿 `pathPoints` 向前累计距离，得到 `lookAheadPoint`。
4. 根据战术层给出的 `laneOffset` 沿路径横向偏移。
5. 计算当前朝向到目标方向的有符号角 `steerError`。
6. 把 `steerError` 转换为 `steer` 输入。

前视距离：

```text
speedRatio = currentSpeed / effectiveMaxSpeed
lookAheadDistance = lerp(minLookAhead, maxLookAhead, speedRatio)
lookAheadDistance *= profile.cornerConfidence
```

建议配置：

```ts
const raceNpc = {
    minLookAhead: 4.5,
    maxLookAhead: 13,
    maxLaneOffset: 3.2,
    steerErrorForFullInput: 0.75,
};
```

转向输入：

```text
rawSteer = clamp(steerError / steerErrorForFullInput, -1, 1)
noise = sin(noisePhase + raceRunningMs * noiseSpeed) * profile.steerNoise
targetSteer = clamp(rawSteer + noise, -1, 1)
steer = lerp(previousSteer, targetSteer, recoveryFactor)
```

`recoveryFactor` 根据 `profile.steerRecovery` 和 `dt` 计算，避免 NPC 每帧方向跳变。

备选方案：NPC 继续使用 `pathVectors`，只在结果上加噪声。该方案仍然是路径吸附，只会制造视觉噪声，不会产生真实过弯误差，不采用。

### 7. NPC 转向不足减速、转向过度回撤

NPC 应把“转不过去”转换为减油或刹车，而不是一路满油冲到底。

转向不足判定：

```text
absSteerError = abs(steerError)
speedRatio = currentSpeed / effectiveMaxSpeed
understeer =
    absSteerError > understeerErrorThreshold &&
    speedRatio > understeerSpeedRatio
```

建议配置：

```ts
const raceNpc = {
    understeerErrorThreshold: 0.42,
    understeerSpeedRatio: 0.64,
    understeerThrottleScale: 0.42,
    understeerBrakeScale: 0.22,
};
```

控制输出：

```text
if understeer:
    throttle *= understeerThrottleScale adjusted by skill
    brake = max(brake, understeerBrakeScale adjusted by skill)
```

转向过度回撤：

```text
if sign(previousSteer) != sign(steerError) && abs(previousSteer) > 0.2:
    steer *= oversteerRetreatScale
```

这让 NPC 在快要转过头时会主动回正，而不是持续满舵。

备选方案：直接给 NPC 设置弯道限速表。当前赛道没有弯道元数据，临时构建限速表成本高；基于转向误差的控制足够满足第一版，不采用。

### 8. NPC 战术层输出 laneOffset，而不是直接移动位置

NPC 尾流、超车、别车和侧挤都不应直接改 `position`。它们只改变目标路线的横向偏移 `laneOffset` 和油门/刹车倾向。

```ts
type NpcTacticalIntent = {
    laneOffset: number;
    throttleBias: number;
    brakeBias: number;
    mode: "race-line" | "draft" | "overtake" | "bump" | "side-pressure" | "block";
    expiresAt?: number;
};
```

最终目标点：

```text
targetPoint = lookAheadPathPoint + lateralDirection * laneOffset
```

`laneOffset` 必须被夹在 `[-maxLaneOffset, maxLaneOffset]`，并且应平滑变化：

```text
currentLaneOffset = lerp(currentLaneOffset, targetLaneOffset, laneChangeSmoothing)
```

备选方案：战术层直接对车辆加横向速度。该方案会绕开转向和轮廓碰撞，造成新的不公平控制，不采用。

### 9. 尾流关系从布尔值扩展为关系表，供 NPC 决策使用

当前 `updateDraftBoosts()` 只判断每台车是否在任何其他尾流内。NPC 需要知道“谁在吃谁的尾流”，因此应在不改变尾流收益语义的前提下构建关系：

```ts
type DraftRelation = {
    drafterId: string;
    sourceId: string;
    distanceToTrail: number;
    nearestTrailPoint: THREE.Vector3;
};
```

生成方式：

1. 遍历 `raceVehicleStates` 中每台车。
2. 对其他车的 `effectiveTrailPositions` 计算距离。
3. 距离小于 `raceTrail.draftZoneRadius` 时记录关系。
4. 原有 `insideTrail` 可由关系表派生，不需要重复几何判断。

NPC 使用：

- `drafterId == npc.id`：NPC 正在吃某车尾流。
- `sourceId == npc.id`：某车正在吃 NPC 尾流，可能触发防守别车。

备选方案：NPC 自己再算一遍尾流关系。该方案会重复几何计算，并可能和真正的尾流收益判断不一致，不采用。

### 10. NPC 主动吃尾流通过目标评分选择

NPC 每帧评估所有可追逐目标，包括玩家和其他 NPC。候选目标必须满足：

- 不是自己。
- 在 NPC 前方一定角度范围内，或其尾流距离 NPC 足够近。
- 目标速度或位置使 NPC 有追上或保持尾流的可能。
- 不处于明显不可达的反向或远离状态。

评分：

```text
score =
    forwardScore * 1.0 +
    draftReachScore * draftPreference +
    closingScore * 0.6 -
    collisionRisk * 1.2 -
    lateralCost * 0.4
```

输出：

- 若目标尾流可吃，`mode = "draft"`，`laneOffset` 指向目标尾流中心线。
- 若距离前车尾部过近且 closing speed 为正，进入超车或顶撞机会窗口。

备选方案：永远追最近前车。该方案会让 NPC 过于单调，且不一定能吃到尾流，不采用。

### 11. 超车与 20% 顶撞按机会窗口抽样

当 NPC 接近前车尾部并存在追尾风险时，创建一次机会窗口：

```text
frontGap < overtakeTriggerDistance
closingSpeed > minClosingSpeed
abs(lateralGap) < rearCorridorWidth
```

如果当前没有未过期的 `rearApproachIntent`，抽样：

```text
intent = random() < 0.2 * profile.aggression ? "bump" : "overtake"
intentExpiresAt = raceRunningMs + 900..1400
```

`overtake` 行为：

- 选择左或右超车线。
- 优先选择附近车辆较少、偏移更小、离赛道参考线更近的一侧。
- 增加 `laneOffset`，保持油门或轻微减油。

`bump` 行为：

- 保持对准前车尾部，不提前侧移。
- 在追尾前不过度刹车，但仍受 `Vehicle` 碰撞响应和限速约束。
- 窗口结束后恢复正常追线或超车。

关键点：随机只在机会开始时抽一次，不每帧抽，避免 NPC 行为抖动。

备选方案：每帧 `20%` 概率撞。该方案会导致同一个追尾机会中行为反复横跳，不采用。

### 12. 并行侧挤与防守别车也使用机会窗口

并行侧挤检测：

```text
abs(longitudinalGap) < sideBySideLength
abs(lateralGap) < sidePressureRange
abs(relativeSpeed) < sidePressureRelativeSpeed
```

触发：

```text
if no active sidePressureIntent:
    active = random() < 0.3 * profile.aggression
```

行为：

- 若触发，`laneOffset` 向对方车辆方向偏移一小段。
- 持续 `600..1200ms`。
- 如果自身转向误差过大或即将出赛道参考范围，取消侧挤。

防守别车检测：

```text
DraftRelation.sourceId == npc.id
drafter behind npc
distance between vehicles < blockAwarenessDistance
```

触发：

```text
if no active blockIntent:
    active = random() < 0.4 * profile.aggression
```

行为：

- 根据后车相对横向位置，把 `laneOffset` 推向后车尝试超车的一侧。
- 若后车正贴近尾部，NPC 可以保持线路或轻微关门，诱导追尾。
- 如果进入大弯且自身 `understeer` 成立，防守降级，优先保证自己能过弯。

备选方案：把攻击/防守写进碰撞函数。碰撞函数只能处理已经接触后的响应，无法表达提前压线、挡线、诱导追尾，不采用。

### 13. NPC 决策优先级固定，避免战术互相打架

每帧按优先级合成控制：

```text
1. 生存与赛道跟随：不要明显转向不足、不要偏离参考线过多
2. 近距离避撞：前方即将追尾时，决定超车、顶撞或减速
3. 防守别车：自身尾流被吃且触发防守窗口
4. 并行侧挤：并行窗口触发攻击行为
5. 主动吃尾流：寻找可利用尾流
6. 普通 racing line：跟随前视目标点
```

高优先级可以覆盖低优先级的 `laneOffset`、`brakeBias` 和 `throttleBias`。例如 NPC 正在防守，但入弯转向不足，则减速过弯优先。

备选方案：多个行为简单相加。相加容易造成 `laneOffset` 超限、油门刹车同时很大或行为不可解释，不采用。

### 14. GameScene 负责构建 AI 上下文，NPC 不直接扫描全局场景

`GameScene` 已拥有 `raceVehicleStates`、尾流采样和碰撞循环。应由它生成 NPC 所需上下文：

```ts
type NpcRaceContext = {
    raceRunningMs: number;
    selfState: RaceVehicleState;
    vehicleStates: Array<RaceVehicleState>;
    draftRelations: Array<DraftRelation>;
};
```

调用方式：

```text
updateRaceVehicleStates()
draftRelations = updateDraftBoosts(dt)
for each npc:
    npc.update(track, dt, contextForNpc)
handleVehicleCollisions()
```

注意：当前更新顺序是车辆更新后再更新尾流和碰撞。实施时需要细化顺序，避免 NPC 使用上一帧或空的尾流数据。可接受的第一版是使用上一帧 `draftRelations` 做决策，因为 AI 反应慢一帧符合自然感；但要在设计和测试中明确。

备选方案：让 NPC 自己持有 `GameScene` 引用。该方案增加耦合，后续测试和维护更难，不采用。

### 15. 测试与调试以可观察状态为主

当前项目没有复杂测试框架，验证可分为自动构建、可调试数据和手工试跑：

- `npm run build` 验证类型和打包。
- debug 模式下可临时输出 NPC `mode`、`laneOffset`、`steerError`、`understeer`、`draftTargetId`。
- 手工观察开局 2 秒、入弯、追尾流、超车、并行侧挤和防守别车。
- 若后续加自动测试，可把纯计算函数如加速曲线、转向曲线、机会窗口抽样、目标评分提取成可单测函数。

备选方案：一开始就建立完整 AI 仿真测试。当前项目没有对应基础设施，投入较大；本变更优先把算法拆成可测试的小函数，逐步补测试。

## Risks / Trade-offs

- [非线性加速改变玩家手感] → 低速只做轻微提升，并保留现有 `maxSpeed`、`friction` 和尾流倍率；实现后优先手工试跑起步和高速段。
- [高速转向衰减让玩家觉得转不动] → `highSpeedTurnDamping` 初值控制在轻度范围，且前段转向有 `turnInitialBoost` 补偿。
- [NPC 从路径吸附改为输入驱动后可能撞墙或冲出赛道] → 先使用保守前视距离、转向不足减速和 `maxLaneOffset` 限制，再逐步增加战术攻击性。
- [随机攻击行为可能显得混乱] → 所有概率按机会窗口抽样，并设置持续时间，避免每帧随机。
- [尾流关系计算增加性能开销] → 当前标准比赛只有 5 台车，关系计算规模很小；并且可复用 `updateDraftBoosts()` 的遍历。
- [防守别车可能导致 NPC 自己失控] → 在大转向误差、转向不足或偏离参考线时降级防守。
- [侧挤和碰撞系统叠加可能过强] → 侧挤只改变目标路线，不直接加横向速度；真正接触后仍由现有碰撞响应处理。
- [OpenSpec 现有多个 in-progress 变更可能交叉] → 本变更只在新 change 中描述算法，不修改既有 change；实施时需要以当前源码为准合并。

## Migration Plan

1. 先新增车辆物理曲线和输入驱动接口，让玩家继续可控，并验证 build。
2. 再让 NPC 复用同一输入接口，但先只做普通赛道跟随，不接入尾流和攻击行为。
3. 加入 NPC 起步 buff、技能画像、转向噪声、回正和转向不足减速，验证 NPC 能稳定完赛。
4. 扩展尾流关系表，让现有尾流收益仍保持一致。
5. 接入 NPC 主动吃尾流和超车，验证不会频繁撞尾。
6. 接入 20% 顶撞、30% 侧挤和 40% 防守别车，并通过配置控制强度。
7. 若行为过强，可通过 `raceNpc` 配置快速回退到保守值，而不回滚车辆物理。

## Open Questions

- 当前赛道没有显式道路边界宽度，`maxLaneOffset` 第一版需要用保守常量；未来若增加多赛道，应考虑 track 级别的可用车道宽度配置。
- 当前 `Track.pathPoints` 由赛道渲染流程生成，可能包含多层曲线采样；实施时需要确认 NPC 使用的路径点是否应只来自碰撞层或首个可行层。
- 若后续要稳定复现 NPC 行为，需要引入可选随机种子；当前设计先保持 `Math.random()`。
