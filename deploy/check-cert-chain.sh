#!/bin/bash
# 检查 Cloudflare Origin 证书链内容（叶子 + Cloudflare Origin CA 根）
CRT=/etc/nginx/ssl/nonogram.amiya1223.top.crt
echo "=== 证书文件包含证书数量（应为 2：叶子 + Cloudflare Origin CA 根）==="
grep -c "BEGIN CERTIFICATE" "$CRT"
echo ""
echo "=== 逐个证书 subject / issuer ==="
csplit -z -f /tmp/nono-cert- "$CRT" '/-----BEGIN CERTIFICATE-----/' '{*}' >/dev/null 2>&1
for f in /tmp/nono-cert-*; do
  echo "--- $f ---"
  openssl x509 -in "$f" -noout -subject -issuer
done
rm -f /tmp/nono-cert-*
echo ""
echo "=== 叶子证书 SAN（应包含 nonogram.amiya1223.top）==="
openssl x509 -in "$CRT" -noout -ext subjectAltName | head -3
echo ""
echo "=== nginx 实际发送的链（本机 s_client） ==="
echo | openssl s_client -connect 127.0.0.1:443 -servername nonogram.amiya1223.top -showcerts 2>/dev/null | grep -c "BEGIN CERTIFICATE"
