## Context

当前项目采用双页面结构：

- [index.html](D:/Projects/TypeScriptProjects/racing/index.html) 承载菜单画布与菜单入口脚本。
- [game.html](D:/Projects/TypeScriptProjects/racing/game.html) 承载比赛画布、HUD、摇杆、完赛面板与比赛入口脚本。
- [src/scenes/MenuScene.ts](D:/Projects/TypeScriptProjects/racing/src/scenes/MenuScene.ts) 通过 `window.location.href = game.html?speeder=...` 启动比赛。
- [src/game.ts](D:/Projects/TypeScriptProjects/racing/src/game.ts) 从 URL 读取 `speeder`，再实例化 [GameScene.ts](D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts)。
- [GameScene.ts](D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts) 和 [Vehicle.ts](D:/Projects/TypeScriptProjects/racing/src/objects/Vehicle.ts) 直接操作 `curtain`、`dashboard`、`joystick`、`finish-screen` 等全局 DOM。

这种结构能工作，但它把“状态重置”依赖在浏览器页面重载上，而不是依赖明确的生命周期管理。改成页内路由后，页面不会重载，因此需要显式解决以下约束：

- 菜单与比赛必须能在同一运行时内切换。
- `PLAY` 转场、比赛倒计时、掉出赛道黑幕、完赛黑幕都要继续工作。
- 返回菜单、再次开始比赛、完赛后重新进入比赛必须不会叠加旧事件监听、旧动画循环或旧 HUD 状态。
- 方案应优先复用现有 `webpack + TypeScript + Three.js`，避免为了“像 React/Vue”而引入与项目主体不匹配的新范式。

## Goals / Non-Goals

**Goals:**

- 将菜单页与比赛页合并到单一 HTML 与单一应用入口中。
- 通过页内路由在 `menu` 和 `race` 两个视图间切换，而不是整页跳转。
- 支持从菜单进入比赛、从比赛返回菜单、完赛后再次开始比赛的完整闭环。
- 为菜单场景与比赛场景补齐可重入的生命周期接口，显式处理创建、激活、停用、销毁与状态重置。
- 将黑幕与比赛 HUD 的显示控制集中到应用壳层，减少场景和车辆对象对全局 DOM 的直接抢占。
- 保持现有菜单视觉、`PLAY` 转场、比赛 HUD、比赛控制逻辑和车辆选择逻辑在用户视角下可继续工作。

**Non-Goals:**

- 不将项目整体重写为 React、Vue 或其他组件化框架。
- 不在本次改造中重构核心物理、赛道、AI 或渲染算法。
- 不在本次改造中改变菜单美术方向、比赛规则、HUD 文案或控制映射。
- 不在本次改造中引入服务端路由、SSR 或需要部署端重写规则的路由方案。

## Decisions

### 1. 采用“单页壳 + 轻量 hash 路由”，不引入 React CDN

选择：

- 保留现有 `webpack + TypeScript` 编译链。
- 新增一个单页应用壳层，统一承载菜单视图与比赛视图。
- 路由使用 `location.hash`，例如：
  - `#/menu`
  - `#/race?speeder=0`

原因：

- 现有项目本质上是命令式 `Three.js` 场景，不是声明式表单/列表 UI。
- 真正的复杂点在场景生命周期、DOM 所属权和重复进入时的状态一致性，而不是组件模板层。
- `hash` 路由对本地静态服务和 `gh-pages` 都最稳，不依赖服务端 fallback。

备选方案：

- `React CDN + React Router`：放弃。会引入双范式并存，仍然需要自行解决 Three 场景生命周期。
- `history.pushState` 路由：可行，但部署和本地回刷要求更高，不如 `hash` 方案稳妥。

### 2. 合并 HTML，建立显式的 App Shell

选择：

- 保留一个主 HTML，内部包含：
  - 全局 `#curtain`
  - `#menu-view` 容器与菜单 canvas
  - `#race-view` 容器与比赛 canvas
  - `#dashboard`
  - `#joystick`
  - `#finish-screen`
- 由 App Shell 控制显示/隐藏，不再通过页面切换切换 DOM。

原因：

- 现有比赛 HUD 与黑幕高度依赖现成 DOM 结构。
- 直接复用 DOM 能减少对 [GameScene.ts](D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts) 和 [Vehicle.ts](D:/Projects/TypeScriptProjects/racing/src/objects/Vehicle.ts) 的侵入式改写。

备选方案：

- 运行时动态创建比赛 HUD：不选。会增加一次性重建 DOM 的复杂度，收益有限。
- 保留两个 HTML 再用 iframe/局部加载拼装：不选。会让状态、事件和渲染上下文更难统一。

### 3. 新增应用入口控制器，统一管理路由和场景会话

选择：

- 新增 `src/app.ts` 作为唯一入口。
- `webpack.config.js` 改为单入口输出。
- `src/index.ts` / `src/game.ts` 的职责并入 `app.ts`，或保留为薄代理后最终收敛到单入口。
- App Shell 负责：
  - 解析当前 route
  - 切换 `menu` / `race` 视图
  - 创建和销毁 `MenuScene` / `GameScene`
  - 驱动唯一的 `requestAnimationFrame` 循环
  - 将菜单 `onPlay(speederIndex)` 转换为路由跳转
  - 处理浏览器返回/前进

原因：

- 路由、DOM 容器、场景生命周期属于跨模块横切逻辑，不适合继续散落在各个场景内部。

备选方案：

- 让 `MenuScene` 自己管菜单路由，让 `GameScene` 自己管比赛路由：不选。职责边界会继续混乱。

### 4. 为 Scene 引入统一生命周期接口

选择：

- 为 `MenuScene` 和 `GameScene` 定义统一接口，至少包括：
  - `mount()`
  - `activate()`
  - `deactivate()`
  - `dispose()`
  - `update(dt)`
- 比赛场景额外提供：
  - `resetRace(options)`
  - `getRouteState()` 或等价能力（如需要）

原因：

- 当前两个场景都在 constructor 中直接注册 `window` 事件。
- 如果不拆生命周期，页内反复切换会导致重复监听、重复输入响应、重复音频和内存泄漏。

备选方案：

- 只在首次进入时创建 `GameScene`，以后永久隐藏/显示：可以作为优化方向，但第一次实现仍应先具备 `dispose/reset` 能力，避免状态难以清理。

### 5. 菜单转场与比赛路由解耦

选择：

- [MenuScene.ts](D:/Projects/TypeScriptProjects/racing/src/scenes/MenuScene.ts) 不再直接 `window.location.href`。
- 菜单完成 `PLAY` 转场后，触发 `onPlay(playableIndex)` 回调给 App Shell。
- App Shell 决定何时将路由切到 `#/race?speeder=...`，并在切换时显示比赛视图。

原因：

- 菜单只负责表现和交互，不应拥有浏览器导航权限。
- 这样能保留现在已经调好的转场节奏，同时把真正的导航责任提升到壳层。

### 6. HUD 与 curtain 的控制权上收，但短期内保留最小兼容层

选择：

- 第一阶段由 App Shell 管理视图级别显隐：
  - 菜单显示/隐藏
  - 比赛视图显示/隐藏
  - HUD 显示/隐藏
  - 全局 `curtain` 初始状态
- 第二阶段把 [GameScene.ts](D:/Projects/TypeScriptProjects/racing/src/scenes/GameScene.ts) 与 [Vehicle.ts](D:/Projects/TypeScriptProjects/racing/src/objects/Vehicle.ts) 对 `document.getElementById(...)` 的直接访问逐步收口为 UI 控制器或 DOM 引用对象。

原因：

- 彻底一次性抽离所有 DOM 访问风险较大。
- 先建立“谁拥有这些 DOM”的边界，再逐步将直连访问收敛到统一对象，是更稳妥的迁移方式。

备选方案：

- 一次性把所有 DOM 控制重构成完整 UI 层：不选。改动面过大，不符合当前最小闭环目标。

### 7. 比赛重入采用“新会话重建优先，缓存复用次之”

选择：

- 当从菜单开始新比赛时，默认创建新的 `GameScene` 会话。
- 当从比赛返回菜单时，销毁旧比赛会话，释放事件、音频与渲染引用。
- 后续若验证性能需求明显，再考虑保留部分重资源做缓存。

原因：

- 当前比赛场景内部状态较多，包括倒计时、玩家、CPU、HUD、完赛状态、黑幕状态。
- 新会话重建最符合当前代码结构，也最能保证“再次进入比赛”状态干净。

备选方案：

- 复用旧 `GameScene` 并手动 reset 每一处状态：理论可行，但更容易漏项，首版不稳。

## Risks / Trade-offs

- [场景重复监听输入事件] → 为 `MenuScene` 和 `GameScene` 明确注册/解绑逻辑，并在验收中反复验证多次进出菜单与比赛后的按键行为。
- [单页后黑幕控制权冲突] → 把全局 `curtain` 的初始化与视图切换放到 App Shell；菜单、比赛、车辆逻辑只通过统一接口或受控 DOM 引用操作它。
- [比赛场景销毁不完整导致内存泄漏] → 在 `dispose()` 中显式停止音频、解绑事件、清理控制器、断开 RAF 持有关系，并在真实页面多次进出后做行为回归验证。
- [现有 DOM 直连逻辑分散，迁移时容易漏掉] → 先通过 `rg` 全量列出所有 `getElementById` 与 `curtain` 使用点，按“菜单 / 比赛 / 车辆”分层收口。
- [入口合并后构建链调整影响现有部署] → 先保留原有资源路径与 `dist` 输出习惯，优先做到 HTML 合并与单 bundle；确认运行无误后再删除旧入口残留。
- [浏览器返回行为与用户预期不一致] → 用 `hashchange` 明确支持 `menu <-> race` 往返，并定义比赛进行中返回菜单的行为为“退出当前比赛会话并回到菜单”。

## Migration Plan

1. 新建单页壳 HTML 和单入口 `app.ts`，让菜单与比赛 DOM 能在同一页同时存在但分视图显示。
2. 将 `MenuScene` 改为通过回调请求开始比赛，不再直接跳页面。
3. 将 `GameScene` 的创建入口改为由 App Shell 传入 `speederIndex` 与所需 DOM，上线首版的 `dispose/reset`。
4. 接入 hash 路由，使 `#/menu` 与 `#/race?speeder=...` 可被直接切换。
5. 完成返回菜单、重新开始比赛和完赛后二次进入比赛的重入闭环。
6. 在真实页面反复验证菜单进入比赛、浏览器返回、比赛结束、重新开始和掉出赛道黑幕等关键流程。

回滚策略：

- 若单页壳接入后出现关键回归，可先保留原双页面入口分支并回退到 `window.location` 导航。
- 迁移期间建议按阶段提交，保证“单页壳接入”“菜单启动比赛”“比赛重入闭环”各自可独立回滚。

## Open Questions

- 比赛完成后的“再次开始”入口最终放在完赛面板内，还是先回菜单再重新开始；本提案默认两者都支持，但 UI 文案与按钮位置可在实现时再确定。
- 是否需要支持直接访问 `#/race?speeder=...` 时自动进入比赛；本方案建议支持，便于调试与分享链接。
- 是否要在首版保留旧 `game.html` 作为兼容入口；技术上可保留一段过渡期，但最终目标应收敛到单页。
