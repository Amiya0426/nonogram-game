---
name: nonogram-release
description: Nonogram 构建、验证与发布部署。用于 build/lint/E2E、deploy/**、deploy.ps1/deploy.bat、Nginx/PM2 配置、证书与生产冒烟。发布前必须完成 lint → build → E2E → 服务器健康检查；数据库迁移前必须备份。
---

# Nonogram Release

## 职责范围

- `package.json` scripts：dev/build/lint/test:e2e/preview/deploy（gh-pages）。
- `deploy/nonogram.conf`（Nginx：HTTP→HTTPS、/api 反代、SPA try_files、gzip、安全头/CSP）。
- `deploy/setup-server.sh`（服务器初始化：依赖、Nginx、PM2、防火墙）。
- `deploy/check-cert-chain.sh`（Cloudflare Origin 证书链检查）。
- `deploy.ps1` / `deploy.bat`（一键发布：lint → build → 上传 → PM2 重启 → 健康检查 → git 提交推送）。
- `dist/` 构建产物与 GitHub Pages 发布（`BASE_PATH=/nonogram-game/` 时用 gh-pages）。

## 生产服务器访问（SSH）

- 连接方式：SSH 密钥认证；`deploy.ps1` 使用 `scp` / `ssh -o BatchMode=yes`，不依赖密码输入。
- 目标地址一律从环境变量 `NONOGRAM_SERVER` 读取；优先填 `~/.ssh/config` 中的别名（如 `nonogram-prod`），不要填裸 IP。
- 真实 IP / 用户名 / 私钥路径只允许存在于本机 `~/.ssh/config`、SSH agent 或本地环境变量；禁止写入仓库任何文件（`.codex/skills/**`、AGENTS.md、deploy/**、docs/** 均不得出现）。
- 本机使用示例（PowerShell）：`$env:NONOGRAM_SERVER = "nonogram-prod"; .\deploy.ps1 -Message "部署说明"`。
- 连接失败时只排查本机 SSH 配置 / 密钥 / 网络，不要把连接信息“修复”进仓库。

## 发布门禁（顺序不可跳）

1. `npm run lint`
2. `npm run build`
3. `npm run preview` 后 `npm run test:e2e`（或用 `TEST_BASE` 指向 staging）
4. 部署后冒烟：`curl http://127.0.0.1:3000/api/health`、Nginx 首页 HTTP 200；证书用 `deploy/check-cert-chain.sh` 验证（叶 + Cloudflare Origin CA 共 2 张，SAN 覆盖域名）。
5. 数据库相关变更：先备份 `server/data/app.db`；迁移只允许 additive（新增列/索引）；先在副本执行。

## 关键约束

- `deploy.ps1` 从环境变量 `NONOGRAM_SERVER` 读取服务器地址（优先 SSH 别名），仓库不得硬编码服务器 IP；同样不得提交 `.env` / `RESEND_API_KEY` / 证书私钥。
- 生产环境：`SECURE_COOKIE=1`；Nginx 只暴露 80/443；PM2 以 `nonogram-api` 运行并 `pm2 save`。
- Nginx 改动必须 `nginx -t` 后再 reload；PM2 改动后检查 `pm2 status`。
- 不要跳过 lint/build/E2E 直接部署；不要为了赶发布关闭断言。
- 新增依赖需要明确理由（见 AGENTS.md），发布脚本本身不引入新依赖。

## 验证

- 本地全量：`npm run lint && npm run build && npm run test:e2e`。
- 服务器：健康检查 + 证书链 + `pm2 status`；GitHub Pages 场景验证 BASE_PATH 下资源路径正确。
