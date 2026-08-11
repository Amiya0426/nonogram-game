import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 轻量 .env 加载：仅补充进程环境中缺失的变量（已有环境变量优先），
// 用于存放 RESEND_API_KEY 等敏感配置，避免写入仓库。
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  const text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {
  // 没有 .env 时忽略（开发/测试环境可直接用进程环境变量）
}
