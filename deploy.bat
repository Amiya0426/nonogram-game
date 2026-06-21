@echo off
chcp 65001 >nul
cd /d %~dp0

echo.
set /p msg=请输入 commit 信息:

echo.
echo 正在提交代码...
git add .
git commit -m "%msg%"

echo.
echo 正在推送到 GitHub...
git push

echo.
echo 正在部署到 GitHub Pages...
npm run deploy

echo.
echo 完成！
pause
