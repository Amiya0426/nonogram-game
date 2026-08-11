import { useCallback, useMemo } from 'react';
import {
  parseClue,
  getLineClue,
  arraysEqual,
  getAutoMarked,
  getInsertIdx,
  getSmartInsertIdx,
} from '../logic/clues.js';

/** 纯派生分析：线索/完成度/悬浮提示等（只读棋盘状态） */
export default function useAnalysis({
  rows,
  cols,
  rowCluesStr,
  colCluesStr,
  grid,
  markedRowClues,
  markedColClues,
  gameSettings,
  mode,
  editInputMode,
  hoverPos,
  measureStart,
  cellSize,
}) {
  // 线索与盘面状态分析（缓存，供渲染与胜负判定复用）
  const lineAnalysis = useMemo(() => {
    const rowArr = new Array(rows);
    for (let r = 0; r < rows; r++) {
      const parsed = parseClue(rowCluesStr[r]);
      const line = grid[r];
      const autoMarked = gameSettings.autoMarkNumbers
        ? getAutoMarked(line, parsed).marked
        : [];
      const markedFlags = parsed.map(
        (_, i) => !!markedRowClues[`${r}-${i}`] || !!autoMarked[i],
      );
      const sum = parsed.reduce((acc, num, i) => acc + (markedFlags[i] ? 0 : num), 0);
      rowArr[r] = {
        parsed,
        completed: arraysEqual(parsed, getLineClue(line)),
        autoMarked,
        markedFlags,
        sum,
      };
    }

    const colArr = new Array(cols);
    for (let c = 0; c < cols; c++) {
      const parsed = parseClue(colCluesStr[c]);
      const line = new Array(rows);
      for (let r = 0; r < rows; r++) line[r] = grid[r][c];
      const autoMarked = gameSettings.autoMarkNumbers
        ? getAutoMarked(line, parsed).marked
        : [];
      const markedFlags = parsed.map(
        (_, i) => !!markedColClues[`${c}-${i}`] || !!autoMarked[i],
      );
      const sum = parsed.reduce((acc, num, i) => acc + (markedFlags[i] ? 0 : num), 0);
      colArr[c] = {
        parsed,
        completed: arraysEqual(parsed, getLineClue(line)),
        autoMarked,
        markedFlags,
        sum,
      };
    }
    return { rows: rowArr, cols: colArr };
  }, [
    grid,
    rows,
    cols,
    rowCluesStr,
    colCluesStr,
    markedRowClues,
    markedColClues,
    gameSettings.autoMarkNumbers,
  ]);

  const isSolvedStatus = useMemo(() => {
    if (mode !== 'play') return false;
    for (let i = 0; i < rows; i++) {
      if (!lineAnalysis.rows[i].completed) return false;
    }
    for (let i = 0; i < cols; i++) {
      if (!lineAnalysis.cols[i].completed) return false;
    }
    return true;
  }, [mode, rows, cols, lineAnalysis]);

  /** 游玩进度：已完成行+列占全部行+列的百分比（用于导出文件名） */
  const progressPercent = useMemo(() => {
    if (mode !== 'play' || rows + cols === 0) return 0;
    let done = 0;
    for (let i = 0; i < rows; i++) {
      if (lineAnalysis.rows[i].completed) done++;
    }
    for (let i = 0; i < cols; i++) {
      if (lineAnalysis.cols[i].completed) done++;
    }
    return Math.round((done / (rows + cols)) * 100);
  }, [mode, rows, cols, lineAnalysis]);

  const getClueTextSize = useCallback(() => {
    if (cellSize < 20) return 'text-[11px]';
    if (cellSize < 28) return 'text-sm';
    if (cellSize < 40) return 'text-base';
    return 'text-lg';
  }, [cellSize]);

  const showMeasure = mode === 'play' && measureStart && hoverPos.r !== -1 && hoverPos.c !== -1;
  const showHoverRow = mode === 'play' && gameSettings.hoverRowClues && hoverPos.r !== -1;
  const showHoverCol = mode === 'play' && gameSettings.hoverColClues && hoverPos.c !== -1;

  /** 编辑-画盘面模式：根据当前图案实时推导的行/列线索预览 */
  const derivedClues = useMemo(() => {
    if (mode !== 'edit' || editInputMode !== 'pattern') return null;
    const rowsArr = new Array(rows);
    for (let r = 0; r < rows; r++) rowsArr[r] = getLineClue(grid[r]);
    const colsArr = new Array(cols);
    for (let c = 0; c < cols; c++) {
      const line = new Array(rows);
      for (let r = 0; r < rows; r++) line[r] = grid[r][c];
      colsArr[c] = getLineClue(line);
    }
    return { rows: rowsArr, cols: colsArr };
  }, [mode, editInputMode, grid, rows, cols]);

  const hoverTooltipData = useMemo(() => {
    let row = null;
    let col = null;

    if (showHoverRow && hoverPos.r >= 0 && hoverPos.r < rows) {
      const parsed = parseClue(rowCluesStr[hoverPos.r]);
      const rowLine = grid[hoverPos.r] || [];
      const autoRes = gameSettings.autoMarkNumbers
        ? getAutoMarked(rowLine, parsed)
        : { marked: [], assignedBlocks: [] };
      const rawIdx = getInsertIdx(cols, parsed, hoverPos.c, autoRes.assignedBlocks);
      const combinedMarked = parsed.map(
        (_, i) => markedRowClues[`${hoverPos.r}-${i}`] || autoRes.marked[i],
      );
      row = {
        parsed,
        autoMarked: autoRes.marked,
        insertIdx: getSmartInsertIdx(rawIdx, combinedMarked),
      };
    }

    if (showHoverCol && hoverPos.c >= 0 && hoverPos.c < cols) {
      const parsed = parseClue(colCluesStr[hoverPos.c]);
      const colLine = new Array(rows);
      for (let r = 0; r < rows; r++) colLine[r] = grid[r][hoverPos.c];
      const autoRes = gameSettings.autoMarkNumbers
        ? getAutoMarked(colLine, parsed)
        : { marked: [], assignedBlocks: [] };
      const rawIdx = getInsertIdx(rows, parsed, hoverPos.r, autoRes.assignedBlocks);
      const combinedMarked = parsed.map(
        (_, i) => markedColClues[`${hoverPos.c}-${i}`] || autoRes.marked[i],
      );
      col = {
        parsed,
        autoMarked: autoRes.marked,
        insertIdx: getSmartInsertIdx(rawIdx, combinedMarked),
      };
    }

    return { row, col };
  }, [
    showHoverRow,
    showHoverCol,
    hoverPos.r,
    hoverPos.c,
    rows,
    cols,
    rowCluesStr,
    colCluesStr,
    grid,
    markedRowClues,
    markedColClues,
    gameSettings.autoMarkNumbers,
  ]);

  return {
    lineAnalysis,
    isSolvedStatus,
    progressPercent,
    derivedClues,
    hoverTooltipData,
    showMeasure,
    showHoverRow,
    showHoverCol,
    clueTextSize: getClueTextSize(),
  };
}
