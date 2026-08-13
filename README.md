# 数织（Nonogram）

一款功能完整的数织解谜网页游戏：游玩/推演、自定义题目、题库浏览、用户系统与 GIF 复盘。

> 在线地址：<https://nonogram.amiya1223.top>
>
> **[English](docs/README.en.md)** · **[繁體中文](docs/README.zh-Hant.md)** · **[日本語](docs/README.ja.md)**

## 功能

- 经典数织玩法：轮换/画笔模式、多级推演、错误检查、智能提示、一键解题（完整求解）
- 自定义题目：画盘面或手动输线索，图片转图案，支持导出存档/图片/代码分享
- 用户系统：注册/登录/忘记密码（邮箱验证码），统计已解题数
- 题库：9000+ 道唯一解题目（5×5 ~ 80×80），按尺寸筛选、随机抽题、我导入的/已完成标记
- 题目导入：文件 / 代码 / 网页源码，服务端校验合法性与唯一解后入库
- 计时与 GIF 复盘：首击计时、可暂停，完成后按操作顺序生成复盘 GIF
- 多语言与响应式：简中/繁中/英文/日文，桌面侧边栏 + 移动端抽屉与底部导航

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19、Vite 8、Tailwind CSS、lucide-react |
| 后端 | Express 5、Node 内置 `node:sqlite`（Node 24+） |
| 测试 | Node 内置 test runner（单测）+ Playwright/Edge（E2E）+ 服务端冒烟 |
| 部署 | Nginx、PM2、Cloudflare（代理 + Origin 证书）、GitHub Actions CI |

## 快速开始

前置：Node.js **24+**（后端需要 `node:sqlite`）。

```bash
npm install          # 安装依赖
npm run dev          # 启动前端（/api 代理到 localhost:3000）
```

另开一个终端启动后端：

```bash
cd server
npm install
npm start            # 监听 3000，自动创建 server/data/app.db 并建表
```

## 测试

```bash
npm run lint        # ESLint
npm run build       # 生产构建
npm run test:unit   # 逻辑单测
npm run test:e2e    # 端到端测试
```

注意：`vite preview` 不代理 `/api`，E2E 需要先起后端：

```bash
node server/index.js   # 建议 DATA_DIR=<临时目录>
$env:TEST_BASE="http://127.0.0.1:3000"; npm run test:e2e
```

## 部署

### 一键部署（推荐）

本机配置好 SSH（`~/.ssh/config` 的 `nonogram` 别名，主机/端口/密钥只存本机）后：

```powershell
$env:NONOGRAM_SERVER="nonogram"
powershell -File deploy.ps1 "部署说明"
```

脚本自动完成：lint → build → 上传（先清空服务器 dist）+ shared/server 文件 → PM2 重启 → 健康检查 → 提交并推送 GitHub。

### 服务器准备

上传并执行 `deploy/setup-server.sh`（安装后端依赖、配置 Nginx、启动 PM2、开放防火墙），再把 `deploy/nonogram.conf` 放到 `/etc/nginx/conf.d/` 并 `nginx -t && systemctl reload nginx`。

### 证书与 Cloudflare

站点经 Cloudflare 代理访问，源站使用 **Cloudflare Origin 证书**（15 年有效期，无需续期）：证书/私钥放 `/etc/nginx/ssl/`，Cloudflare SSL 模式设为 **Full (strict)**，用 `deploy/check-cert-chain.sh` 验证证书链。

### 初始化题库

```bash
node tools/build-puzzle-db.mjs   # 校验唯一解并生成 tools/puzzle-data/import.jsonl
cd server && node import-puzzles.mjs /path/to/import.jsonl   # 逐题校验后入库（先备份数据库）
```

## 安全建议

- SSH 密钥登录，禁用密码登录；安全组只放行必要端口并限制来源
- 生产设置 `SECURE_COOKIE=1`，Nginx 默认监听拒绝 IP/未知 Host 直访（444）
- 定期备份 `server/data/app.db`（建议 cron）
- 中国大陆服务器必须完成 ICP 备案，否则云厂商会拦截未备案域名访问

## 环境变量

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `PORT` | 后端监听端口 | `3000` |
| `DATA_DIR` | SQLite 数据目录 | `server/data` |
| `SECURE_COOKIE` | 开启后会话 Cookie 仅 HTTPS 传输 | 空 |
| `NONOGRAM_SERVER` | deploy.ps1 目标（`~/.ssh/config` 别名，如 `nonogram`） | 必填 |
| `TEST_BASE` | E2E 目标地址 | `http://localhost:4173` |

## 目录速览

- `src/`：前端（`hooks/` 组合根 + 领域 hook，`logic/` 纯逻辑，`components/` UI，`i18n/` 多语言）
- `shared/`：前后端共享求解/线索核心（唯一真源）
- `server/`：Express + SQLite（auth、题库、fetch-url 代理、审计脚本）
- `tools/`：题库采集/合并/构建脚本
- `tests/`：`unit/` 单测 + `e2e-*.mjs` 端到端
- `deploy/`：Nginx/证书脚本；`deploy.ps1` 一键部署
- `.github/workflows/ci.yml`：CI（lint + 单测 + 服务端冒烟）

## 许可证

MIT
