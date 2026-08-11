# AGENTS.md

## 项目

数织（Nonogram）网页游戏：经典数织玩法，支持画笔/切换模式、多级推导、错误检查、智能提示、自动求解、自定义题目、题库浏览、用户系统（注册/登录/进度）、存档导入导出与 GIF 复盘。

- 在线地址：https://nonogram.amiya1223.top
- GitHub：https://github.com/Amiya0426/nonogram-game
- 部署：服务器（Nginx + PM2 + Express + SQLite）+ GitHub Pages 静态发布

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19、Vite 8、Tailwind CSS 3、lucide-react、gifenc、jszip、lz-string |
| 后端 | Express 5、Node 内置 `node:sqlite`、bcryptjs、cookie-parser、Resend（邮件，可选） |
| 测试 | Playwright + 系统 Edge（headless） |
| 部署 | Nginx、PM2、Cloudflare Origin 证书、GitHub Pages |

## 目录职责

| 路径 | 职责 | 边界 |
| --- | --- | --- |
| `src/main.jsx` / `src/App.jsx` | React 入口与整体布局 | 只做组合，不写领域规则 |
| `src/components/**` | 棋盘、线索条、面板、弹窗等 UI | 只消费 hook 状态，不复制逻辑 |
| `src/hooks/useGameState.js` | 唯一状态编排层 | 连接 logic ↔ UI ↔ api |
| `src/logic/**` | 纯领域逻辑 | 不 import React，不碰 DOM（除 exporter/gifReplay 隔离函数） |
| `src/i18n/**` | 前端多语言（zh / zh-Hant / en / ja） | 文案不硬编码 |
| `src/api.js` | 后端 API 客户端 | 前端唯一网络入口 |
| `src/constants.js` | 共享常量 | UI 与 core 共用，修改需双向验证 |
| `server/**` | Express API、SQLite、认证、唯一解 worker | 唯一允许访问数据库的层 |
| `tools/**` | 题库采集/转换/合并/构建流水线 | 只产出 JSONL，不写生产数据库 |
| `tests/**` | Playwright E2E | 测用户行为，不测实现细节 |
| `deploy/**` + `deploy.ps1` / `deploy.bat` | 服务器部署与发布 | 不硬编码服务器地址/密钥；目标经 `NONOGRAM_SERVER`（SSH 别名）注入 |
| `docs/**` | 多语言 README | 与代码同步更新 |

## Architecture boundaries（不能互相污染）

- `src/logic` 不 import React、不调用 `src/api.js`、不读写数据库；浏览器能力仅限 `exporter.js` / `gifReplay.js`。
- `src/components` 不复制领域规则，业务状态一律从 `useGameState` 获取。
- `server` 不 import `src/**`；前端不直接访问 SQLite。
- `tools` 不修改源码；`tools` 不直接写生产数据库。
- `tests` 不针对组件私有状态或脆弱实现细节。
- `deploy` 不硬编码服务器 IP、API key 或证书私钥；生产服务器只经 `NONOGRAM_SERVER` / 本机 SSH 别名访问。

## Skill 路由

| 任务 | Skill |
| --- | --- |
| 游戏逻辑 / solver / 状态 / 存档 / 复盘 | `nonogram-core` |
| UI / 响应式 / 交互 / i18n / 可访问性 | `nonogram-ui` |
| 浏览器行为 / E2E / 视觉回归 | `nonogram-e2e` |
| API / auth / SQLite / 安全 | `nonogram-backend` |
| 题库数据 / 转换 / 唯一解 / 构建 | `nonogram-puzzle` |
| 构建 / lint / 部署 / 发布 | `nonogram-release` |

跨领域任务组合多个 Skill。例如：改棋盘交互 → `nonogram-ui` + `nonogram-e2e`；改求解正确性 → `nonogram-core` + `nonogram-puzzle`；改导入接口 → `nonogram-backend` + `nonogram-core`。

## 视觉回归协作

`nonogram-ui` + `nonogram-e2e` + `claude-vision-skill` + `webapp-testing` 的分工：

- `nonogram-e2e` 定义视口矩阵（1280x800 / 1440x900 / 375x812 / 390x844）并截图。
- `claude-vision-skill` 负责分析截图内容（棋盘完整性、clue 错位、遮挡、溢出等）。
- `webapp-testing` 提供通用 Playwright 调试辅助。
- 不得重复实现识图能力，不得为了视觉检查新装工具。

强制规则：截图后必须调用 `claude-vision-skill` 的 `vision.js` 识图（`node ~/.codex/skills/claude-vision-skill/vision.js "<png>" "<问题>"`）；模型不得以“看不了图片”为由跳过视觉检查，也不得改用 DOM 断言替代。流程固定为：截图 → vision.js 描述 → 修复 → 复验。

## 修改后验证流程

1. 常规改动：`npm run lint`。
2. 构建：`npm run build`。
3. 逻辑改动：`npm run test:unit`（`tests/unit/` 覆盖 `src/logic` 纯函数）。
4. E2E：`npm run preview` 后 `npm run test:e2e`（`TEST_BASE` 可覆盖为其他环境）。
5. 后端改动：用独立 `DATA_DIR` 跑 `server/smoke-test.mjs`、`server/progress-test.mjs`；注意 `api-smoke.mjs` 断言可能过时。
6. 题库改动：`node tools/build-puzzle-db.mjs` 检查统计；改唯一解/ID 前先确认影响面。
7. 部署：按 `nonogram-release` 门禁执行；数据库迁移前备份。

## 规则

- 不做无关重构：只改任务涉及的目录。
- 不随意增加依赖：新增 dependency 必须说明用途；能用 `node:sqlite` 或现有库解决就不加。
- 保持技能体系精简：不新建 generic-* skill；项目 skill 只围绕上述六个边界。
- 新增文案必须进 i18n，不在组件里硬编码中英文。
- E2E 选择器优先使用稳定 `data-testid`，不依赖界面文案；计时/异步断言用轮询等待，避免固定 sleep；内部结构（如存档格式、moveHistory）由单元测试覆盖。
