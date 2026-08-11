// 网页源码抓取代理（供“URL 导入”），带 SSRF 防护。
import dns from 'node:dns/promises';
import { isIP } from 'node:net';

export const FETCH_URL_MAX_BYTES = 2 * 1024 * 1024;
export const FETCH_URL_TIMEOUT_MS = 10000;
export const FETCH_URL_MAX_REDIRECTS = 3;

/** 判断 IP 是否属于内网/回环/链路本地/保留段，是则不允许代理访问 */
const isBlockedIp = (ip) => {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 0 || a >= 224) return true; // 保留/组播/广播
    return false;
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 ULA
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10
    if (lower.startsWith('2001:db8')) return true; // 文档段
    return false;
  }
  return true;
};

const fetchUrlError = (i18nKey) => Object.assign(new Error(i18nKey), { i18nKey });

/** 校验目标 URL 协议与主机，禁止访问内网/回环地址 */
const assertSafeFetchUrl = async (url) => {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw fetchUrlError('puzzle.fetch_url_invalid');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw fetchUrlError('puzzle.fetch_url_invalid');
  }
  if (u.username || u.password) {
    throw fetchUrlError('puzzle.fetch_url_invalid');
  }

  const hostname = u.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw fetchUrlError('puzzle.fetch_url_blocked');
    return;
  }

  let addrs;
  try {
    addrs = await dns.lookup(hostname, { all: true });
  } catch {
    throw fetchUrlError('puzzle.fetch_url_failed');
  }
  if (!addrs.length || addrs.some(({ address }) => isBlockedIp(address))) {
    throw fetchUrlError('puzzle.fetch_url_blocked');
  }
};

/** 抓取网页源码（限重定向次数、限响应大小），返回 HTML 文本 */
export const fetchPageHtml = async (url) => {
  let target = url;
  for (let i = 0; i <= FETCH_URL_MAX_REDIRECTS; i++) {
    await assertSafeFetchUrl(target);
    const res = await fetch(target, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_URL_TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NonogramBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel().catch(() => {});
      target = new URL(location, target).toString();
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw fetchUrlError('puzzle.fetch_url_failed');
    }

    const reader = res.body?.getReader();
    if (!reader) throw fetchUrlError('puzzle.fetch_url_failed');
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > FETCH_URL_MAX_BYTES) {
        await reader.cancel().catch(() => {});
        throw fetchUrlError('puzzle.fetch_url_too_large');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  throw fetchUrlError('puzzle.fetch_url_failed');
};
