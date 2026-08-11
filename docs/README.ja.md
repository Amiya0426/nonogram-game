# ノノグラム（Nonogram）

機能が充実したブラウザ版ノノグラム（お絵かきロジック）パズルゲーム：プレイ、推論、カスタムパズル、パズルライブラリ、ユーザーアカウント、GIF リプレイをサポート。

> **[简体中文](../README.md)** · **[English](README.en.md)** · **[繁體中文](README.zh-Hant.md)**

> オンライン: <https://nonogram.amiya1223.top>

## 機能

- **プレイと推論**: 定番のノノグラムルール。切り替え/ペイントモード、多段階推論、エラーチェック、チェックポイント復元、スマートヒント、自動解答に対応。
- **カスタムパズル**: パターンを描くと自動で手がかりを生成。行・列の手がかりを手入力することも可能。セーブ / 画像 / コードで書き出して共有できます。
- **ユーザーシステム**: 登録 / ログイン / ログアウト。解いた問題数とサイズの統計を表示。
- **パズルライブラリ閲覧**: サーバーのライブラリをページングで閲覧。サイズで絞り込みが可能で、完了済みパズルにはマークが付きます。
- **サーバーライブラリ**: 一意解のパズルを 9000 問以上内蔵（5×5 〜 80×80）。ランダム抽題は正確なサイズまたはサイズ範囲に対応し、同じサイズは自動で重複排除。
- **パズルのインポート**: ファイル / コード / ページソースからインポート。サーバーが形式と一意解を検証してからライブラリに追加。
- **タイマーとリプレイ**: 最初の一手から計時を開始し、一時停止も可能。完成後は操作順に再生されるリプレイ GIF をワンクリックで生成。
- **レスポンシブ**: デスクトップはサイドバー＋アコーディオン、モバイルは全画面ドロワー＋下部タブナビゲーション。

## 技術スタック

| 層 | 技術 |
| --- | --- |
| フロントエンド | React 19、Vite 8、Tailwind CSS、lucide-react |
| バックエンド | Express 5、Node 内蔵 `node:sqlite`（ネイティブ依存ゼロ） |
| データベース | SQLite（`server/data/app.db`、自動でテーブル作成） |
| GIF 生成 | gifenc（純クライアントサイド、ネットワーク依存なし） |
| テスト | Playwright + システム Edge（ヘッドレス E2E） |

## プロジェクト構成

```
nonogram-game/
├── index.html               # エントリ HTML
├── src/                     # フロントエンドソース
│   ├── main.jsx             # React マウントエントリ
│   ├── App.jsx              # レイアウトとコンポーネント組み立て
│   ├── constants.js         # テーマ、プリセット、盤面サイズ上限など
│   ├── api.js               # バックエンド API ラッパー
│   ├── i18n/                # 多言語（簡体中文 / 繁體中文 / English / 日本語、拡張可能）
│   ├── hooks/
│   │   └── useGameState.js  # グローバル状態とビジネスロジック
│   ├── logic/               # 純粋関数（React 非依存）
│   │   ├── board.js         # 盤面データユーティリティ
│   │   ├── clues.js         # 手がかり解析 / 完成判定 / 自動ハイライト
│   │   ├── solver.js        # ノノグラムソルバー（単行推論＋全体反復）
│   │   ├── importer.js      # 外部ページソース解析
│   │   ├── exporter.js      # セーブ / JSON / 画像書き出し
│   │   ├── gifReplay.js     # GIF リプレイ生成
│   │   ├── storage.js       # localStorage ラッパー
│   │   └── theme.js         # 推論モードのスタイル補助
│   └── components/          # 盤面、サイドバー、手がかりバーなどのコンポーネント
├── server/                  # バックエンド（Express + SQLite）
│   ├── index.js             # API ルート（ライブラリ / 閲覧 / ユーザー / 進捗）
│   ├── auth.js              # セッションとパスワードハッシュ
│   ├── db.js                # SQLite スキーマと接続
│   ├── puzzle-lib.js        # 検証 / 一意解判定 / 数値 ID
│   ├── import-puzzles.mjs   # ライブラリ一括インポートスクリプト
│   └── data/                # SQLite データファイル（実行時生成、リポジトリ外）
├── tools/                   # パズル収集・ビルドスクリプト
│   ├── fetch-webpbn.py      # webpbn ダウンローダー
│   ├── convert-puzzlekit.py # puzzlekit データセット変換
│   ├── merge-puzzle-data.py # 複数ソースをサイズ別にマージ
│   ├── build-puzzle-db.mjs  # 一意解を検証してインポートファイルを生成
│   └── puzzle-data/         # パズルデータ（JSONL）
├── tests/                   # Playwright E2E テスト
│   ├── e2e-load.mjs         # ページがエラーなく読み込める
│   ├── e2e-flow.mjs         # タイマー / ランダム抽題 / 一時停止などの操作
│   ├── e2e-gif.mjs          # 完成状態と GIF ダウンロード
│   ├── e2e-autosolve.mjs    # 自動解答は解答履歴に含めない
│   └── e2e-turn.mjs         # 切り替えバツ操作の記録マージ
├── deploy/                  # サーバー導入補助
│   ├── nonogram.conf        # Nginx 設定（HTTP→HTTPS リダイレクト / リバースプロキシ / SPA）
│   ├── setup-server.sh      # サーバー初期化スクリプト
│   └── check-cert-chain.sh  # 証明書チェーンの検証
├── deploy.ps1               # ワンクリックデプロイスクリプト（NONOGRAM_SERVER 環境変数が必要）
└── package.json
```

## ローカル開発

前提条件: Node.js **24+**（バックエンドは内蔵 `node:sqlite` を使用）。

```bash
npm install        # 依存関係をインストール
npm run dev        # Vite 開発サーバー起動（/api は localhost:3000 にプロキシ）
```

バックエンドは別ターミナルで起動します：

```bash
cd server
npm install
npm start          # ポート 3000 で待ち受け、data/app.db を自動作成
```

## ビルドとテスト

```bash
npm run build      # プロダクションビルド → dist/
npm run lint       # ESLint
npm run test:e2e   # E2E テスト（先にデプロイするか TEST_BASE を設定）
```

E2E テストはデフォルトでローカル `http://localhost:4173`（`vite preview`）を対象にします。他の環境では環境変数で指定：

```bash
$env:TEST_BASE="https://your.domain"   # PowerShell
TEST_BASE=https://your.domain npm run test:e2e   # Linux/macOS
```

## デプロイ

### 1. サーバー準備

クラウド ECS（2 vCPU / 2GB、Ubuntu/Debian/CentOS）の例：

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs nginx
npm install -g pm2
```

`deploy/setup-server.sh` をサーバーの `/opt/nonogram/` にアップロードして実行します。バックエンド依存のインストール、Nginx 設定、PM2 起動、ファイアウォールの開放を自動で行います。

### 2. ビルドとアップロード

ローカルで：

```bash
npm run build
```

`dist/` と `server/` をサーバーの `/opt/nonogram/` にアップロード：

```bash
scp -r dist/* root@YOUR_SERVER:/opt/nonogram/dist/
scp server/* root@YOUR_SERVER:/opt/nonogram/server/
```

### 3. ライブラリ初期化（任意・推奨）

ライブラリデータは `tools/puzzle-data/import.jsonl`（一意解パズル 9000 問以上）にあります。アップロード後にインポート：

```bash
cd /opt/nonogram/server
node import-puzzles.mjs /path/to/import.jsonl
```

元データからライブラリを再構築する場合：

```bash
node tools/build-puzzle-db.mjs
```

### 4. サービス起動と Nginx

```bash
cd /opt/nonogram/server
pm2 start index.js --name nonogram-api
pm2 save && pm2 startup
```

`deploy/nonogram.conf` は `/api` をポート 3000 にリバースプロキシし、静的ファイルを配信します：

```bash
cp deploy/nonogram.conf /etc/nginx/conf.d/nonogram.conf
nginx -t && systemctl reload nginx
```

### 5. HTTPS 証明書（Cloudflare Origin、15 年）

サイトは Cloudflare 経由でアクセスされ、オリジンは Cloudflare Origin CA の証明書（15 年、更新不要）を使用します：

1. Cloudflare ダッシュボード → **SSL/TLS → Origin Server → Create Certificate**。ホスト名に `example.com`（または `*.example.com`）、有効期間 15 年、PEM（完全なチェーン）をダウンロード。
2. オリジンにアップロード：
   - 証明書（チェーン込み）: `/etc/nginx/ssl/example.com.crt`
   - 秘密鍵: `/etc/nginx/ssl/example.com.key`（パーミッション 600）
3. Nginx をリロード：
   ```bash
   nginx -t && systemctl reload nginx
   ```
4. Cloudflare の **SSL/TLS モードを Full (strict)** に設定。`deploy/check-cert-chain.sh` でチェーン（リーフ＋Cloudflare Origin CA ルートの計 2 枚、SAN が `example.com` をカバー）を検証できます。

> 注: Origin 証明書は Cloudflare 経由のアクセスでのみ有効です。acme.sh / Let's Encrypt や更新 cron は不要です。オリジンが中国本土のクラウドサーバー（Tencent/Aliyun）にある場合は、先に ICP 備案が必要です。未備案のドメインへの HTTP/HTTPS アクセスはプロバイダーにブロックされ、Cloudflare 525 や 403 のブロックページになります。

### 6. ワンクリックデプロイ（任意）

SSH 鍵認証をローカルで設定済みなら、`deploy.ps1` が lint → build → アップロード → PM2 再起動 → GitHub コミットまで自動実行します：

```powershell
$env:NONOGRAM_SERVER="YOUR_SERVER_IP"   # 必須。リポジトリには保存されません
powershell -File deploy.ps1 "デプロイメッセージ"
```

### 7. セキュリティ

- SSH 鍵を使用し、root パスワードログインを無効化；
- HTTPS 有効化後に `SECURE_COOKIE=1` を設定；
- `server/data/app.db` を定期的にバックアップ（例: cron）；
- 中国本土で公開サービスを提供する場合は ICP 備案を完了し、ファイアウォールは 80/443 のみ開放。

## 環境変数

| 変数 | 用途 | デフォルト |
| --- | --- | --- |
| `PORT` | バックエンド待ち受けポート | `3000` |
| `DATA_DIR` | SQLite データディレクトリ | `server/data` |
| `SECURE_COOKIE` | セッション Cookie を HTTPS のみで送信 | 空 |
| `NONOGRAM_SERVER` | deploy.ps1 のデプロイ先サーバー | 必須 |
| `TEST_BASE` | E2E テストの対象 URL | `http://localhost:4173` |

## ライセンス

MIT
