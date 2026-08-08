# 数织（Nonogram）

一款功能完整的数织解谜网页游戏：支持游玩、推演、自定义题目、云端收藏、用户体系、题库系统与 GIF 复盘。

> 在线地址：<https://nonogram.haiyanghu.top>

## 功能特性

- **游玩与推演**：经典数织玩法，支持轮换/画笔模式、多级推演、检查错误、恢复检查点、智能提示、自动解题。
- **自定义题目**：画盘面自动生成线索，或手动输入行列线索；可导出存档/图片/代码与他人分享。
- **用户系统**：注册 / 登录 / 退出；收藏夹云端同步，跨设备保存；统计已解题数与尺寸分布。
- **服务器题库**：内置 9000+ 道唯一解题目（5×5 ~ 80×80），随机抽题支持精确尺寸与尺寸范围，同尺寸自动去重。
- **题目导入**：文件 / 代码 / 网页源码导入，服务端校验合法性与唯一解后自动入库。
- **计时与复盘**：从玩家首次落子开始计时，可暂停；完成后一键生成按操作顺序重放的 GIF 复盘。
- **响应式**：桌面端侧边栏 + 手风琴，手机端全屏抽屉 + 底部标签导航。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19、Vite 8、Tailwind CSS、lucide-react |
| 后端 | Express 5、Node 内置 `node:sqlite`（零原生依赖） |
| 数据库 | SQLite（`server/data/app.db`，自动建表） |
| GIF 生成 | gifenc（纯前端编码，无网络依赖） |
| 测试 | Playwright + 系统 Edge（无头端到端测试） |

## 项目结构

```
nonogram-game/
├── index.html               # 入口 HTML
├── src/                     # 前端源码
│   ├── main.jsx             # React 挂载入口
│   ├── App.jsx              # 布局与组件装配
│   ├── constants.js         # 主题、预设题目、棋盘上限等常量
│   ├── api.js               # 后端 API 封装
│   ├── hooks/
│   │   └── useGameState.js  # 全局状态与业务逻辑
│   ├── logic/               # 纯函数逻辑（无 React 依赖）
│   │   ├── board.js         # 棋盘数据工具
│   │   ├── clues.js         # 线索解析 / 完成判定 / 自动高亮
│   │   ├── solver.js        # 数织求解器（单行推导 + 全盘迭代）
│   │   ├── importer.js      # 外部网页源码解析
│   │   ├── exporter.js      # 存档 / JSON / 图片导出
│   │   ├── gifReplay.js     # GIF 复盘生成
│   │   ├── storage.js       # localStorage 封装
│   │   └── theme.js         # 推演模式样式辅助
│   └── components/          # 棋盘、侧边栏、线索条等组件
├── server/                  # 后端（Express + SQLite）
│   ├── index.js             # API 路由（题库 / 收藏 / 用户 / 进度）
│   ├── auth.js              # 会话与密码哈希
│   ├── db.js                # SQLite schema 与连接
│   ├── puzzle-lib.js        # 题目校验 / 唯一解判定 / 数字 ID
│   ├── import-puzzles.mjs   # 批量导入题库脚本
│   └── data/                # SQLite 数据文件（运行时生成，不入库）
├── tools/                   # 题库采集与构建脚本
│   ├── fetch-webpbn.py      # webpbn 题库下载
│   ├── convert-puzzlekit.py # puzzlekit 数据集转换
│   ├── merge-puzzle-data.py # 多来源合并按尺寸分类
│   ├── build-puzzle-db.mjs  # 校验唯一解并生成导入文件
│   └── puzzle-data/         # 题库数据（JSONL）
├── tests/                   # Playwright 端到端测试
│   ├── e2e-load.mjs         # 页面加载零错误
│   ├── e2e-flow.mjs         # 计时 / 随机抽题 / 暂停等交互
│   ├── e2e-gif.mjs          # 完成状态与 GIF 下载
│   ├── e2e-autosolve.mjs    # 一键解题不计入解题记录
│   └── e2e-turn.mjs         # 轮换打叉操作记录合并
├── deploy/                  # 服务器部署辅助
│   ├── nonogram.conf        # Nginx 配置（HTTP→HTTPS 跳转 / 反向代理 / SPA）
│   └── setup-server.sh      # 服务器初始化脚本
├── deploy.ps1               # 一键部署脚本（需 NONOGRAM_SERVER 环境变量）
└── package.json
```

## 本地开发

前置要求：Node.js **24+**（后端使用 `node:sqlite` 内置模块）。

```bash
npm install        # 安装依赖
npm run dev        # 启动 Vite 开发服务器（/api 代理到 localhost:3000）
```

同时需要启动后端（另开一个终端）：

```bash
cd server
npm install
npm start          # 监听 3000 端口，自动创建 data/app.db 并建表
```

## 构建与测试

```bash
npm run build      # 生产构建，输出 dist/
npm run lint       # ESLint 检查
npm run test:e2e   # 端到端测试（需先部署或设置 TEST_BASE）
```

端到端测试默认指向本地 `http://localhost:4173`（`vite preview`）。测试其他环境时通过环境变量指定：

```bash
$env:TEST_BASE="https://your.domain"   # PowerShell
TEST_BASE=https://your.domain npm run test:e2e   # Linux/macOS
```

## 部署说明

### 1. 服务器准备

以阿里云 ECS（推荐 2 核 2G，系统 Ubuntu/Debian/CentOS 均可）为例：

```bash
# 安装 Node.js 24+（以 NodeSource 为例）
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs nginx
npm install -g pm2
```

将 `deploy/setup-server.sh` 上传到服务器 `/opt/nonogram/` 后执行，脚本会安装后端依赖、配置 Nginx、启动 PM2 并开放防火墙端口。

### 2. 构建与上传

在本机：

```bash
npm run build
```

将 `dist/` 与 `server/` 上传到服务器 `/opt/nonogram/`（示例）：

```bash
scp -r dist/* root@YOUR_SERVER:/opt/nonogram/dist/
scp server/* root@YOUR_SERVER:/opt/nonogram/server/
```

### 3. 初始化题库（可选，推荐）

题库数据在 `tools/puzzle-data/import.jsonl`（约 9000+ 道唯一解题目）。上传后导入：

```bash
cd /opt/nonogram/server
node import-puzzles.mjs /path/to/import.jsonl
```

如想从原始数据重新构建题库：

```bash
node tools/build-puzzle-db.mjs   # 校验唯一解并生成 tools/puzzle-data/import.jsonl
```

### 4. 启动与 Nginx

```bash
cd /opt/nonogram/server
pm2 start index.js --name nonogram-api
pm2 save && pm2 startup
```

`deploy/nonogram.conf` 将 `/api` 反向代理到 3000 端口并托管静态文件：

```bash
cp deploy/nonogram.conf /etc/nginx/conf.d/nonogram.conf
nginx -t && systemctl reload nginx
```

### 5. HTTPS 证书（Let's Encrypt 自动续期）

使用 [acme.sh](https://github.com/acmesh-official/acme.sh) 签发并自动续期证书：

```bash
# 安装 acme.sh（国内服务器可从 gitee 镜像下载）
curl -sL https://gitee.com/neilpang/acme.sh/raw/master/acme.sh -o /root/.acme.sh/acme.sh
chmod +x /root/.acme.sh/acme.sh
cd /root/.acme.sh && ./acme.sh --install -m admin@your-domain.com

# 签发（HTTP-01 挑战，需 80 端口可达；DNS 代理模式下经 CDN 转发同样可行）
/root/.acme.sh/acme.sh --issue -d your-domain.com --webroot /opt/nonogram/dist --server letsencrypt

# 安装到标准路径，续期后自动 reload nginx
mkdir -p /etc/letsencrypt/live/your-domain.com
/root/.acme.sh/acme.sh --install-cert -d your-domain.com --ecc \
  --fullchain-file /etc/letsencrypt/live/your-domain.com/fullchain.pem \
  --key-file /etc/letsencrypt/live/your-domain.com/privkey.pem \
  --reloadcmd "systemctl reload nginx"
```

acme.sh 安装时会自动配置 cron（每天检查续期），无需手动维护。若使用 CDN 代理（如 Cloudflare），建议将 SSL 模式设为 **Full (strict)**。

### 6. 一键部署（可选）

本机已配置 SSH 免密登录后，可用 `deploy.ps1` 自动完成 lint → build → 上传 → PM2 重启 → 提交 GitHub：

```powershell
$env:NONOGRAM_SERVER="YOUR_SERVER_IP"   # 必填，服务器地址不写入仓库
powershell -File deploy.ps1 "部署说明"
```

### 7. 安全建议

- 使用 SSH 密钥登录，关闭 root 密码登录；
- 配置 HTTPS（Let's Encrypt 等）后设置环境变量 `SECURE_COOKIE=1`；
- 定期备份数据库文件 `server/data/app.db`（建议 cron）；
- 服务器对公网提供服务请完成 ICP 备案，并配置防火墙仅开放 80/443。

## 环境变量

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `PORT` | 后端监听端口 | `3000` |
| `DATA_DIR` | SQLite 数据目录 | `server/data` |
| `SECURE_COOKIE` | 开启后会话 Cookie 仅 HTTPS 传输 | 空 |
| `NONOGRAM_SERVER` | deploy.ps1 部署目标服务器地址 | 必填 |
| `TEST_BASE` | 端到端测试目标地址 | `http://localhost:4173` |

## 许可证

MIT
