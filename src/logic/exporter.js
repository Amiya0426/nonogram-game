// 导出：存档代码 / JSON 文件 / 图片
import { parseClue, getLineClue, arraysEqual } from './clues.js';
import lzString from 'lz-string';

/** 本地时间格式化为 YYYY-MM-DD_HH-mm */
export const formatTimestamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
};

/** 单题导出默认文件名：2026-08-08_14-30_30x30_100% */
export const buildPuzzleExportName = ({ rows, cols, progressPercent }) =>
  `${formatTimestamp()}_${cols}x${rows}_${progressPercent}%`;

/** 收藏夹导出默认文件名：收藏夹_2026-08-08_14-30_12题 */
export const buildCollectionExportName = ({ count }) =>
  `${formatTimestamp()}_收藏夹_${count}题`;

/** 根据收藏条目计算游玩进度百分比（已完成行+列 / 总行+列） */
export const computePuzzleProgress = (item) => {
  const { rows, cols, grid, rowCluesStr, colCluesStr } = item || {};
  if (!rows || !cols || !grid || !rowCluesStr || !colCluesStr) return 0;
  let done = 0;
  const total = rows + cols;
  for (let r = 0; r < rows; r++) {
    if (arraysEqual(parseClue(rowCluesStr[r]), getLineClue(grid[r]))) done++;
  }
  for (let c = 0; c < cols; c++) {
    const line = new Array(rows);
    for (let r = 0; r < rows; r++) line[r] = grid[r][c];
    if (arraysEqual(parseClue(colCluesStr[c]), getLineClue(line))) done++;
  }
  return Math.round((done / total) * 100);
};

/** 清洗文件名中的非法字符 */
export const sanitizeFilename = (name) =>
  String(name || '')
    .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
    .trim() || 'unnamed';

export const downloadJSON = (filename, data) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filename}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

/** 逐个下载多个收藏为独立 JSON 文件（错开触发，避免被浏览器拦截） */
export const downloadItemsAsFiles = (items, buildName) => {
  items.forEach((item, i) => {
    setTimeout(() => {
      downloadJSON(buildName(item, i), item);
    }, i * 250);
  });
};

/** 将多个收藏打包为 ZIP（每个收藏一个 JSON 文件） */
export const downloadItemsAsZip = async (items, zipName, buildName) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  items.forEach((item) => {
    zip.file(`${buildName(item)}.json`, JSON.stringify(item, null, 2));
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${zipName}.zip`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

/** 收藏条目导出文件名：题目名_时间_列x行_完成度（保证 ZIP 内不重名） */
export const buildCollectionItemName = (item) =>
  `${sanitizeFilename(item.name)}_${formatTimestamp()}_${item.cols}x${item.rows}_${computePuzzleProgress(item)}%`;

export const buildExportData = (state, remark) => ({
  rows: state.rows,
  cols: state.cols,
  rowCluesStr: state.rowCluesStr,
  colCluesStr: state.colCluesStr,
  grid: state.grid,
  markedRowClues: state.markedRowClues,
  markedColClues: state.markedColClues,
  isSolvedStatus: state.isSolvedStatus,
  remark: remark.trim(),
  deductionLevel: state.deductionLevel,
  backupGrids: state.backupGrids,
});

/**
 * 生成分享用存档代码（v2 压缩格式，最精简）。
 * 网格展平为数字串、标记为空时省略，lz-string 使用 Base64 编码（比 URL 安全编码更短）。
 */
export const buildExportCode = (state, remark) => {
  const payload = {
    v: 1,
    r: state.rows,
    c: state.cols,
    a: state.rowCluesStr,
    b: state.colCluesStr,
    g: state.grid.flat().join(''),
  };
  if (
    state.markedRowClues &&
    Object.keys(state.markedRowClues).length > 0
  ) {
    payload.m = state.markedRowClues;
  }
  if (
    state.markedColClues &&
    Object.keys(state.markedColClues).length > 0
  ) {
    payload.n = state.markedColClues;
  }
  if (state.isSolvedStatus) payload.s = 1;
  if (state.deductionLevel) payload.d = state.deductionLevel;
  const remarkText = (remark || '').trim();
  if (remarkText) payload.t = remarkText;
  return `v2:${lzString.compressToBase64(JSON.stringify(payload))}`;
};

/** 解码存档代码：v2 压缩（Base64 或旧版 URL 编码）与旧版 base64(encodeURIComponent(JSON)) 均兼容 */
export const decodeExportCode = (code) => {
  const text = String(code || '').trim();
  if (text.startsWith('v2:')) {
    const t = text.slice(3);
    let json = null;
    try {
      const dec = lzString.decompressFromBase64(t);
      if (dec) json = JSON.parse(dec);
    } catch {
      // 尝试下一种格式
    }
    if (!json) {
      try {
        const dec = lzString.decompressFromEncodedURIComponent(t);
        if (dec) json = JSON.parse(dec);
      } catch {
        // 旧 v2 格式
      }
    }
    if (!json) throw new Error('存档代码已损坏');
    // 精简格式 -> 完整格式
    if (typeof json.r === 'number' && typeof json.c === 'number') {
      const g = String(json.g || '');
      const grid = [];
      for (let r = 0; r < json.r; r++) {
        grid.push(
          g
            .slice(r * json.c, (r + 1) * json.c)
            .split('')
            .map(Number),
        );
      }
      return {
        rows: json.r,
        cols: json.c,
        rowCluesStr: json.a,
        colCluesStr: json.b,
        grid,
        markedRowClues: json.m || {},
        markedColClues: json.n || {},
        isSolvedStatus: !!json.s,
        deductionLevel: json.d || 0,
        remark: json.t || '',
      };
    }
    return json;
  }
  const json = decodeURIComponent(atob(text));
  return JSON.parse(json);
};

/** 复制文本到剪贴板，返回是否成功 */
export const copyToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  return true;
};

// ---------- DPI 元数据写入（PNG pHYs / JPEG JFIF density） ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (bytes, start = 0, end = bytes.length) => {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** 在 PNG 的 IHDR 后插入 pHYs 块（单位：像素/米），写入 DPI */
const patchPngDpi = (buf, dpi) => {
  const u8 = new Uint8Array(buf);
  if (u8[0] !== 0x89 || u8[1] !== 0x50) return buf;
  const ppm = Math.round(dpi * 39.3701);
  const pHYs = new Uint8Array(4 + 4 + 9 + 4);
  const dv = new DataView(pHYs.buffer);
  dv.setUint32(0, 9);
  pHYs[4] = 0x70;
  pHYs[5] = 0x48;
  pHYs[6] = 0x59;
  pHYs[7] = 0x73; // 'pHYs'
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  pHYs[16] = 1;
  dv.setUint32(17, crc32(pHYs, 4, 17));
  const out = new Uint8Array(u8.length + pHYs.length);
  out.set(u8.subarray(0, 33), 0);
  out.set(pHYs, 33);
  out.set(u8.subarray(33), 33 + pHYs.length);
  return out.buffer;
};

/** 修改 JPEG JFIF APP0 中的 DPI（单位：点/英寸） */
const patchJpegDpi = (buf, dpi) => {
  const u8 = new Uint8Array(buf);
  if (u8[0] !== 0xff || u8[1] !== 0xd8) return buf;
  let p = 2;
  while (p + 8 < u8.length) {
    if (u8[p] !== 0xff) {
      p++;
      continue;
    }
    const marker = u8[p + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      p += 2;
      continue;
    }
    const len = (u8[p + 2] << 8) | u8[p + 3];
    if (
      marker === 0xe0 &&
      u8[p + 4] === 0x4a &&
      u8[p + 5] === 0x46 &&
      u8[p + 6] === 0x49 &&
      u8[p + 7] === 0x46
    ) {
      const copy = new Uint8Array(u8);
      copy[p + 11] = 1; // units: dots per inch
      copy[p + 12] = (dpi >> 8) & 0xff;
      copy[p + 13] = dpi & 0xff;
      copy[p + 14] = (dpi >> 8) & 0xff;
      copy[p + 15] = dpi & 0xff;
      return copy.buffer;
    }
    p += 2 + len;
  }
  return buf;
};

/**
 * 将当前盘面绘制为图片并触发下载。
 * 只绘制黑块（不打叉）；支持放大倍数 scale、JPG 压缩质量与 DPI 元数据。
 */
export const exportBoardAsImage = async (
  { grid, rows, cols, rowCluesStr, colCluesStr, markedRowClues, markedColClues, gameSettings },
  { parseClue, getAutoMarked, theme },
  { filename, remark, scale = 1, jpegQuality = 0.9, dpi = null },
  format = 'png',
) => {
  const S = Math.max(1, Math.round(scale) || 1);
  const EXPORT_CELL_SIZE = 30 * S;
  const parsedRowClues = rowCluesStr.map(parseClue);
  const parsedColClues = colCluesStr.map(parseClue);

  const maxRowClueLen = Math.max(...parsedRowClues.map((c) => c.length));
  const maxColClueLen = Math.max(...parsedColClues.map((c) => c.length));

  const CLUE_CELL_W = 22 * S;
  const CLUE_CELL_H = 22 * S;
  const leftWidth = maxRowClueLen * CLUE_CELL_W + 15 * S;
  const topHeight = maxColClueLen * CLUE_CELL_H + 15 * S;
  const boardW = cols * EXPORT_CELL_SIZE;
  const boardH = rows * EXPORT_CELL_SIZE;

  const padding = 20 * S;
  const remarkHeight = remark ? 40 * S : 0;
  const totalW = leftWidth * 2 + boardW + padding * 2;
  const totalH = topHeight * 2 + boardH + padding * 2 + remarkHeight;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, totalW, totalH);
  ctx.translate(padding, padding);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(leftWidth, topHeight, boardW, boardH);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = leftWidth + c * EXPORT_CELL_SIZE;
      const y = topHeight + r * EXPORT_CELL_SIZE;
      const v = grid[r][c];

      if (v % 2 === 1) {
        // 只画黑块（含推演色），不打叉
        let fillStyle = theme.fill;
        if (v === 3) fillStyle = '#d946ef';
        if (v === 5) fillStyle = '#3b82f6';
        if (v === 7) fillStyle = '#f59e0b';
        ctx.fillStyle = fillStyle;
        ctx.fillRect(x, y, EXPORT_CELL_SIZE, EXPORT_CELL_SIZE);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, EXPORT_CELL_SIZE, EXPORT_CELL_SIZE);
      }

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = S;
      ctx.strokeRect(x, y, EXPORT_CELL_SIZE, EXPORT_CELL_SIZE);

      if (c % 5 === 4 && c !== cols - 1) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + EXPORT_CELL_SIZE - S, y, 2 * S, EXPORT_CELL_SIZE);
      }
      if (r % 5 === 4 && r !== rows - 1) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y + EXPORT_CELL_SIZE - S, EXPORT_CELL_SIZE, 2 * S);
      }
    }
  }

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2 * S;
  ctx.strokeRect(leftWidth, topHeight, boardW, boardH);

  ctx.font = `bold ${16 * S}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let c = 0; c < cols; c++) {
    const clues = parsedColClues[c];
    const colLine = grid.map((row) => row[c]);
    const autoMarkedCol = gameSettings.autoMarkNumbers
      ? getAutoMarked(colLine, clues).marked
      : [];
    const x = leftWidth + c * EXPORT_CELL_SIZE + EXPORT_CELL_SIZE / 2;

    for (let i = 0; i < clues.length; i++) {
      if (clues[i] === 0) continue;
      ctx.fillStyle =
        markedColClues[`${c}-${i}`] || autoMarkedCol[i] ? theme.marked : '#1e293b';
      ctx.fillText(clues[i], x, topHeight - 10 * S - (clues.length - 1 - i) * CLUE_CELL_H);
      ctx.fillText(clues[i], x, topHeight + boardH + 10 * S + i * CLUE_CELL_H);
    }
  }

  for (let r = 0; r < rows; r++) {
    const clues = parsedRowClues[r];
    const rowLine = grid[r];
    const autoMarkedRow = gameSettings.autoMarkNumbers
      ? getAutoMarked(rowLine, clues).marked
      : [];
    const y = topHeight + r * EXPORT_CELL_SIZE + EXPORT_CELL_SIZE / 2 + S;

    for (let i = 0; i < clues.length; i++) {
      if (clues[i] === 0) continue;
      ctx.fillStyle =
        markedRowClues[`${r}-${i}`] || autoMarkedRow[i] ? theme.marked : '#1e293b';
      ctx.fillText(clues[i], leftWidth - 15 * S - (clues.length - 1 - i) * CLUE_CELL_W, y);
      ctx.fillText(clues[i], leftWidth + boardW + 15 * S + i * CLUE_CELL_W, y);
    }
  }

  if (remark) {
    ctx.fillStyle = '#64748b';
    ctx.font = `bold ${18 * S}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(remark, (leftWidth * 2 + boardW) / 2, topHeight * 2 + boardH + 20 * S);
  }

  const mime = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, mime, format === 'jpeg' ? jpegQuality : undefined);
  });
  let finalBlob = blob;
  if (dpi && blob) {
    const buf = await blob.arrayBuffer();
    finalBlob = new Blob(
      [format === 'jpeg' ? patchJpegDpi(buf, dpi) : patchPngDpi(buf, dpi)],
      { type: mime },
    );
  }
  const url = URL.createObjectURL(finalBlob);
  const link = document.createElement('a');
  link.download = `${filename}.${format === 'jpeg' ? 'jpg' : format}`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};
