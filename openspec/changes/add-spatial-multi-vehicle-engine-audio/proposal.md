## Why

当前实时合成引擎声只服务于玩家自己，比赛里其他载具没有连续引擎声，导致赛场空间感和车辆相对位置反馈仍然偏弱。这个改动希望把引擎声扩展为所有载具共享的合成能力，并加入基于距离、前后位置和左右位置的空间化衰减，同时通过不同基础波形让玩家车和 NPC 车形成更鲜明的听感差异。

## What Changes

- 将实时合成引擎声从“仅玩家拥有”扩展为“所有载具都拥有”，并统一复用浏览器原生 Web Audio 链路。
- 让玩家引擎声保持主导听感，其他载具默认比玩家略小，并根据与玩家的距离、前后相对位置和左右偏移进行连续衰减与声像变化。
- 为非本地载具增加更贴近现实的方向性衰减：前方车辆更清晰、后方车辆略更闷且更轻。
- 将玩家默认基础波形调整为 `sawtooth`，保留现有频率、滤波和轻泛音路线。
- 让每个 NPC 在生成时随机选择基础波形，首批支持 `sine`、`triangle`、`sawtooth` 以及 `pulse`。
- 为 `pulse` 波形补充可重复生成的自定义波形方案，而不是依赖不存在的原生 `OscillatorNode.type`。
- 保持现有资源型音效、菜单、倒计时、完赛、圈速和出界音不变，不引入第三方音频库。

## Capabilities

### New Capabilities
- `multi-vehicle-engine-audio`: 定义所有载具共享的实时引擎合成音、玩家与 NPC 的默认响度差异以及统一的生命周期管理。
- `spatial-race-audio-attenuation`: 定义基于距离、前后相对位置和左右偏移的比赛引擎声衰减、方向性和声像规则。
- `vehicle-engine-waveform-variation`: 定义玩家默认基础波形、NPC 随机基础波形集合以及 `pulse` 自定义波形要求。

### Modified Capabilities
- `player-engine-audio-synthesis`: 将玩家引擎基础波形要求从当前单一方案扩展为以 `sawtooth` 为默认主波形，并要求新多载具音频系统继续保留玩家的非线性主频、滤波和参数平滑行为。

## Impact

- 主要影响 [src/objects/Vehicle.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Vehicle.ts)、[src/objects/Player.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Player.ts)、[src/objects/NPC.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/NPC.ts) 中的引擎声初始化、更新、波形选择与销毁逻辑。
- 影响 [src/scenes/GameScene.ts](/D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts) 中的每帧车辆更新顺序与比赛场景销毁流程，因为所有载具都需要共享监听参考并正确释放音频节点。
- 可能影响 [src/utils/raceConfig.ts](/D:/Projects/TypeScriptProjects/racing/src/utils/raceConfig.ts) 中与引擎声、空间衰减和波形随机化有关的参数归档方式。
- 不影响 [assets/sounds](D:/Projects/TypeScriptProjects/racing/assets/sounds) 中的资源音效，不影响赛道数据、模型资源和菜单结构。
