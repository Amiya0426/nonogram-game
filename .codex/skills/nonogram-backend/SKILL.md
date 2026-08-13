---
name: nonogram-backend
description: Nonogram 服务端 API、认证、会话与 SQLite。用于修改 server/**：Express 路由、auth（限流/封禁/验证码均 SQLite 持久化）、db schema、puzzle-lib 唯一解、solve-worker、fetch-proxy（SSRF 防护）、trust-proxy（Cloudflare 网段）、mailer、服务端 i18n、题库导入与审计脚本、服务端冒烟测试。重点关注 SQL 注入、授权、Cookie、输入校验、恶意题目数据、昂贵求解与 API 错误处理。
---

# Nonogram Backend

## 职责范围

- `server/index.js`：全部 API 路由（auth、puzzles、user/progress、fetch-url、health、静态托管、404、错误处理）。
- `server/auth.js`：会话、bcrypt、限流、IP 封禁、邮箱验证码（全部 SQLite 持久化；禁止新增进程内存 Map 方案）。
- `server/db.js`：node:sqlite schema 与幂等迁移（只允许新增列/索引的 additive migration）。
- `server/puzzle-lib.js`：题目规范化/校验/内容哈希/稳定数字 ID/唯一解判定（复用 shared/puzzle-core.mjs）。
- `server/solve-worker.mjs`：唯一解校验 worker（防阻塞事件循环）。
- `server/fetch-proxy.js`：网页源码抓取代理（SSRF 防护：仅 http/https、内网/回环/链路本地 IP 拦截、重定向/大小/超时限制）。
- `server/trust-proxy.js`：Cloudflare 边缘网段判定（可用 `CLOUDFLARE_IPS` 环境变量覆盖）。
- `server/mailer.js`、`server/i18n.js`、`server/env.js`、`server/import-puzzles.mjs`、`server/audit-unique.mjs`、`server/*-test.mjs`。

## 安全红线

- 所有 SQL 使用 prepared statement，禁止字符串拼接；用户输入（用户名/密码/邮箱/题目/名称）必须先校验再入参。
- 会话 Cookie：`httpOnly` + `sameSite=lax`；生产 `SECURE_COOKIE=1`；登出销毁 session。
- 认证限流 + IP 封禁落库；`X-Forwarded-For` 只信任本机 Nginx 与 Cloudflare（判定在 `trust-proxy.js`，不要放宽）。
- 唯一解校验必须在 worker 里跑，带 timeoutMs/nodeLimit；导入批量上限 200、JSON 5mb；`/api/puzzles/import` 有按用户/IP 限流。
- 授权：只能改自己导入的题目名；progress 只返回自己的；complete 必须提交 grid 并校验（gridMatchesClues）；入库时若带答案，答案必须与线索一致。
- 错误响应走 server/i18n（Accept-Language），绝不返回堆栈或内部细节；日志不打印密码/验证码/API key。
- 邮件：未配置 RESEND_API_KEY 时为 stub（仅开发）；`NODE_ENV=production` 缺 key 时 send-code 直接 503（fail-closed），绝不返回 devCode。

## 数据安全

- `server/data/app.db` 是运行时产物（gitignore）；任何测试用独立 `DATA_DIR`（见 smoke-test.mjs / progress-test.mjs 用法）。
- 服务端验证统一走 `smoke-test.mjs` / `progress-test.mjs`（独立 `DATA_DIR`）。
- `import-puzzles.mjs` 逐题校验（格式/答案一致/唯一解）后才写库；导入前备份数据库，先在 staging/副本执行。
- `audit-unique.mjs`：审计/清理题库，确保只保留唯一解题。求解重活建议在本地跑（带进度），低配服务器用 `--apply-ids ids.json` 只按 ID 删除；`--fix` 直接清理当前库。

## 验证

- 改动后：`npm run lint`；跑 `DATA_DIR=<临时目录> PORT=3100 node server/smoke-test.mjs`（及 progress-test.mjs）验证注册/登录/导入/完成/进度/fetch-url。
- 涉及求解/校验：用 e2e-autosolve 确认自动求解不记进度；用 tests/unit/uniqueness.test.js 与 tools 数据样本验证唯一解判定。
- 涉及前端 API 契约：检查 `src/api.js` 字段与响应一致。
