## 1. 共享引擎音频基础设施

- [x] 1.1 将实时引擎音频能力从 [src/objects/Player.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Player.ts) 抽取到 [src/objects/Vehicle.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Vehicle.ts)，建立所有载具共享的初始化、更新和释放入口。
- [x] 1.2 为共享引擎音频链路补充每车独立的总音量节点与左右声像节点，并确保玩家与 NPC 可配置不同的基础响度。
- [x] 1.3 调整 [src/scenes/GameScene.ts](/D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts) 的更新与销毁流程，让所有载具都能在比赛中持续更新引擎声，并在场景结束时统一释放。

## 2. 空间化衰减与方向性

- [x] 2.1 基于玩家参考位置与朝向，为非本地载具实现平滑距离衰减，避免远处车辆仍然过响或突然开关。
- [x] 2.2 为非本地载具实现前后方向性差异，使前方车辆更直接、后方车辆更轻且略更闷。
- [x] 2.3 为非本地载具实现左右声像偏移，使左侧车辆偏左、右侧车辆偏右，并与距离衰减共同工作。

## 3. 波形分化与随机化

- [x] 3.1 将玩家默认基础波形切换为 `sawtooth`，并复查现有非线性频率、滤波和轻泛音路线仍然成立。
- [x] 3.2 为 NPC 建立稳定的基础波形随机分配机制，首批支持 `sine`、`triangle`、`sawtooth`，并保证单场比赛内不重复抽换。
- [x] 3.3 为 `pulse` 波形补充基于 `PeriodicWave` 的自定义构造逻辑，并接入 NPC 波形随机集合。

## 4. 验证与调音

- [ ] 4.1 本地验证比赛中玩家与多辆 NPC 同时发声时的混音层次，确认 NPC 可听见但默认不会压过玩家。
- [ ] 4.2 本地验证前后位置、左右位置和距离变化时的衰减与声像是否符合直觉，确认近处、前车、左侧与右侧都有可辨识反馈。
- [ ] 4.3 本地验证不同波形的玩家与 NPC 听感差异，尤其确认 `pulse` 不会过尖、场景切换后不会残留引擎声。
