/**
 * 批量转换旧版导出文件为当前收藏夹格式，并按新命名规则改名。
 *
 * 用法：
 *   node tools/convert-old-exports.mjs [源目录] [输出目录]
 * 默认源目录：../game（本仓库的兄弟目录），默认输出：源目录/converted
 *
 * 兼容的旧格式：
 *   1. 单对象：{ rows, cols, rowCluesStr, colCluesStr, grid, ... }
 *   2. 数组包裹：[{ ...同上... }]（旧版收藏夹导出）
 * 输出统一为当前收藏条目：{ name, date, rows, cols, rowCluesStr, colCluesStr,
 *   grid, markedRowClues, markedColClues, isSolvedStatus, deductionLevel, backupGrids }
 * 文件名：名称_时间_列x行_完成度%.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePuzzleData } from '../src/logic/importer.js';
import { computePuzzleProgress, sanitizeFilename } from '../src/logic/exporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'game'));
const OUT = path.resolve(process.argv[3] || path.join(SRC, 'converted'));

const p = (n) => String(n).padStart(2, '0');
const fmtFileTime = (d) =>
  `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
const fmtItemDate = (d) =>
  `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;

/** 解析旧 date 字段（如 2026/6/26 16:23:00） */
const parseItemDate = (s) => {
  if (!s) return null;
  const m = String(s).match(
    /(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    return isNaN(d) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

/** 从文件名提取毫秒时间戳（旧文件形如 xxx-1782107601828.json） */
const tsFromName = (name) => {
  const m = name.match(/(\d{13})/);
  return m ? new Date(Number(m[1])) : null;
};

const normalizeItem = (raw, sourceName, stat) => {
  const data = normalizePuzzleData(raw);
  const name =
    typeof data.name === 'string' && data.name.trim()
      ? data.name.trim()
      : sourceName.replace(/\.json$/i, '').replace(/-\d{13}$/i, '').trim() || '导入题目';
  const date =
    parseItemDate(data.date) ||
    tsFromName(sourceName) ||
    stat.mtime;
  const item = {
    name,
    rows: data.rows,
    cols: data.cols,
    rowCluesStr: data.rowCluesStr,
    colCluesStr: data.colCluesStr,
    grid: data.grid,
    markedRowClues: data.markedRowClues || {},
    markedColClues: data.markedColClues || {},
    isSolvedStatus: !!data.isSolvedStatus,
    deductionLevel: data.deductionLevel || 0,
    backupGrids: data.backupGrids || [],
  };
  return { item: { ...item, date: fmtItemDate(date) }, date };
};

if (!fs.existsSync(SRC)) {
  console.error(`源目录不存在: ${SRC}`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const files = fs
  .readdirSync(SRC)
  .filter((f) => f.toLowerCase().endsWith('.json'));
if (!files.length) {
  console.error('源目录中没有 JSON 文件');
  process.exit(1);
}

const usedNames = new Set();
let converted = 0;
let skipped = 0;

for (const file of files) {
  const full = path.join(SRC, file);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    console.warn(`跳过（无法解析 JSON）: ${file}`);
    skipped++;
    continue;
  }

  const list = Array.isArray(raw) ? raw : [raw];
  for (const item of list) {
    try {
      const { item: normalized, date } = normalizeItem(item, file, fs.statSync(full));
      const progress = computePuzzleProgress(normalized);
      let base = `${sanitizeFilename(normalized.name)}_${fmtFileTime(date)}_${normalized.cols}x${normalized.rows}_${progress}%`;
      let outName = `${base}.json`;
      let i = 2;
      while (usedNames.has(outName)) {
        outName = `${base}_${i}.json`;
        i++;
      }
      usedNames.add(outName);
      fs.writeFileSync(path.join(OUT, outName), JSON.stringify(normalized, null, 2), 'utf8');
      console.log(`已转换: ${file} -> ${outName}`);
      converted++;
    } catch (e) {
      console.warn(`跳过（内容不完整）: ${file} (${e.message})`);
      skipped++;
    }
  }
}

console.log(`\n完成：转换 ${converted} 个，跳过 ${skipped} 个`);
console.log(`输出目录: ${OUT}`);
