# ノノグラム（Nonogram）

機能が充実したブラウザ版ノノグラム（お絵かきロジック）パズルゲーム：プレイ・推論・カスタムパズル・ライブラリ閲覧・ユーザーアカウント・GIF リプレイ。

> オンライン: <https://nonogram.amiya1223.top>
>
> **[简体中文](../README.md)** · **[English](README.en.md)** · **[繁體中文](README.zh-Hant.md)**

## 機能

- 定番のノノグラムルール：切り替え/ペイントモード、多段階推論、エラーチェック、スマートヒント、ワンクリック解答（完全ソルバー）
- カスタムパズル：パターンを描くか手がかりを手入力、画像をパターン化、セーブ/画像/コード書き出しで共有
- ユーザーシステム：登録 / ログイン / パスワード再設定（メール認証コード）、解答数統計
- ライブラリ：一意解パズル 9000 問以上（5×5 〜 80×80）、サイズ絞り込み、ランダム抽題、「自分がインポート」/「完了」マーク
- インポート：ファイル / コード / ページソース。サーバーが形式と一意解を検証してから登録
- タイマーと GIF リプレイ：最初の一手から計時、一時停止可。完成後に操作順のリプレイ GIF を生成
- 多言語とレスポンシブ：簡体中文 / 繁體中文 / English / 日本語。デスクトップはサイドバー、モバイルはドロワー＋下部ナビ

## 技術スタック

| 層 | 技術 |
| --- | --- |
| フロントエンド | React 19、Vite 8、Tailwind CSS、lucide-react |
| バックエンド | Express 5、Node 内蔵 `node:sqlite`（Node 24+） |
| テスト | Node 内蔵 test runner（単体）+ Playwright/Edge（E2E）+ サーバースモーク |
| デプロイ | Nginx、PM2、Cloudflare（プロキシ + Origin 証明書）、GitHub Actions CI |

## クイックスタート

前提: Node.js **24+**（バックエンドは `node:sqlite` を使用）。

```bash
npm install          # 依存関係をインストール
npm run dev          # フロントエンド起動（/api は localhost:3000 にプロキシ）
```

バックエンドは別ターミナルで起動：

```bash
cd server
npm install
npm start            # ポート 3000 で待ち受け、server/data/app.db を自動作成
```

## テスト

```bash
npm run lint        # ESLint
npm run build       # プロダクションビルド
npm run test:unit   # 単体テスト
npm run test:e2e    # エンドツーエンドテスト
```

注意: `vite preview` は `/api` をプロキシしません。E2E の前にバックエンドを起動してください：

```bash
node server/index.js   # テスト時は DATA_DIR=<一時ディレクトリ> を推奨
$env:TEST_BASE="http://127.0.0.1:3000"; npm run test:e2e
```

## デプロイ

### ワンクリックデプロイ（推奨）

ローカルで SSH を設定（`~/.ssh/config` の `nonogram` エイリアス。ホスト/ポート/鍵はローカルのみ）した後：

```powershell
$env:NONOGRAM_SERVER="nonogram"
powershell -File deploy.ps1 "デプロイメッセージ"
```

スクリプトは lint → build → アップロード（サーバーの dist を先にクリア）＋ shared/server ファイル → PM2 再起動 → ヘルスチェック → コミット & GitHub へのプッシュまで自動実行します。

### サーバー準備

`deploy/setup-server.sh` をアップロードして実行（バックエンド依存のインストール、Nginx 設定、PM2 起動、ファイアウォール開放）。`deploy/nonogram.conf` を `/etc/nginx/conf.d/` に置き、`nginx -t && systemctl reload nginx` を実行。

### 証明書と Cloudflare

サイトは Cloudflare 経由でアクセスされ、オリジンは **Cloudflare Origin 証明書**（15 年、更新不要）を使用します。証明書/鍵を `/etc/nginx/ssl/` に配置し、Cloudflare の SSL モードを **Full (strict)** に設定。チェーンは `deploy/check-cert-chain.sh` で検証できます。

### ライブラリの初期化

```bash
node tools/build-puzzle-db.mjs   # 一意解を検証し tools/puzzle-data/import.jsonl を生成
cd server && node import-puzzles.mjs /path/to/import.jsonl   # 1問ずつ検証してから登録（DB を先にバックアップ）
```

## セキュリティ

- SSH 鍵ログインを使用し、パスワードログインを無効化。ファイアウォールは必要なポートのみ・送信元を制限
- 本番で `SECURE_COOKIE=1` を設定。Nginx のデフォルトリスナーは IP/不明ホスト直アクセスを拒否（444）
- `server/data/app.db` を定期的にバックアップ（例: cron）
- 中国本土のサーバーでは ICP 備案が必須。未備案ドメインへのアクセスはプロバイダーにブロックされます

## 環境変数

| 変数 | 用途 | デフォルト |
| --- | --- | --- |
| `PORT` | バックエンド待ち受けポート | `3000` |
| `DATA_DIR` | SQLite データディレクトリ | `server/data` |
| `SECURE_COOKIE` | セッション Cookie を HTTPS のみで送信 | 空 |
| `NONOGRAM_SERVER` | deploy.ps1 の対象（`~/.ssh/config` エイリアス、例 `nonogram`） | 必須 |
| `TEST_BASE` | E2E テストの対象 URL | `http://localhost:4173` |

## ディレクトリ概要

- `src/`: フロントエンド（`hooks/` 構成ルート＋ドメインフック、`logic/` 純粋ロジック、`components/` UI、`i18n/`）
- `shared/`: フロント/バック共有のソルバー＆手がかりコア（唯一の真実源）
- `server/`: Express + SQLite（auth、ライブラリ、fetch-url プロキシ、監査スクリプト）
- `tools/`: パズル収集/マージ/ビルドスクリプト
- `tests/`: `unit/` 単体テスト + `e2e-*.mjs` エンドツーエンド
- `deploy/`: Nginx/証明書スクリプト。`deploy.ps1` はワンクリックデプロイ
- `.github/workflows/ci.yml`: CI（lint + 単体 + サーバースモーク）

## ライセンス

MIT
