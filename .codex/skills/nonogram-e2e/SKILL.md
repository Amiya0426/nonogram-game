---
name: nonogram-e2e
description: Nonogram 真实浏览器端到端测试与视觉回归。用于修改 tests/**、Playwright 脚本与视口矩阵检查：页面加载、计时/随机抽题/暂停、GIF 复盘、自动求解、切换打叉合并、桌面与移动端布局。不用于单元测试或 API 冒烟（分别见 nonogram-core / nonogram-backend）。
---

# Nonogram E2E

## 职责范围

- `tests/e2e-*.mjs`：Playwright + 系统 Edge（headless）真实浏览器测试。
- 运行方式：`npm run build` → `npm run preview` → `npm run test:e2e`；`TEST_BASE` 可指向其他环境。
- 既有覆盖：e2e-load（无 JS 错误/标题）、e2e-flow（计时/随机/暂停/GIF 按钮/移动底部导航）、e2e-gif（已解存档→7 帧 GIF 下载）、e2e-autosolve（自动求解不记进度）、e2e-turn（切换打叉合并）。

## 测试原则

- 优先测真实用户行为：点击、输入、下载、localStorage 恢复，而不是组件内部状态。
- 使用稳定定位：`[data-cell][data-r][data-c]`、`getByText`/`getByRole`、可见文案；不要依赖脆弱的深层 CSS 类名组合。
- 避免 arbitrary sleep：优先 `waitForSelector` / 可见性等待；现有脚本的 `waitForTimeout` 只在需要等待渲染/计时时使用，新增代码优先消除。
- 不要为了让测试通过而削弱断言：帧数、进度、下载文件名都是行为事实。
- 测试用独立 localStorage/随机用户名，不污染生产库。

## 视觉回归矩阵

桌面：1280x800、1440x900；移动：375x812、390x844。

每轮检查：

- 棋盘完整可见，不被 toolbar/面板/弹窗遮挡
- 行列 clue 不错位、不截断
- 格子不小于可点击尺寸（移动端尤其检查 touch target）
- 移动底部导航不覆盖内容；drawer 开合正确
- 无水平溢出、无文本截断
- hover/focus 状态可见
- 深色主题：当前只有浅色；加入主题切换后再补两套检查
- 棋盘核心操作可用：落子、打叉、拖拽、画笔、测量、缩放

## 视觉回归工作流

1. 对每个视口截图（fullPage 或棋盘区域）。
2. 用 `claude-vision-skill` 分析截图：`node <skill目录>/vision.js "<png>" "检查棋盘是否完整、clue 是否错位、是否有遮挡/溢出"`。
3. 根据描述修复（通常属 nonogram-ui），再截图复验。
4. 不重新实现识图能力；`webapp-testing` 提供通用 Playwright 辅助（服务器生命周期、示例脚本），本项目测试直接在 `tests/` 维护。

## 验证

- 全部 e2e 必须通过：`node tests/e2e-load.mjs && node tests/e2e-flow.mjs && node tests/e2e-gif.mjs && node tests/e2e-autosolve.mjs && node tests/e2e-turn.mjs`。
- 新增断言前，先确认断言描述的是用户可见行为。
