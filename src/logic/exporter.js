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
 * 生成分享用存档代码（v2 压缩格式）。
 * 只保留可恢复盘面的核心数据（去掉备份盘与复盘记录），显著缩短分享代码。
 */
export const buildExportCode = (state, remark) => {
  const payload = {
    rows: state.rows,
    cols: state.cols,
    rowCluesStr: state.rowCluesStr,
    colCluesStr: state.colCluesStr,
    grid: state.grid,
    markedRowClues: state.markedRowClues,
    markedColClues: state.markedColClues,
    isSolvedStatus: state.isSolvedStatus,
    remark: (remark || '').trim(),
    deductionLevel: state.deductionLevel || 0,
  };
  return `v2:${lzString.compressToEncodedURIComponent(JSON.stringify(payload))}`;
};

/** 解码存档代码：优先 v2 压缩格式，兼容旧版 base64(encodeURIComponent(JSON)) 格式 */
export const decodeExportCode = (code) => {
  const text = String(code || '').trim();
  if (text.startsWith('v2:')) {
    const json = lzString.decompressFromEncodedURIComponent(text.slice(3));
    if (!json) throw new Error('存档代码已损坏');
    return JSON.parse(json);
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

/**
 * 将当前盘面绘制为图片并触发下载。
 * 依赖注入 parseClue / getAutoMarked，避免与 React 状态耦合。
 */
export const exportBoardAsImage = (
  { grid, rows, cols, rowCluesStr, colCluesStr, markedRowClues, markedColClues, gameSettings },
  { parseClue, getAutoMarked, theme },
  { filename, remark },
  format = 'png',
) => {
  const EXPORT_CELL_SIZE = 30;
  const parsedRowClues = rowCluesStr.map(parseClue);
  const parsedColClues = colCluesStr.map(parseClue);

  const maxRowClueLen = Math.max(...parsedRowClues.map((c) => c.length));
  const maxColClueLen = Math.max(...parsedColClues.map((c) => c.length));

  const CLUE_CELL_W = 22;
  const CLUE_CELL_H = 22;
  const leftWidth = maxRowClueLen * CLUE_CELL_W + 15;
  const topHeight = maxColClueLen * CLUE_CELL_H + 15;
  const boardW = cols * EXPORT_CELL_SIZE;
  const boardH = rows * EXPORT_CELL_SIZE;

  const padding = 20;
  const remarkHeight = remark ? 40 : 0;
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
        let fillStyle = theme.fill;
        if (v === 3) fillStyle = '#d946ef';
        if (v === 5) fillStyle = '#3b82f6';
        if (v === 7) fillStyle = '#f59e0b';
        ctx.fillStyle = fillStyle;
        ctx.fillRect(x, y, EXPORT_CELL_SIZE, EXPORT_CELL_SIZE);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, EXPORT_CELL_SIZE, EXPORT_CELL_SIZE);
        if (v > 0 && v % 2 === 0) {
          let strokeStyle = theme.cross;
          if (v === 4) strokeStyle = '#d946ef';
          if (v === 6) strokeStyle = '#3b82f6';
          if (v === 8) strokeStyle = '#f59e0b';
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.moveTo(x + EXPORT_CELL_SIZE * 0.2, y + EXPORT_CELL_SIZE * 0.2);
          ctx.lineTo(x + EXPORT_CELL_SIZE * 0.8, y + EXPORT_CELL_SIZE * 0.8);
          ctx.moveTo(x + EXPORT_CELL_SIZE * 0.8, y + EXPORT_CELL_SIZE * 0.2);
          ctx.lineTo(x + EXPORT_CELL_SIZE * 0.2, y + EXPORT_CELL_SIZE * 0.8);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, EXPORT_CELL_SIZE, EXPORT_CELL_SIZE);

      if (c % 5 === 4 && c !== cols - 1) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + EXPORT_CELL_SIZE - 1, y, 2, EXPORT_CELL_SIZE);
      }
      if (r % 5 === 4 && r !== rows - 1) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y + EXPORT_CELL_SIZE - 1, EXPORT_CELL_SIZE, 2);
      }
    }
  }

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(leftWidth, topHeight, boardW, boardH);

  ctx.font = 'bold 16px sans-serif';
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
      ctx.fillText(clues[i], x, topHeight - 10 - (clues.length - 1 - i) * CLUE_CELL_H);
      ctx.fillText(clues[i], x, topHeight + boardH + 10 + i * CLUE_CELL_H);
    }
  }

  for (let r = 0; r < rows; r++) {
    const clues = parsedRowClues[r];
    const rowLine = grid[r];
    const autoMarkedRow = gameSettings.autoMarkNumbers
      ? getAutoMarked(rowLine, clues).marked
      : [];
    const y = topHeight + r * EXPORT_CELL_SIZE + EXPORT_CELL_SIZE / 2 + 1;

    for (let i = 0; i < clues.length; i++) {
      if (clues[i] === 0) continue;
      ctx.fillStyle =
        markedRowClues[`${r}-${i}`] || autoMarkedRow[i] ? theme.marked : '#1e293b';
      ctx.fillText(clues[i], leftWidth - 15 - (clues.length - 1 - i) * CLUE_CELL_W, y);
      ctx.fillText(clues[i], leftWidth + boardW + 15 + i * CLUE_CELL_W, y);
    }
  }

  if (remark) {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(remark, (leftWidth * 2 + boardW) / 2, topHeight * 2 + boardH + 20);
  }

  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = canvas.toDataURL(`image/${format}`, 0.9);
  link.click();
};
