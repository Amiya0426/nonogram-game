#!/usr/bin/env bash
# 在阿里云服务器上执行：安装依赖、配置 Nginx、启动 PM2
set -e

APP_DIR=/opt/nonogram

echo "===== 1. npm install (server) ====="
cd "$APP_DIR/server"
npm install --omit=dev --no-audit --no-fund

echo "===== 2. nginx ====="
cp /tmp/nonogram.conf /etc/nginx/conf.d/nonogram.conf
if [ -f /etc/nginx/conf.d/default.conf ] && [ ! -f /etc/nginx/conf.d/default.conf.bak ]; then
  mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
fi
if command -v getenforce >/dev/null && [ "$(getenforce)" = "Enforcing" ]; then
  setsebool -P httpd_can_network_connect 1 || true
fi
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx

echo "===== 3. pm2 ====="
cd "$APP_DIR/server"
pm2 delete nonogram-api >/dev/null 2>&1 || true
pm2 start index.js --name nonogram-api
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 | bash

echo "===== 4. firewall ====="
if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
fi

echo "===== 5. verify ====="
sleep 2
curl -s http://127.0.0.1:3000/api/health
echo
curl -s -o /dev/null -w "nginx http code: %{http_code}\n" http://127.0.0.1/
echo "setup done"
