// trust proxy 判定：本机 Nginx + Cloudflare 边缘节点。
// Cloudflare 网段可用 CLOUDFLARE_IPS 环境变量覆盖（逗号分隔 CIDR，如 "173.245.48.0/20,2400:cb00::/32"）。
import { BlockList } from 'node:net';

const DEFAULT_CLOUDFLARE_CIDRS = [
  ['173.245.48.0', 20, 'ipv4'],
  ['103.21.244.0', 22, 'ipv4'],
  ['103.22.200.0', 22, 'ipv4'],
  ['103.31.4.0', 22, 'ipv4'],
  ['141.101.64.0', 18, 'ipv4'],
  ['108.162.192.0', 18, 'ipv4'],
  ['190.93.240.0', 20, 'ipv4'],
  ['188.114.96.0', 20, 'ipv4'],
  ['197.234.240.0', 22, 'ipv4'],
  ['198.41.128.0', 17, 'ipv4'],
  ['162.158.0.0', 15, 'ipv4'],
  ['104.16.0.0', 13, 'ipv4'],
  ['104.24.0.0', 14, 'ipv4'],
  ['172.64.0.0', 13, 'ipv4'],
  ['131.0.72.0', 22, 'ipv4'],
  ['2400:cb00::', 32, 'ipv6'],
  ['2606:4700::', 32, 'ipv6'],
  ['2803:f800::', 32, 'ipv6'],
  ['2405:b500::', 32, 'ipv6'],
  ['2405:8100::', 32, 'ipv6'],
  ['2a06:98c0::', 29, 'ipv6'],
  ['2c0f:f248::', 32, 'ipv6'],
];

const parseCidr = (entry) => {
  const [ip, prefix] = entry.split('/');
  return [ip, Number(prefix), ip.includes(':') ? 'ipv6' : 'ipv4'];
};

/** 构造 trust proxy 判定函数 */
export const createTrustProxyChecker = () => {
  const list = new BlockList();
  const raw = process.env.CLOUDFLARE_IPS?.trim();
  const entries = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean).map(parseCidr)
    : DEFAULT_CLOUDFLARE_CIDRS;
  for (const [ip, prefix, family] of entries) {
    list.addSubnet(ip, prefix, family);
  }
  return (address) => {
    const normalized = address.startsWith('::ffff:') ? address.slice(7) : address;
    return normalized === '127.0.0.1' || normalized === '::1' || list.check(address);
  };
};
