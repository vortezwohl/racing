## Why

当前玩家引擎声使用单一三角波直接输出，并且频率与时速做线性绑定，听感偏生硬，缺少从低速到高速逐步“打开”的柔和电子质感。这个改动希望在不引入外部音频依赖、也不改动其他音效资源的前提下，把玩家引擎声升级为更贴合游戏气质的实时合成音。

## What Changes

- 将玩家引擎振荡器从三角波改为正弦波，建立更圆润的基础音色。
- 将引擎主频改为由玩家当前时速驱动的非线性正相关曲线，保证低速段频率增长更慢、高速段增长更快。
- 在引擎合成链路中加入带一定谐振的低通滤波器，并让截止频率由玩家加速度强度驱动。
- 将加速度到截止频率的映射控制为轻度非线性正相关，使滤波器从闷到亮的变化更自然，不出现夸张跳变。
- 为频率和滤波器参数增加平滑过渡，避免实时控制时出现明显爆音、齿音或突兀台阶感。
- 保持现有圈速、碰撞、倒计时、完赛等资源型音效不变，不引入新的音频文件或第三方音频库。

## Capabilities

### New Capabilities
- `player-engine-audio-synthesis`: 定义玩家载具引擎合成音的波形、速度驱动主频、加速度驱动滤波器以及参数平滑要求。

### Modified Capabilities
- 无。

## Impact

- 主要影响 [src/objects/Player.ts](/D:/Projects/TypeScriptProjects/racing/src/objects/Player.ts) 中的 Web Audio 引擎声节点创建、参数映射与释放逻辑。
- 可能影响 [src/utils/raceConfig.ts](/D:/Projects/TypeScriptProjects/racing/src/utils/raceConfig.ts) 中与引擎声相关的可调参数归档方式；若保持最小改动，也可以先将参数留在 `Player` 内部。
- 不影响 [assets/sounds](D:/Projects/TypeScriptProjects/racing/assets/sounds) 中的资源音效，不影响菜单、倒计时、圈速结算、比赛完赛流程。
- 不新增运行时依赖，继续使用浏览器原生 `AudioContext`、`OscillatorNode` 与 `BiquadFilterNode`。
