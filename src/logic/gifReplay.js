// 游玩复盘 GIF 生成：按操作顺序重放棋盘，输出 GIF 文件数据
import { GIFEncoder, quantize, applyPalette } from 'gifenc/dist/gifenc.esm.js';

const COLORS = {
  bg: [248, 250, 252],
  gridLine: [148, 163, 184],
  gridLineStrong: [71, 85, 105],
  black: [30, 41, 59],
  cross: [226, 232, 240],
  crossMark: [100, 116, 139],
  text: [30, 41, 59],
  highlight: [245, 158, 11],
  restore: [59, 130, 246],
  deduct: [16, 185, 129],
  auto: [139, 92, 246],
};

/** 根据行/列线索估算线索区尺寸 */
const measureClueArea = (rowCluesStr, colCluesStr, cellSize, font = '11px sans-serif') => {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = font;
  const rowW = Math.max(
    26,
    ...rowCluesStr.map((s) => {
      const lines = String(s).split(/[.,\n]+/);
      return Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14;
    }),
  );
  const colH = Math.max(
    26,
    ...colCluesStr.map((s) => {
      const lines = String(s).split(/[.,\n]+/);
      return lines.length * 13 + 8;
    }),
  );
  return { clueWidth: Math.ceil(rowW), clueHeight: Math.ceil(colH) };
};

/** 绘制一帧棋盘 */
const drawFrame = (
  ctx,
  { rows, cols, rowCluesStr, colCluesStr, grid, lastCells = [], highlightType = null },
) => {
  const cellSize = ctx.canvas._cellSize;
  const { clueWidth, clueHeight } = ctx.canvas._clueArea;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  ctx.fillStyle = `rgb(${COLORS.bg.join(',')})`;
  ctx.fillRect(0, 0, W, H);

  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgb(${COLORS.text.join(',')})`;

  // 列线索
  for (let c = 0; c < cols; c++) {
    const clues = String(colCluesStr[c]).split(/[.,\n]+/).filter(Boolean);
    const x = clueWidth + c * cellSize + cellSize / 2;
    const lines = clues.length || 1;
    for (let li = 0; li < lines; li++) {
      const y = clueHeight - (lines - li) * 13 + 4;
      ctx.fillText(clues[li] || '', x, y);
    }
  }

  // 行线索
  for (let r = 0; r < rows; r++) {
    const clues = String(rowCluesStr[r]).split(/[.,\n]+/).filter(Boolean);
    const y = clueHeight + r * cellSize + cellSize / 2;
    for (let li = 0; li < clues.length; li++) {
      const x = clueWidth - (clues.length - li) * 12 - 4;
      ctx.fillText(clues[li], x, y);
    }
  }

  // 网格线
  ctx.strokeStyle = `rgb(${COLORS.gridLine.join(',')})`;
  ctx.lineWidth = 1;
  for (let c = 0; c <= cols; c++) {
    const x = clueWidth + c * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, clueHeight);
    ctx.lineTo(x, clueHeight + rows * cellSize);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    const y = clueHeight + r * cellSize;
    ctx.beginPath();
    ctx.moveTo(clueWidth, y);
    ctx.lineTo(clueWidth + cols * cellSize, y);
    ctx.stroke();
  }

  // 格子内容
  const lastMap = new Map(lastCells.map((cell) => [`${cell.r},${cell.c}`, cell]));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid?.[r]?.[c] || 0;
      const x = clueWidth + c * cellSize;
      const y = clueHeight + r * cellSize;
      const isLast = lastMap.has(`${r},${c}`);
      if (v % 2 === 1) {
        ctx.fillStyle = `rgb(${COLORS.black.join(',')})`;
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      }
      if (isLast) {
        const color = COLORS[highlightType || 'highlight'] || COLORS.highlight;
        ctx.strokeStyle = `rgb(${color.join(',')})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      }
    }
  }

  // 每 5 格粗线
  ctx.strokeStyle = `rgb(${COLORS.gridLineStrong.join(',')})`;
  ctx.lineWidth = 2;
  for (let c = 5; c < cols; c += 5) {
    const x = clueWidth + c * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, clueHeight);
    ctx.lineTo(x, clueHeight + rows * cellSize);
    ctx.stroke();
  }
  for (let r = 5; r < rows; r += 5) {
    const y = clueHeight + r * cellSize;
    ctx.beginPath();
    ctx.moveTo(clueWidth, y);
    ctx.lineTo(clueWidth + cols * cellSize, y);
    ctx.stroke();
  }
};

/**
 * 生成复盘 GIF。
 * moveHistory: [{ type: 'fill'|'restore'|'deduct'|'auto', cells: [{r,c,val}] }]
 */
export async function generateReplayGif({
  rows,
  cols,
  rowCluesStr,
  colCluesStr,
  moveHistory,
  cellSize = 22,
  delay = 500,
  onProgress,
}) {
  // 大棋盘自动缩小格子
  const maxBoardPx = 1100;
  let cs = cellSize;
  const { clueWidth: cw0, clueHeight: ch0 } = measureClueArea(rowCluesStr, colCluesStr, cs);
  if (cw0 + cols * cs > maxBoardPx || ch0 + rows * cs > maxBoardPx) {
    cs = Math.max(8, Math.floor(Math.min((maxBoardPx - cw0) / cols, (maxBoardPx - ch0) / rows)));
  }

  const { clueWidth, clueHeight } = measureClueArea(rowCluesStr, colCluesStr, cs);
  const width = clueWidth + cols * cs;
  const height = clueHeight + rows * cs;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas._cellSize = cs;
  canvas._clueArea = { clueWidth, clueHeight };
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const gif = GIFEncoder();
  let grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  let frameIndex = 0;
  let visibleMoveCount = 0;

  const pushFrame = (lastCells, highlightType) => {
    drawFrame(ctx, { rows, cols, rowCluesStr, colCluesStr, grid, lastCells, highlightType });
    const { data } = ctx.getImageData(0, 0, width, height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay });
    frameIndex++;
    onProgress?.(frameIndex, visibleMoveCount + 2);
  };

  // 初始空盘帧
  pushFrame([], null);

  // 逐步应用操作
  for (const move of moveHistory) {
    // 只保留“黑块状态发生变化”的格子（打叉等变化不显示、不生成帧）
    const visibleCells = move.cells.filter(
      ({ r, c, val }) => ((grid[r]?.[c] ?? 0) % 2 === 1) !== (val % 2 === 1),
    );
    for (const cell of move.cells) {
      if (grid[cell.r] && cell.c < cols) {
        grid[cell.r][cell.c] = cell.val;
      }
    }
    if (visibleCells.length === 0) continue;
    visibleMoveCount++;
    pushFrame(visibleCells.slice(0, 20), move.type);
  }

  // 完成帧（无高亮）
  pushFrame([], 'auto');
  gif.finish();
  return { bytes: gif.bytes(), width, height, frames: frameIndex };
}

/** 将字节数据保存为 gif 文件下载 */
export function downloadGif(bytes, filename) {
  const blob = new Blob([bytes], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filename}.gif`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
