---
name: nonogram-e2e
description: Nonogram 真实浏览器端到端测试与视觉回归。用于修改 tests/**、Playwright 脚本与视口矩阵检查：页面加载、计时/随机抽题/暂停、GIF 复盘、自动求解、切换打叉 UI 循环、桌面与移动端布局。不用于单元测试或 API 冒烟（分别见 nonogram-core / nonogram-backend）。
---

# Nonogram E2E

## 职责范围

- `tests/e2e-*.mjs`：Playwright + 系统 Edge（headless）真实浏览器测试。
- 运行方式（`vite preview` 不代理 /api，必须起后端）：
  ```bash
  npm run build
  node server/index.js            # 默认 3000；测试建议 DATA_DIR=<临时目录>
  $env:TEST_BASE="http://127.0.0.1:3000"; npm run test:e2e
  ```
  `TEST_BASE` 也可指向已部署的 staging/生产环境。
- 既有覆盖：e2e-load（无 JS 错误/标题）、e2e-flow（计时/暂停/登录弹窗/注册+导入/随机抽题重置计时/移动底部导航）、e2e-gif（已解存档→7 帧 GIF 下载）、e2e-autosolve（自动求解不记进度 + complete 校验）、e2e-turn（格子 UI 循环：空→黑→叉→空；合并语义由单测覆盖）。

## 测试原则

- 优先测真实用户行为：点击、输入、下载、UI 状态变化，不测组件私有状态。
- 定位优先稳定 `data-testid`（Accordion/SidePanel/FloatingTimer/AuthModal 等已内置）；文案断言只用于行为事实（如 GIF 帧数）。
- 异步断言用 `waitForFunction` 轮询，避免固定 sleep。
- 不要为了让测试通过而削弱断言：帧数、进度、下载文件名都是行为事实。
- 测试用独立 DATA_DIR / 随机用户名，不污染生产库。

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

## 视觉回归工作流（截图后必须识图，不得跳过）

1. 对每个视口截图（fullPage 或棋盘区域），保存为本地 png。
2. 截图后必须立即调用 `claude-vision-skill` 识图，禁止自称“看不了图片”，也禁止改用 DOM 断言代替视觉确认：
   ```
   node <claude-vision-skill 目录>/vision.js "<截图路径>" "检查棋盘是否完整、clue 是否错位、是否有遮挡/溢出、移动端底部导航是否覆盖内容"
   ```
   skill 目录通常为 `~/.codex/skills/claude-vision-skill`（vision.js 输出文字描述）。
3. 以 vision.js 的文字输出作为视觉结论；DOM 断言只能补充结构事实（元素存在、尺寸、属性），不能替代视觉检查。
4. 根据描述修复（通常属 nonogram-ui），再截图复验，直到视觉检查通过。
5. 不重新实现识图能力；`webapp-testing` 提供通用 Playwright 辅助（服务器生命周期、示例脚本），本项目测试直接在 `tests/` 维护。

## 验证

- 全部 e2e 必须通过：`node tests/e2e-load.mjs && node tests/e2e-flow.mjs && node tests/e2e-gif.mjs && node tests/e2e-autosolve.mjs && node tests/e2e-turn.mjs`。
- 新增断言前，先确认断言描述的是用户可见行为。
