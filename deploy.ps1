param(
  [string]$Message = ""
)

$ErrorActionPreference = 'Stop'
$env:GIT_TERMINAL_PROMPT = '0'
# 服务器经本机 SSH 配置访问（~/.ssh/config 的 nonogram 别名；主机/端口/密钥只存本机，不进仓库）
$SERVER = $env:NONOGRAM_SERVER
if ([string]::IsNullOrWhiteSpace($SERVER)) {
  throw '未指定服务器别名：请先设置环境变量 NONOGRAM_SERVER（例如 $env:NONOGRAM_SERVER="nonogram"，对应 ~/.ssh/config 中的 Host）'
}
$REMOTE = $SERVER
$APP = '/opt/nonogram'
$ts = Get-Date -Format 'yyyy-MM-dd HH:mm'

Write-Host "== 1/5 lint ==" -ForegroundColor Cyan
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw 'lint 失败，终止部署' }

Write-Host "== 2/5 build ==" -ForegroundColor Cyan
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'build 失败，终止部署' }

Write-Host "== 3/5 上传到服务器 ==" -ForegroundColor Cyan
tar -czf dist.tar.gz -C dist .
scp -o BatchMode=yes -o ConnectTimeout=15 dist.tar.gz "${REMOTE}:/tmp/nonogram-dist.tar.gz"
if ($LASTEXITCODE -ne 0) { throw 'dist 上传失败' }
ssh -o BatchMode=yes -o ConnectTimeout=15 "${REMOTE}" "mkdir -p $APP/shared"
scp -o BatchMode=yes shared/puzzle-core.mjs "${REMOTE}:$APP/shared/"
if ($LASTEXITCODE -ne 0) { throw 'shared 文件上传失败' }
scp -o BatchMode=yes server/index.js server/auth.js server/db.js server/env.js server/i18n.js server/mailer.js server/puzzle-lib.js server/solve-worker.mjs server/import-puzzles.mjs server/audit-unique.mjs server/fetch-proxy.js server/trust-proxy.js server/package.json server/package-lock.json "${REMOTE}:$APP/server/"
if ($LASTEXITCODE -ne 0) { throw 'server 文件上传失败' }
ssh -o BatchMode=yes "${REMOTE}" "cd $APP/server && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1; rm -rf $APP/dist && mkdir -p $APP/dist && tar -xzf /tmp/nonogram-dist.tar.gz -C $APP/dist && rm -f /tmp/nonogram-dist.tar.gz && pm2 restart nonogram-api >/dev/null 2>&1 && sleep 1 && echo SERVER_DEPLOY_OK && curl -s http://127.0.0.1:3000/api/health"
if ($LASTEXITCODE -ne 0) { throw '服务器部署失败' }
try { [System.IO.File]::Delete((Join-Path (Get-Location) 'dist.tar.gz')) } catch {}
Write-Host "服务器部署完成" -ForegroundColor Green

Write-Host "== 4/5 提交并推送 GitHub ==" -ForegroundColor Cyan
git add AGENTS.md README.md package.json package-lock.json eslint.config.js index.html vite.config.js tailwind.config.js postcss.config.js deploy.ps1 .gitignore .brooks-lint-history.json .github deploy public shared src server tests tools docs .codex
git diff --cached --quiet
$hasChanges = ($LASTEXITCODE -ne 0)
if ($hasChanges) {
  if ([string]::IsNullOrWhiteSpace($Message)) { $Message = "deploy: $ts 自动部署" }
  git commit -m $Message
  # GitHub 网络不稳定：直连与本地代理交替重试
  $pushed = $false
  for ($i = 1; $i -le 6 -and -not $pushed; $i++) {
    if ($i % 2 -eq 1) {
      Write-Host "推送 GitHub（直连，第 $([math]::Ceiling($i / 2)) 次）..." -ForegroundColor DarkGray
      git -c http.proxy= -c https.proxy= push origin main
    } else {
      Write-Host "推送 GitHub（本地代理，第 $($i / 2) 次）..." -ForegroundColor DarkGray
      git push origin main
    }
    if ($LASTEXITCODE -eq 0) { $pushed = $true }
    else { Start-Sleep -Seconds 3 }
  }
  if (-not $pushed) { Write-Host "GitHub 推送失败：请检查网络或代理后手动执行 git push" -ForegroundColor Yellow }
} else {
  Write-Host "没有需要提交的变更，跳过 commit/push" -ForegroundColor Yellow
}

Write-Host "== 5/5 完成 ==" -ForegroundColor Green
