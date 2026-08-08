param(
  [string]$Message = ""
)

$ErrorActionPreference = 'Stop'
$SERVER = 'YOUR_SERVER_IP'
$REMOTE = "root@$SERVER"
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
scp -o BatchMode=yes server/index.js server/auth.js server/db.js server/package.json server/package-lock.json "${REMOTE}:$APP/server/"
if ($LASTEXITCODE -ne 0) { throw 'server 文件上传失败' }
ssh -o BatchMode=yes "${REMOTE}" "cd $APP/server && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1; tar -xzf /tmp/nonogram-dist.tar.gz -C $APP/dist && rm -f /tmp/nonogram-dist.tar.gz && pm2 restart nonogram-api >/dev/null 2>&1 && sleep 1 && echo SERVER_DEPLOY_OK && curl -s http://127.0.0.1:3000/api/health"
if ($LASTEXITCODE -ne 0) { throw '服务器部署失败' }
try { [System.IO.File]::Delete((Join-Path (Get-Location) 'dist.tar.gz')) } catch {}
Write-Host "服务器部署完成" -ForegroundColor Green

Write-Host "== 4/5 提交并推送 GitHub ==" -ForegroundColor Cyan
git add -A
git diff --cached --quiet
$hasChanges = ($LASTEXITCODE -ne 0)
if ($hasChanges) {
  if ([string]::IsNullOrWhiteSpace($Message)) { $Message = "deploy: $ts 自动部署" }
  git commit -m $Message
  # 绕过本地代理直连 GitHub（代理对 github.com 握手不稳定）
  git -c http.proxy= -c https.proxy= push origin main
  if ($LASTEXITCODE -ne 0) { Write-Host "GitHub 推送失败：请检查网络或代理后手动执行 git push" -ForegroundColor Yellow }
} else {
  Write-Host "没有需要提交的变更，跳过 commit/push" -ForegroundColor Yellow
}

Write-Host "== 5/5 完成 ==" -ForegroundColor Green
