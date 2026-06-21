## 1. Overlay 视觉原语重构

- [x] 1.1 在 `RaceHud` 中重构 overlay panel 绘制原语，移除大圆角与明显渐变，改为硬边半透明深色蒙版 + 弱蓝边辉光
- [x] 1.2 重构 overlay action button 绘制原语，使 settings 与 results 共用同一套硬边控件视觉

## 2. Results 布局修复

- [x] 2.1 将 results overlay 拆分为 header、summary、lap splits、leaderboard、actions 五个显式布局区域
- [x] 2.2 修复 lap split 与 leaderboard 标题、分段时间、排行状态文本的重叠问题
- [x] 2.3 调整结果页在窄屏与标准桌面视口下的行高与区域高度，确保无文本碰撞

## 3. Controls 与 Gear 统一

- [x] 3.1 将 `BACK / RETRY` 改为与 settings 一致的控件语言，并保留清晰点击热区
- [x] 3.2 为 settings / results 按钮与 gear icon 加入统一的按下形态反馈
- [x] 3.3 重绘右上角 settings gear，使其具有更明确的齿轮轮廓识别度

## 4. 验证与收尾

- [x] 4.1 本地运行构建，确认本次 overlay 重绘未引入 TypeScript 或打包错误
- [ ] 4.2 手工验证 settings overlay、results overlay、leaderboard、`BACK / RETRY` 与 gear icon 在目标视图下的可读性与风格一致性
