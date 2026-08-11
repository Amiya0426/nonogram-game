---
name: nonogram-backend
description: Nonogram 服务端 API、认证、会话与 SQLite。用于修改 server/**：Express 路由、auth/session、db schema、puzzle-lib 校验/唯一解、solve-worker、mailer、服务端 i18n、题库导入脚本与服务端冒烟测试。重点关注 SQL 注入、授权、Cookie、输入校验、恶意题目数据、昂贵求解与 API 错误处理。
---

# Nonogram Backend

## 职责范围

- `server/index.js`：全部 API 路由（auth、puzzles、user/progress、health、静态托管、404、错误处理）。
- `server/auth.js`：会话、bcrypt、限流、IP 封禁、邮箱验证码。
- `server/db.js`：node:sqlite schema 与幂等迁移（只允许新增列/索引的 additive migration）。
- `server/puzzle-lib.js`：题目规范化/校验/内容哈希/稳定数字 ID/唯一解判定。
- `server/solve-worker.mjs`：唯一解校验 worker（防阻塞事件循环）。
- `server/mailer.js`、`server/i18n.js`、`server/env.js`、`server/import-puzzles.mjs`、`server/*-test.mjs`。

## 安全红线

- 所有 SQL 使用 prepared statement，禁止字符串拼接；用户输入（用户名/密码/邮箱/题目/名称）必须先校验再入参。
- 会话 Cookie：`httpOnly` + `sameSite=lax`；生产 `SECURE_COOKIE=1`；登出销毁 session。
- 认证接口限流 + IP 封禁；`X-Forwarded-For` 只信任本机 Nginx 与 Cloudflare（index.js 有 BlockList，不要放宽）。
- 唯一解校验必须在 worker 里跑，带 timeoutMs/nodeLimit；导入批量上限 200、JSON 5mb。
- 授权：只能改自己导入的题目名；progress 只返回自己的；complete 校验 grid 与答案（gridMatchesClues）。
- 错误响应走 server/i18n（Accept-Language），绝不返回堆栈或内部细节；日志不打印密码/验证码/API key。
- 邮件验证码在无 RESEND_API_KEY 时是 stub（打印到日志并返回 devCode），这是开发期行为；上线前必须配置真实 key 并确认不再返回验证码。

## 数据安全

- `server/data/app.db` 是运行时产物（gitignore）；任何测试用独立 `DATA_DIR`（见 smoke-test.mjs / progress-test.mjs 用法）。
- 过时的 `api-smoke.mjs` 已删除；服务端验证统一走 `smoke-test.mjs` / `progress-test.mjs`（独立 `DATA_DIR`）。
- `import-puzzles.mjs` 直接写题库表；导入前备份数据库，先在 staging/副本执行。

## 验证

- 改动后：`npm run lint`；跑 `DATA_DIR=<临时目录> PORT=3100 node server/smoke-test.mjs`（及 progress-test.mjs）验证注册/登录/导入/完成/进度。
- 涉及求解/校验：用 e2e-autosolve 确认自动求解不记进度；用 tools 数据样本验证唯一解判定。
- 涉及前端 API 契约：检查 `src/api.js` 字段与响应一致。
