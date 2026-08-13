# AGENTS.md

## 项目

数织（Nonogram）网页游戏：经典数织玩法，支持画笔/切换模式、多级推导、错误检查、智能提示、自动求解、自定义题目（画盘面/手动线索/图片转图案）、题库浏览（尺寸筛选/我导入的/已完成）、用户系统（注册/登录/邮箱验证码/忘记密码/进度统计）、存档导入导出（代码/JSON/图片/网页源码解析）、GIF 复盘、多语言（zh / zh-Hant / en / ja）与响应式布局。

- 在线地址：https://nonogram.amiya1223.top
- GitHub：https://github.com/Amiya0426/nonogram-game
- 部署：服务器（Nginx + PM2 + Express + SQLite）托管 API 与静态站点；GitHub Pages 为备用静态发布。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 运行时 | Node.js **24+**（后端依赖内置 `node:sqlite`；本地开发与生产同版本） |
| 前端 | React 19、Vite 8、Tailwind CSS 3、lucide-react、gifenc、jszip、lz-string |
| 后端 | Express 5、`node:sqlite`、bcryptjs、cookie-parser、Resend（邮件，可选） |
| 测试 | Node 内置 test runner（单测）+ Playwright/系统 Edge（E2E）+ 服务端冒烟脚本 |
| CI / 部署 | GitHub Actions（lint + 单测 + 服务端冒烟）、Nginx、PM2、Cloudflare Origin 证书 |

## 质量基线（当前状态）

- `npm run lint` 0 错误；`npm run build` 通过。
- 单测 60 例（`tests/unit/`，`node --test`）；E2E 5 条（`tests/e2e-*.mjs`）；服务端冒烟 2 个脚本。
- CI（`.github/workflows/ci.yml`）在 push/PR 自动执行 lint + 单测 + 服务端冒烟。
- 认证限流/验证码/IP 封禁等状态全部 SQLite 持久化；生产缺邮件密钥时 fail-closed。
- 已知取舍：E2E 未纳入 CI（依赖本机 Edge）；`useGameState` 组合根约 600 行（纯装配，可接受）。

## 架构总览

```text
src/components/**  ──消费──>  src/hooks/useGameState.js（组合根）
                                   │ 装配
                                   ├─ useBoardState        基础状态层
                                   ├─ useBoardSetup        初始化/清空/随机/缩放
                                   ├─ useGameChecks        校验/提示/自动求解
                                   ├─ useAuth / useTimer / usePuzzleLibrary
                                   ├─ useBoardInput / useDeduction / useAutofillCross
                                   ├─ useReplay / useProgressReporting
                                   ├─ useAnalysis / useHoverMeasure
                                   ├─ useEditing / useImportExport
                                   └─ 内部调用 src/logic/** 与 src/api.js
src/logic/** ──> shared/puzzle-core.mjs（前后端唯一真源）
src/api.js ──HTTP──> server/index.js ──> auth / db / puzzle-lib / fetch-proxy / trust-proxy
```

- 前端：组件只消费 hook 返回的状态与动作；领域规则在 `src/logic`；网络唯一入口 `src/api.js`。
- 共享核心：求解（`canFit`/`solveLineFast`/`propagateBoard`）与线索提取（`getLineClue`）只存在于 `shared/puzzle-core.mjs`，前后端共同导入。
- 后端：路由集中在 `server/index.js`；SSRF 抓取代理在 `fetch-proxy.js`；Cloudflare 网段判定在 `trust-proxy.js`（可用 `CLOUDFLARE_IPS` 覆盖）。

## 目录职责

| 路径 | 职责 | 边界 |
| --- | --- | --- |
| `src/main.jsx` / `src/App.jsx` | React 入口与整体布局 | 只做组合，不写领域规则 |
| `src/components/**` | 棋盘、侧边栏（Header/EditToolbar/UserArea/GameControls/ViewSettings/ImportExport/Footer）、认证弹窗（Login/Register/Forgot + authFields）等 UI | 只消费 hook 状态，不复制逻辑 |
| `src/hooks/useGameState.js` | 组合根：装配所有领域 hook | 对外 API 与存档格式保持稳定 |
| `src/hooks/useBoardState.js` | 基础棋盘/UI 状态层 | 只含 useState 与 setter |
| `src/hooks/useBoardSetup.js` | 初始化/清空/随机抽题/缩放/线索编辑 | 不碰校验与求解 |
| `src/hooks/useGameChecks.js` | 校验/恢复检查点/提示/自动求解 | 不碰棋盘初始化 |
| `src/hooks/其余 use*` | 认证、计时、题库、交互、推演、自动打叉、复盘、上报、分析、hover、编辑、导入导出 | 单领域职责 |
| `src/logic/**` | 纯领域逻辑（board/clues/solver/moveHistory/password/importer/exporter/gifReplay/storage/theme） | 不 import React，不碰 DOM（除 exporter/gifReplay 隔离函数） |
| `src/i18n/**` | 前端多语言（zh / zh-Hant / en / ja） | 文案不硬编码 |
| `src/api.js` | 后端 API 客户端 | 前端唯一网络入口 |
| `src/constants.js` | 共享常量 | UI 与 core 共用，修改需双向验证 |
| `shared/puzzle-core.mjs` | 前后端共享求解/线索核心 | 唯一真源，禁止任一侧复制实现 |
| `server/index.js` | API 路由（题库/浏览/用户/进度/fetch-url）、唯一解 worker 编排 | 不直接 import `src/**` |
| `server/auth.js` / `db.js` | 会话、密码哈希、限流/验证码/封禁（SQLite）、schema | 认证状态必须落库 |
| `server/puzzle-lib.js` | 题目规范化/校验/唯一解判定/数字 ID | 求解细节来自 shared |
| `server/fetch-proxy.js` / `trust-proxy.js` | 网页抓取代理（SSRF 防护）/ Cloudflare 网段判定 | 独立模块，便于测试与替换 |
| `tools/**` | 题库采集/转换/构建流水线 | 只产出 JSONL，不写生产数据库 |
| `tests/unit/**` | `node --test` 单测（logic/shared/hook 纯逻辑） | 快速、无浏览器依赖 |
| `tests/e2e-*.mjs` | Playwright E2E | 测用户可观察行为 |
| `.github/workflows/ci.yml` | CI：lint + 单测 + 服务端冒烟 | push/PR 自动执行 |
| `deploy/**` + `deploy.ps1` / `deploy.bat` | 服务器部署与发布 | 不硬编码服务器地址/密钥；目标经 `NONOGRAM_SERVER` 注入 |
| `docs/**` | 多语言 README | 与代码同步更新 |

## Architecture boundaries（不能互相污染）

- `src/logic` 不 import React、不调用 `src/api.js`、不读写数据库；浏览器能力仅限 `exporter.js` / `gifReplay.js`。
- 求解器与线索提取等前后端共用逻辑只允许存在于 `shared/puzzle-core.mjs`；改动必须同步验证前后端（单测 `tests/unit/uniqueness.test.js` 锁定行为）。
- `src/components` 不复制领域规则，业务状态一律从 `useGameState` 获取。
- `server` 不 import `src/**`；前端不直接访问 SQLite。
- 认证/限流/封禁等状态一律写入 SQLite，禁止新增进程内存 `Map` 方案（多实例会分片、重启即失）。
- `tools` 不修改源码；`tools` 不直接写生产数据库。
- `tests` 不针对组件私有状态或脆弱实现细节；内部结构（存档格式、moveHistory 合并等）由单测覆盖。
- `deploy` 不硬编码服务器 IP、API key 或证书私钥；生产服务器只经 `NONOGRAM_SERVER` / 本机 SSH 别名访问，SSH 端口为 1408（`deploy.ps1` 已内置）。

## 关键约定

- Hook 分层：状态声明进 `useBoardState`，领域行为进对应 hook，`useGameState` 只做装配；新增状态先问“属于哪个领域”。
- 异步失败不得静默吞掉：导入入库、网络请求等失败必须给用户可见反馈（经 `setAlertMsg` + i18n）。
- E2E 选择器优先使用稳定 `data-testid`，不依赖界面文案；计时/异步断言用轮询等待，避免固定 sleep。
- 新增文案必须进 i18n（前端 4 语言 + 服务端 `server/i18n.js`），不在组件里硬编码中英文。
- 部署脚本使用显式 `git add` 清单，不允许 `git add -A`；上传前先清空服务器 `dist` 再解压。
- 数据库迁移保持 additive（`db.js` 启动时 `CREATE TABLE IF NOT EXISTS` / 加列），部署前备份 `server/data/app.db`。

## 测试策略

| 层 | 命令/位置 | 覆盖 |
| --- | --- | --- |
| 单测 | `npm run test:unit`（`tests/unit/*.test.js`） | board/clues/solver/moveHistory/password/importer/exporter/storage/theme/uniqueness |
| 服务端冒烟 | `cd server && node smoke-test.mjs`、`node progress-test.mjs` | 注册/登录/导入/唯一解/完成/fetch-url/进度（独立 `DATA_DIR`） |
| E2E | `npm run test:e2e`（`TEST_BASE` 指定目标） | 页面加载/交互/轮换/复盘 GIF/自动求解不计入进度 |
| CI | `.github/workflows/ci.yml` | lint + 单测 + 服务端冒烟 |

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

1. 常规改动：`npm run lint`（含 `.mjs`）。
2. 构建：`npm run build`。
3. 逻辑改动：`npm run test:unit`。
4. 后端改动：用独立 `DATA_DIR` 跑 `server/smoke-test.mjs`、`server/progress-test.mjs`。
5. UI/交互改动：本地起服务后跑 `npm run test:e2e`（`TEST_BASE=http://127.0.0.1:3000`）。
6. 题库改动：`node tools/build-puzzle-db.mjs` 检查统计；改唯一解/ID 前先确认影响面。
7. 部署：按 `nonogram-release` 门禁执行（`deploy.ps1`），数据库迁移前备份。

## 规则

- 不做无关重构：只改任务涉及的目录。
- 不随意增加依赖：新增 dependency 必须说明用途；能用 `node:sqlite` 或现有库解决就不加。
- 保持技能体系精简：不新建 generic-* skill；项目 skill 只围绕上述六个边界。
- 新增文案必须进 i18n，不在组件里硬编码中英文。
- E2E 选择器优先使用稳定 `data-testid`；计时/异步断言用轮询等待；内部结构由单元测试覆盖。
