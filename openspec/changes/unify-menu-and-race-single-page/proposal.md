## Why

当前项目将菜单页和比赛页拆分为两个独立 HTML 与两个独立入口，导致转场依赖 `window.location` 切页，场景状态、黑幕动画、HUD 显隐和浏览器返回行为都被页面重载强行重置。这让首页到比赛页的体验不够连贯，也使“返回菜单、重开比赛、完赛后再次进入比赛”这类高频流程难以用统一生命周期管理。

现在需要把菜单和比赛统一到单页壳内，用页内路由替代整页跳转，让转场、状态重置和重入流程都在同一运行时里完成，从而获得更顺滑的体验和更可控的工程结构。

## What Changes

- 新增单页应用壳层，合并现有 `index.html` 与 `game.html` 的页面职责，在同一文档内承载菜单视图、比赛视图与全局黑幕层。
- 新增轻量页内路由机制，使用 hash 路由在 `menu` 与 `race` 之间切换，并支持携带当前选中的载具参数。
- 将菜单场景从“负责跳页面”改为“负责发出开始比赛事件”，由应用壳统一接管路由跳转与视图切换。
- 将比赛场景从“依赖页面初次加载”改为“可被多次进入/退出的会话对象”，支持从菜单进入、比赛结束后再次进入、以及回到菜单后的重新开始。
- 为菜单场景和比赛场景补充明确的生命周期接口，统一处理事件绑定、动画循环、音频、HUD、黑幕和 DOM 状态的创建、重置与销毁。
- 统一黑幕与 HUD 所属权，避免菜单逻辑、比赛逻辑和车辆逻辑分别直接抢占 `curtain` 与比赛 UI 的状态。

## Capabilities

### New Capabilities
- `single-page-navigation-shell`: 在单个 HTML 与单个入口中承载菜单视图和比赛视图，并通过页内路由完成菜单到比赛的切换。
- `scene-lifecycle-and-race-reentry`: 为菜单场景与比赛场景定义可重复进入、退出、重置和销毁的生命周期，确保返回菜单、重新开始比赛和完赛后再次进入时状态一致。

### Modified Capabilities

无。

## Impact

- 受影响代码：
  - `index.html`
  - `game.html`
  - `webpack.config.js`
  - `src/index.ts`
  - `src/game.ts`
  - `src/scenes/MenuScene.ts`
  - `src/scenes/GameScene.ts`
  - `src/objects/Vehicle.ts`
  - 与 HUD、黑幕、菜单/比赛视图相关的 CSS
- 受影响系统：
  - 页面入口组织方式
  - 路由与浏览器历史
  - Three.js 场景生命周期
  - HUD/黑幕 DOM 控制
  - 比赛重开与回菜单流程
- 依赖影响：
  - 不强制引入 React CDN 或新框架
  - 优先基于现有 `webpack + TypeScript + Three.js` 结构完成
