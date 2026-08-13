# 數織（Nonogram）

一款功能完整的數織解謎網頁遊戲：遊玩/推演、自訂題目、題庫瀏覽、使用者系統與 GIF 覆盤。

> 線上地址：<https://nonogram.amiya1223.top>
>
> **[简体中文](../README.md)** · **[English](README.en.md)** · **[日本語](README.ja.md)**

## 功能

- 經典數織玩法：輪換/畫筆模式、多級推演、錯誤檢查、智慧提示、一鍵解題（完整求解）
- 自訂題目：畫盤面或手動輸線索，圖片轉圖案，支援匯出存檔/圖片/程式碼分享
- 使用者系統：註冊/登入/忘記密碼（信箱驗證碼），統計已解題數
- 題庫：9000+ 道唯一解題目（5×5 ~ 80×80），依尺寸篩選、隨機抽題、我匯入的/已完成標記
- 題目匯入：檔案 / 程式碼 / 網頁原始碼，伺服器端驗證合法性與唯一解後入庫
- 計時與 GIF 覆盤：首擊計時、可暫停，完成後依操作順序產生覆盤 GIF
- 多語言與響應式：簡中/繁中/英文/日文，桌面側邊欄 + 行動端抽屜與底部導覽

## 技術棧

| 層 | 技術 |
| --- | --- |
| 前端 | React 19、Vite 8、Tailwind CSS、lucide-react |
| 後端 | Express 5、Node 內建 `node:sqlite`（Node 24+） |
| 測試 | Node 內建 test runner（單測）+ Playwright/Edge（E2E）+ 服務端冒煙 |
| 部署 | Nginx、PM2、Cloudflare（代理 + Origin 憑證）、GitHub Actions CI |

## 快速開始

前置：Node.js **24+**（後端需要 `node:sqlite`）。

```bash
npm install          # 安裝依賴
npm run dev          # 啟動前端（/api 代理到 localhost:3000）
```

另開一個終端啟動後端：

```bash
cd server
npm install
npm start            # 監聽 3000，自動建立 server/data/app.db 並建表
```

## 測試

```bash
npm run lint        # ESLint
npm run build       # 生產建置
npm run test:unit   # 邏輯單測
npm run test:e2e    # 端到端測試
```

注意：`vite preview` 不代理 `/api`，E2E 需要先起後端：

```bash
node server/index.js   # 建議 DATA_DIR=<臨時目錄>
$env:TEST_BASE="http://127.0.0.1:3000"; npm run test:e2e
```

## 部署

### 一鍵部署（推薦）

本機設定好 SSH（`~/.ssh/config` 的 `nonogram` 別名，主機/連接埠/金鑰只存本機）後：

```powershell
$env:NONOGRAM_SERVER="nonogram"
powershell -File deploy.ps1 "部署說明"
```

腳本自動完成：lint → build → 上傳（先清空伺服器 dist）+ shared/server 檔案 → PM2 重啟 → 健康檢查 → 提交並推送 GitHub。

### 伺服器準備

上傳並執行 `deploy/setup-server.sh`（安裝後端依賴、設定 Nginx、啟動 PM2、開放防火牆），再把 `deploy/nonogram.conf` 放到 `/etc/nginx/conf.d/` 並 `nginx -t && systemctl reload nginx`。

### 憑證與 Cloudflare

網站經 Cloudflare 代理存取，源站使用 **Cloudflare Origin 憑證**（15 年有效期，無需續期）：憑證/私鑰放 `/etc/nginx/ssl/`，Cloudflare SSL 模式設為 **Full (strict)**，用 `deploy/check-cert-chain.sh` 驗證憑證鏈。

### 初始化題庫

```bash
node tools/build-puzzle-db.mjs   # 驗證唯一解並產生 tools/puzzle-data/import.jsonl
cd server && node import-puzzles.mjs /path/to/import.jsonl   # 逐題驗證後入庫（先備份資料庫）
```

## 安全建議

- SSH 金鑰登入，停用密碼登入；安全群組只放行必要連接埠並限制來源
- 生產設定 `SECURE_COOKIE=1`，Nginx 預設監聽拒絕 IP/未知 Host 直訪（444）
- 定期備份 `server/data/app.db`（建議 cron）
- 中國大陸伺服器必須完成 ICP 備案，否則雲廠商會攔截未備案網域存取

## 環境變數

| 變數 | 用途 | 預設值 |
| --- | --- | --- |
| `PORT` | 後端監聽連接埠 | `3000` |
| `DATA_DIR` | SQLite 資料目錄 | `server/data` |
| `SECURE_COOKIE` | 開啟後工作階段 Cookie 僅 HTTPS 傳輸 | 空 |
| `NONOGRAM_SERVER` | deploy.ps1 目標（`~/.ssh/config` 別名，如 `nonogram`） | 必填 |
| `TEST_BASE` | E2E 目標地址 | `http://localhost:4173` |

## 目錄速覽

- `src/`：前端（`hooks/` 組合根 + 領域 hook，`logic/` 純邏輯，`components/` UI，`i18n/` 多語言）
- `shared/`：前後端共享求解/線索核心（唯一真源）
- `server/`：Express + SQLite（auth、題庫、fetch-url 代理、審計腳本）
- `tools/`：題庫採集/合併/建置腳本
- `tests/`：`unit/` 單測 + `e2e-*.mjs` 端到端
- `deploy/`：Nginx/憑證腳本；`deploy.ps1` 一鍵部署
- `.github/workflows/ci.yml`：CI（lint + 單測 + 服務端冒煙）

## 授權

MIT
