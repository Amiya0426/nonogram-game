# Nonogram

A complete browser-based Nonogram (Paint by Numbers) puzzle game: play, deduction, custom puzzles, puzzle library browsing, user accounts, and GIF replays.

> Online: <https://nonogram.amiya1223.top>

## Features

- **Play & Deduction**: classic Nonogram gameplay with cycle/paint modes, multi-level deduction, error checking, checkpoints, smart hints, and auto-solve.
- **Custom Puzzles**: draw a pattern to auto-generate clues, or enter row/column clues manually; export saves/images/codes to share.
- **User System**: sign up / sign in / sign out; track solved count and size stats.
- **Puzzle Library Browser**: paginated browsing with size filtering, completion markers, and filters for "my imports" / "completed".
- **Server Puzzle Library**: 9000+ built-in unique-solution puzzles (5×5 ~ 80×80); random draw supports exact size or size range with de-duplication.
- **Puzzle Import**: import from files / codes / page source; the server validates format and unique solution before adding to the library.
- **Timer & Replay**: timing starts on your first move and can be paused; after solving, generate a GIF replay in move order.
- **Responsive**: desktop sidebar with accordions; mobile full-screen drawer with bottom tab navigation.
- **i18n**: simplified Chinese and English, with an extensible language pack system (Japanese / Traditional Chinese can be added easily).

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, Vite 8, Tailwind CSS, lucide-react |
| Backend | Express 5, Node built-in `node:sqlite` (zero native dependencies) |
| Database | SQLite (`server/data/app.db`, auto-migrated) |
| GIF | gifenc (pure client-side encoding, no network dependency) |
| Tests | Playwright + system Edge (headless E2E) |

## Project Structure

```
nonogram-game/
├── index.html               # Entry HTML
├── src/                     # Frontend source
│   ├── main.jsx             # React mount entry
│   ├── App.jsx              # Layout and component assembly
│   ├── constants.js         # Theme, presets, board limits
│   ├── api.js               # Backend API wrapper
│   ├── i18n/                # Language packs (zh / en, extensible)
│   ├── hooks/
│   │   └── useGameState.js  # Global state and business logic
│   ├── logic/               # Pure functions (no React dependency)
│   │   ├── board.js         # Board data utilities
│   │   ├── clues.js         # Clue parsing / completion / auto-highlight
│   │   ├── solver.js        # Nonogram solver
│   │   ├── importer.js      # Page-source puzzle extraction
│   │   ├── exporter.js      # Save / JSON / image export
│   │   ├── gifReplay.js     # GIF replay generation
│   │   ├── storage.js       # localStorage wrapper
│   │   └── theme.js         # Deduction-mode styling helpers
│   └── components/          # Board, sidebar, clue bars, modals
├── server/                  # Backend (Express + SQLite)
│   ├── index.js             # API routes (library / browse / users / progress)
│   ├── auth.js              # Sessions and password hashing
│   ├── db.js                # SQLite schema and connection
│   ├── puzzle-lib.js        # Validation / unique-solution check / numeric IDs
│   ├── i18n.js              # Server error localization
│   ├── import-puzzles.mjs   # Bulk library import script
│   └── data/                # SQLite data files (runtime, not committed)
├── tools/                   # Puzzle collection & build scripts
│   ├── fetch-webpbn.py      # webpbn downloader
│   ├── convert-puzzlekit.py # puzzlekit dataset converter
│   ├── merge-puzzle-data.py # Multi-source merge by size
│   ├── build-puzzle-db.mjs  # Validate unique solutions and generate import file
│   └── puzzle-data/         # Puzzle data (JSONL)
├── tests/                   # Playwright E2E tests
│   ├── e2e-load.mjs         # Page loads without errors
│   ├── e2e-flow.mjs         # Timer / random draw / pause interactions
│   ├── e2e-gif.mjs          # Solved state and GIF download
│   ├── e2e-autosolve.mjs    # Auto-solve does not count as progress
│   └── e2e-turn.mjs         # Rotation cross recording merge
├── deploy/                  # Server deployment helpers
│   ├── nonogram.conf        # Nginx config (HTTP→HTTPS / reverse proxy / SPA)
│   ├── setup-server.sh      # Server initialization script
│   └── check-cert-chain.sh  # Certificate chain check
├── deploy.ps1               # One-click deploy script (requires NONOGRAM_SERVER)
└── package.json
```

## Local Development

Prerequisite: Node.js **24+** (backend uses the built-in `node:sqlite`).

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server (/api proxied to localhost:3000)
```

Start the backend in another terminal:

```bash
cd server
npm install
npm start          # listens on 3000, creates data/app.db automatically
```

## Build & Test

```bash
npm run build      # production build → dist/
npm run lint       # ESLint
npm run test:e2e   # E2E tests (deploy first or set TEST_BASE)
```

E2E tests target `http://localhost:4173` by default (`vite preview`). Use an env var for other environments:

```bash
$env:TEST_BASE="https://your.domain"   # PowerShell
TEST_BASE=https://your.domain npm run test:e2e   # Linux/macOS
```

## Deployment

### 1. Server Setup

Example with a cloud ECS (2 vCPU / 2GB, Ubuntu/Debian/CentOS):

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs nginx
npm install -g pm2
```

Upload `deploy/setup-server.sh` to `/opt/nonogram/` and run it; the script installs backend dependencies, configures Nginx, starts PM2, and opens firewall ports.

### 2. Build & Upload

```bash
npm run build
```

Upload `dist/` and `server/` to the server:

```bash
scp -r dist/* root@YOUR_SERVER:/opt/nonogram/dist/
scp server/* root@YOUR_SERVER:/opt/nonogram/server/
```

### 3. Initialize the Library (optional, recommended)

Library data is in `tools/puzzle-data/import.jsonl` (9000+ unique puzzles). Import it after uploading:

```bash
cd /opt/nonogram/server
node import-puzzles.mjs /path/to/import.jsonl
```

To rebuild the library from raw data:

```bash
node tools/build-puzzle-db.mjs
```

### 4. Start Services & Nginx

```bash
cd /opt/nonogram/server
pm2 start index.js --name nonogram-api
pm2 save && pm2 startup
```

`deploy/nonogram.conf` reverse-proxies `/api` to port 3000 and serves static files:

```bash
cp deploy/nonogram.conf /etc/nginx/conf.d/nonogram.conf
nginx -t && systemctl reload nginx
```

### 5. HTTPS Certificate (Cloudflare Origin, 15 years)

The site is accessed through Cloudflare; the origin uses a Cloudflare Origin CA certificate (15 years, no renewal):

1. Cloudflare dashboard → **SSL/TLS → Origin Server → Create Certificate**, hostname `nonogram.amiya1223.top` (or `*.amiya1223.top` and `amiya1223.top`), validity 15 years, download the PEM (full chain).
2. Upload to the origin:
   - Certificate (with chain): `/etc/nginx/ssl/nonogram.amiya1223.top.crt`
   - Private key: `/etc/nginx/ssl/nonogram.amiya1223.top.key` (mode 600)
3. Reload Nginx:
   ```bash
   nginx -t && systemctl reload nginx
   ```
4. Set Cloudflare **SSL/TLS mode to Full (strict)**; run `deploy/check-cert-chain.sh` to verify the chain (leaf + Cloudflare Origin CA root = 2 certs, SAN covers `nonogram.amiya1223.top`).

> Note: Origin certificates only work through Cloudflare; no acme.sh / Let's Encrypt or renewal cron is needed. If the origin is on a mainland China cloud server (Tencent/Aliyun), an ICP filing is required first — otherwise the provider blocks HTTP/HTTPS access to the domain (shown as Cloudflare 525 or a 403 block page).

### 6. One-Click Deploy (optional)

With SSH key auth configured locally, `deploy.ps1` runs lint → build → upload → PM2 restart → GitHub commit:

```powershell
$env:NONOGRAM_SERVER="YOUR_SERVER_IP"   # required, not stored in the repo
powershell -File deploy.ps1 "deploy message"
```

### 7. Security Notes

- Use SSH keys and disable root password login;
- After enabling HTTPS, set `SECURE_COOKIE=1`;
- Back up `server/data/app.db` regularly (e.g., cron);
- Complete ICP filing for public services in mainland China, and open only ports 80/443 in the firewall.

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Backend listen port | `3000` |
| `DATA_DIR` | SQLite data directory | `server/data` |
| `SECURE_COOKIE` | Send session cookie over HTTPS only | empty |
| `NONOGRAM_SERVER` | deploy.ps1 target server address | required |
| `TEST_BASE` | E2E test target URL | `http://localhost:4173` |

## License

MIT
