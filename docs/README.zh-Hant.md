# 數織（Nonogram）

一款功能完整的數織解謎網頁遊戲：支援遊玩、推演、自訂題目、題庫瀏覽、使用者體系與 GIF 覆盤。

> **简体中文:** [../README.md](../README.md) · **English:** [README.en.md](README.en.md) · **日本語:** [README.ja.md](README.ja.md)

> 線上地址：<https://nonogram.amiya1223.top>

## 功能特性

- **遊玩與推演**：經典數織玩法，支援輪換/畫筆模式、多級推演、檢查錯誤、恢復檢查點、智慧提示、自動解題。
- **自訂題目**：畫盤面自動產生線索，或手動輸入行列線索；可匯出存檔/圖片/程式碼與他人分享。
- **使用者系統**：註冊 / 登入 / 登出；統計已解題數與尺寸分佈。
- **題庫瀏覽**：分頁瀏覽伺服器題庫，支援按尺寸篩選，已完成題目帶標記。
- **伺服器題庫**：內建 9000+ 道唯一解題目（5×5 ~ 80×80），隨機抽題支援精確尺寸與尺寸範圍，同尺寸自動去重。
- **題目匯入**：檔案 / 程式碼 / 網頁原始碼匯入，伺服器端驗證合法性與唯一解後自動入庫。
- **計時與覆盤**：從玩家首次落子開始計時，可暫停；完成後一鍵產生按操作順序重放的 GIF 覆盤。
- **響應式**：桌面端側邊欄 + 手風琴，手機端全螢幕抽屜 + 底部標籤導覽。

## 技術棧

| 層 | 技術 |
| --- | --- |
| 前端 | React 19、Vite 8、Tailwind CSS、lucide-react |
| 後端 | Express 5、Node 內建 `node:sqlite`（零原生相依） |
| 資料庫 | SQLite（`server/data/app.db`，自動建表） |
| GIF 產生 | gifenc（純前端編碼，無網路相依） |
| 測試 | Playwright + 系統 Edge（無頭端到端測試） |

## 專案結構

```
nonogram-game/
├── index.html               # 入口 HTML
├── src/                     # 前端原始碼
│   ├── main.jsx             # React 掛載入口
│   ├── App.jsx              # 佈局與元件組裝
│   ├── constants.js         # 主題、預設題目、棋盤上限等常數
│   ├── api.js               # 後端 API 封裝
│   ├── i18n/                # 多語言（簡體中文 / 繁體中文 / English / 日本語，可擴充）
│   ├── hooks/
│   │   └── useGameState.js  # 全域狀態與業務邏輯
│   ├── logic/               # 純函式邏輯（無 React 相依）
│   │   ├── board.js         # 棋盤資料工具
│   │   ├── clues.js         # 線索解析 / 完成判定 / 自動高亮
│   │   ├── solver.js        # 數織求解器（單行推導 + 全盤迭代）
│   │   ├── importer.js      # 外部網頁原始碼解析
│   │   ├── exporter.js      # 存檔 / JSON / 圖片匯出
│   │   ├── gifReplay.js     # GIF 覆盤產生
│   │   ├── storage.js       # localStorage 封裝
│   │   └── theme.js         # 推演模式樣式輔助
│   └── components/          # 棋盤、側邊欄、線索條等元件
├── server/                  # 後端（Express + SQLite）
│   ├── index.js             # API 路由（題庫 / 瀏覽 / 使用者 / 進度）
│   ├── auth.js              # 工作階段與密碼雜湊
│   ├── db.js                # SQLite schema 與連線
│   ├── puzzle-lib.js        # 題目驗證 / 唯一解判定 / 數字 ID
│   ├── import-puzzles.mjs   # 批次匯入題庫腳本
│   └── data/                # SQLite 資料檔（執行時產生，不入庫）
├── tools/                   # 題庫收集與建置腳本
│   ├── fetch-webpbn.py      # webpbn 題庫下載
│   ├── convert-puzzlekit.py # puzzlekit 資料集轉換
│   ├── merge-puzzle-data.py # 多來源合併按尺寸分類
│   ├── build-puzzle-db.mjs  # 驗證唯一解並產生匯入檔
│   └── puzzle-data/         # 題庫資料（JSONL）
├── tests/                   # Playwright 端到端測試
│   ├── e2e-load.mjs         # 頁面載入零錯誤
│   ├── e2e-flow.mjs         # 計時 / 隨機抽題 / 暫停等互動
│   ├── e2e-gif.mjs          # 完成狀態與 GIF 下載
│   ├── e2e-autosolve.mjs    # 一鍵解題不計入解題記錄
│   └── e2e-turn.mjs         # 輪換打叉操作記錄合併
├── deploy/                  # 伺服器部署輔助
│   ├── nonogram.conf        # Nginx 設定（HTTP→HTTPS 跳轉 / 反向代理 / SPA）
│   ├── setup-server.sh      # 伺服器初始化腳本
│   └── check-cert-chain.sh  # 憑證鏈完整性檢查
├── deploy.ps1               # 一鍵部署腳本（需 NONOGRAM_SERVER 環境變數）
└── package.json
```

## 本機開發

前置需求：Node.js **24+**（後端使用 `node:sqlite` 內建模組）。

```bash
npm install        # 安裝相依
npm run dev        # 啟動 Vite 開發伺服器（/api 代理到 localhost:3000）
```

同時需要啟動後端（另開一個終端）：

```bash
cd server
npm install
npm start          # 監聽 3000 埠，自動建立 data/app.db 並建表
```

## 建置與測試

```bash
npm run build      # 生產建置，輸出 dist/
npm run lint       # ESLint 檢查
npm run test:e2e   # 端到端測試（需先部署或設定 TEST_BASE）
```

端到端測試預設指向本機 `http://localhost:4173`（`vite preview`）。測試其他環境時透過環境變數指定：

```bash
$env:TEST_BASE="https://your.domain"   # PowerShell
TEST_BASE=https://your.domain npm run test:e2e   # Linux/macOS
```

## 部署說明

### 1. 伺服器準備

以阿里雲 ECS（建議 2 核 2G，系統 Ubuntu/Debian/CentOS 均可）為例：

```bash
# 安裝 Node.js 24+（以 NodeSource 為例）
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs nginx
npm install -g pm2
```

將 `deploy/setup-server.sh` 上傳到伺服器 `/opt/nonogram/` 後執行，腳本會安裝後端相依、設定 Nginx、啟動 PM2 並開放防火牆埠。

### 2. 建置與上傳

在本機：

```bash
npm run build
```

將 `dist/` 與 `server/` 上傳到伺服器 `/opt/nonogram/`（範例）：

```bash
scp -r dist/* root@YOUR_SERVER:/opt/nonogram/dist/
scp server/* root@YOUR_SERVER:/opt/nonogram/server/
```

### 3. 初始化題庫（選用，建議）

題庫資料在 `tools/puzzle-data/import.jsonl`（約 9000+ 道唯一解題目）。上傳後匯入：

```bash
cd /opt/nonogram/server
node import-puzzles.mjs /path/to/import.jsonl
```

如想從原始資料重新建置題庫：

```bash
node tools/build-puzzle-db.mjs   # 驗證唯一解並產生 tools/puzzle-data/import.jsonl
```

### 4. 啟動與 Nginx

```bash
cd /opt/nonogram/server
pm2 start index.js --name nonogram-api
pm2 save && pm2 startup
```

`deploy/nonogram.conf` 將 `/api` 反向代理到 3000 埠並託管靜態檔案：

```bash
cp deploy/nonogram.conf /etc/nginx/conf.d/nonogram.conf
nginx -t && systemctl reload nginx
```

### 5. HTTPS 憑證（Cloudflare Origin 憑證，15 年有效期）

網站透過 Cloudflare 代理存取，源站使用 Cloudflare Origin CA 簽發的憑證（15 年，無需續期）：

1. Cloudflare 控制台 → **SSL/TLS → Origin Server → Create Certificate**，主機名稱填 `example.com`（或 `*.example.com`），有效期選 15 年，下載 PEM（含完整鏈）。
2. 將下載內容上傳到源站：
   - 憑證（含鏈）：`/etc/nginx/ssl/example.com.crt`
   - 私鑰：`/etc/nginx/ssl/example.com.key`（權限 600）
3. 重新載入 Nginx：
   ```bash
   nginx -t && systemctl reload nginx
   ```
4. Cloudflare **SSL/TLS 模式設為 Full (strict)**；可用 `deploy/check-cert-chain.sh` 驗證憑證鏈完整（應包含葉子 + Cloudflare Origin CA 根共 2 張憑證，且 SAN 覆蓋 `example.com`）。

> 說明：Origin 憑證僅對經過 Cloudflare 的存取有效，無需 acme.sh / Let's Encrypt，也沒有續期 cron。若源站位於中國大陸雲伺服器（騰訊雲/阿里雲），必須先完成 ICP 備案，否則雲廠商會攔截未備案網域的 HTTP/HTTPS 存取（表現為 Cloudflare 525 或 403 攔截頁）。

### 6. 一鍵部署（選用）

本機已設定 SSH 免密登入後，可用 `deploy.ps1` 自動完成 lint → build → 上傳 → PM2 重啟 → 提交 GitHub：

```powershell
$env:NONOGRAM_SERVER="YOUR_SERVER_IP"   # 必填，伺服器地址不寫入倉庫
powershell -File deploy.ps1 "部署說明"
```

### 7. 安全建議

- 使用 SSH 金鑰登入，關閉 root 密碼登入；
- 設定 HTTPS（Cloudflare Origin 憑證等）後設定環境變數 `SECURE_COOKIE=1`；
- 定期備份資料庫檔案 `server/data/app.db`（建議 cron）；
- 伺服器對公網提供服務請完成 ICP 備案，並設定防火牆僅開放 80/443。

## 環境變數

| 變數 | 用途 | 預設值 |
| --- | --- | --- |
| `PORT` | 後端監聽埠 | `3000` |
| `DATA_DIR` | SQLite 資料目錄 | `server/data` |
| `SECURE_COOKIE` | 開啟後工作階段 Cookie 僅 HTTPS 傳輸 | 空 |
| `NONOGRAM_SERVER` | deploy.ps1 部署目標伺服器地址 | 必填 |
| `TEST_BASE` | 端到端測試目標地址 | `http://localhost:4173` |

## 授權

MIT
