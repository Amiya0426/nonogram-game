# Nonogram

A full-featured browser-based Nonogram (Paint by Numbers) puzzle game: play, deduction, custom puzzles, library browsing, user accounts, and GIF replays.

> Online: <https://nonogram.amiya1223.top>
>
> **[简体中文](../README.md)** · **[繁體中文](README.zh-Hant.md)** · **[日本語](README.ja.md)**

## Features

- Classic Nonogram play: cycle/paint modes, multi-level deduction, error checking, smart hints, and one-click solve (full solver)
- Custom puzzles: draw a pattern or enter clues manually, image-to-pattern, export saves/images/code to share
- User system: register / sign in / forgot password (email verification code), solved-count stats
- Library: 9000+ unique-solution puzzles (5×5 ~ 80×80), size filtering, random draw, "my imports" / "completed" markers
- Import: files / codes / page source, validated for format and unique solution by the server
- Timer & GIF replay: timing starts on your first move, pausable; generates a replay GIF after solving
- i18n & responsive: Simplified Chinese / Traditional Chinese / English / Japanese; desktop sidebar + mobile drawer and bottom navigation

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, Vite 8, Tailwind CSS, lucide-react |
| Backend | Express 5, Node built-in `node:sqlite` (Node 24+) |
| Tests | Node built-in test runner (unit) + Playwright/Edge (E2E) + server smoke |
| Deploy | Nginx, PM2, Cloudflare (proxy + Origin cert), GitHub Actions CI |

## Quick Start

Prerequisite: Node.js **24+** (the backend needs `node:sqlite`).

```bash
npm install          # install dependencies
npm run dev          # start the frontend (/api proxied to localhost:3000)
```

Start the backend in another terminal:

```bash
cd server
npm install
npm start            # listens on 3000, creates server/data/app.db automatically
```

## Tests

```bash
npm run lint        # ESLint
npm run build       # production build
npm run test:unit   # unit tests
npm run test:e2e    # end-to-end tests
```

Note: `vite preview` does not proxy `/api`; start the backend before running E2E:

```bash
node server/index.js   # use DATA_DIR=<temp dir> for tests
$env:TEST_BASE="http://127.0.0.1:3000"; npm run test:e2e
```

## Deployment

### One-click deploy (recommended)

Configure SSH locally (the `nonogram` alias in `~/.ssh/config`; host/port/key stay local only), then:

```powershell
$env:NONOGRAM_SERVER="nonogram"
powershell -File deploy.ps1 "deploy message"
```

The script runs: lint → build → upload (clearing the server's dist first) + shared/server files → PM2 restart → health check → commit & push to GitHub.

### Server setup

Upload and run `deploy/setup-server.sh` (installs backend dependencies, configures Nginx, starts PM2, opens firewall ports), then put `deploy/nonogram.conf` in `/etc/nginx/conf.d/` and run `nginx -t && systemctl reload nginx`.

### Certificate & Cloudflare

The site is served through Cloudflare; the origin uses a **Cloudflare Origin certificate** (15 years, no renewal). Place the cert/key in `/etc/nginx/ssl/`, set Cloudflare SSL mode to **Full (strict)**, and verify the chain with `deploy/check-cert-chain.sh`.

### Initialize the library

```bash
node tools/build-puzzle-db.mjs   # validate unique solutions, generate tools/puzzle-data/import.jsonl
cd server && node import-puzzles.mjs /path/to/import.jsonl   # per-puzzle validation before insert (back up the DB first)
```

## Security Notes

- Use SSH key login and disable password login; restrict firewall sources to needed ports
- Set `SECURE_COOKIE=1` in production; the Nginx default listener rejects direct IP/unknown Host access (444)
- Back up `server/data/app.db` regularly (e.g., cron)
- Mainland China servers must complete ICP filing, otherwise the provider blocks unregistered domains

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Backend listen port | `3000` |
| `DATA_DIR` | SQLite data directory | `server/data` |
| `SECURE_COOKIE` | Send session cookie over HTTPS only | empty |
| `NONOGRAM_SERVER` | deploy.ps1 target (`~/.ssh/config` alias, e.g. `nonogram`) | required |
| `TEST_BASE` | E2E target URL | `http://localhost:4173` |

## Directory Overview

- `src/`: frontend (`hooks/` composition root + domain hooks, `logic/` pure logic, `components/` UI, `i18n/`)
- `shared/`: frontend/backend shared solve & clue core (single source of truth)
- `server/`: Express + SQLite (auth, library, fetch-url proxy, audit scripts)
- `tools/`: puzzle collection/merge/build scripts
- `tests/`: `unit/` unit tests + `e2e-*.mjs` end-to-end
- `deploy/`: Nginx/cert scripts; `deploy.ps1` one-click deploy
- `.github/workflows/ci.yml`: CI (lint + unit + server smoke)

## License

MIT
