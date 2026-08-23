import { useCallback } from 'react';
import {
  MAX_BOARD,
  MIN_CELL_SIZE,
  MAX_CELL_SIZE,
} from '../constants.js';
import { createGrid } from '../logic/board.js';
import { api } from '../api.js';
import { translate as tr } from '../i18n/index.js';

/** 棋盘初始化/清空/随机抽题/缩放等操作 */
export default function useBoardSetup({
  mode,
  editInputMode,
  rows,
  cols,
  cellSize,
  user,
  setRows,
  setCols,
  setRowCluesStr,
  setColCluesStr,
  setGrid,
  setCellSize,
  setAlertMsg,
  setHintInfo,
  setMarkedRowClues,
  setMarkedColClues,
  setDeductionLevel,
  setBackupGrids,
  setLastCorrectSnapshot,
  setCurrentPuzzleId,
  setMoveHistory,
  resetTimer,
}) {
  const initBoard = useCallback(
    (r, c, rClues, cClues) => {
      const validR = Math.max(1, Math.min(MAX_BOARD, r));
      const validC = Math.max(1, Math.min(MAX_BOARD, c));
      setRows(validR);
      setCols(validC);
      setRowCluesStr(rClues ? rClues.map((arr) => arr.join(' ')) : Array(validR).fill('0'));
      setColCluesStr(cClues ? cClues.map((arr) => arr.join('\n')) : Array(validC).fill('0'));
      setGrid(createGrid(validR, validC));
      setAlertMsg('');
      setHintInfo(null);
      setMarkedRowClues({});
      setMarkedColClues({});
      setDeductionLevel(0);
      setBackupGrids([]);
      setLastCorrectSnapshot(null);
      setCurrentPuzzleId(null);
      setMoveHistory([]);
      resetTimer();
    },
    [
      setRows,
      setCols,
      setRowCluesStr,
      setColCluesStr,
      setGrid,
      setAlertMsg,
      setHintInfo,
      setMarkedRowClues,
      setMarkedColClues,
      setDeductionLevel,
      setBackupGrids,
      setLastCorrectSnapshot,
      setCurrentPuzzleId,
      setMoveHistory,
      resetTimer,
    ],
  );

  const clearBoard = useCallback(() => {
    setGrid(createGrid(rows, cols));
    setAlertMsg('');
    setHintInfo(null);
    setMarkedRowClues({});
    setMarkedColClues({});
    setDeductionLevel(0);
    setBackupGrids([]);
    setMoveHistory([]);
    resetTimer();
  }, [rows, cols, setGrid, setAlertMsg, setHintInfo, setMarkedRowClues, setMarkedColClues, setDeductionLevel, setBackupGrids, setMoveHistory, resetTimer]);

  const clearClues = useCallback(() => {
    setRowCluesStr(Array(rows).fill('0'));
    setColCluesStr(Array(cols).fill('0'));
    setGrid(createGrid(rows, cols));
    setAlertMsg('');
    setHintInfo(null);
    setMarkedRowClues({});
    setMarkedColClues({});
    setDeductionLevel(0);
    setBackupGrids([]);
    setLastCorrectSnapshot(null);
  }, [rows, cols, setRowCluesStr, setColCluesStr, setGrid, setAlertMsg, setHintInfo, setMarkedRowClues, setMarkedColClues, setDeductionLevel, setBackupGrids, setLastCorrectSnapshot]);

  /** 从题库浏览载入一道题 */
  const openPuzzleFromBrowse = useCallback(
    (item) => {
      initBoard(
        item.rows,
        item.cols,
        item.rowCluesStr.map((s) => s.split('.').map(Number)),
        item.colCluesStr.map((s) => s.split('.').map(Number)),
      );
      setCurrentPuzzleId(item.id);
      setAlertMsg(tr('msg.loadedFromBrowse', { cols: item.cols, rows: item.rows }));
    },
    [initBoard, setCurrentPuzzleId, setAlertMsg],
  );

  const generateRandom = useCallback(async () => {
    const isEditPattern = mode === 'edit' && editInputMode === 'pattern';
    if (!isEditPattern) {
      // 游玩模式：只从服务器题库抽唯一解题；失败不静默回退本地生成（本地题目未校验唯一解）
      try {
        const serverPuzzle = await api.randomPuzzle({
          rows,
          cols,
          excludeCompleted: user ? '1' : undefined,
        });
        initBoard(
          serverPuzzle.rows,
          serverPuzzle.cols,
          serverPuzzle.rowCluesStr.map((s) => s.split('.').map(Number)),
          serverPuzzle.colCluesStr.map((s) => s.split('.').map(Number)),
        );
        setCurrentPuzzleId(serverPuzzle.id);
        setAlertMsg(
          tr('msg.randomLoaded', {
            rows: serverPuzzle.rows,
            cols: serverPuzzle.cols,
          }),
        );
        return;
      } catch {
        setCurrentPuzzleId(null);
        setAlertMsg(tr('msg.randomUnavailable'));
        return;
      }
    }
    setCurrentPuzzleId(null);
    // 编辑-画盘面：本地随机图案作为设计稿（唯一解无要求，线索实时生成）
    const prob = 0.55;

    const randomGrid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() < prob ? 1 : 0)),
    );
    if (rows > 2 && cols > 2) {
      let changed = true;
      let loops = 0;
      while (changed && loops < 10) {
        changed = false;
        loops++;
        for (let r = 0; r < rows; r++) {
          let sum = 0;
          for (let c = 0; c < cols; c++) sum += randomGrid[r][c];
          if (sum === cols) {
            randomGrid[r][Math.floor(Math.random() * cols)] = 0;
            changed = true;
          } else if (sum === 0) {
            randomGrid[r][Math.floor(Math.random() * cols)] = 1;
            changed = true;
          }
        }
        for (let c = 0; c < cols; c++) {
          let sum = 0;
          for (let r = 0; r < rows; r++) sum += randomGrid[r][c];
          if (sum === rows) {
            randomGrid[Math.floor(Math.random() * rows)][c] = 0;
            changed = true;
          } else if (sum === 0) {
            randomGrid[Math.floor(Math.random() * rows)][c] = 1;
            changed = true;
          }
        }
      }
    }
    setGrid(randomGrid);
    setAlertMsg(tr('msg.randomPattern'));
  }, [rows, cols, initBoard, mode, editInputMode, user, setGrid, setAlertMsg, setCurrentPuzzleId]);

  const toggleMarkedRow = useCallback(
    (r, idx) => {
      if (mode === 'play') {
        setMarkedRowClues((prev) => ({ ...prev, [`${r}-${idx}`]: !prev[`${r}-${idx}`] }));
      }
    },
    [mode, setMarkedRowClues],
  );

  const toggleMarkedCol = useCallback(
    (c, idx) => {
      if (mode === 'play') {
        setMarkedColClues((prev) => ({ ...prev, [`${c}-${idx}`]: !prev[`${c}-${idx}`] }));
      }
    },
    [mode, setMarkedColClues],
  );

  const editRowClue = useCallback(
    (r, value) => {
      setRowCluesStr((prev) => {
        const next = prev.slice();
        next[r] = value;
        return next;
      });
    },
    [setRowCluesStr],
  );

  const editColClue = useCallback(
    (c, value) => {
      setColCluesStr((prev) => {
        const next = prev.slice();
        next[c] = value;
        return next;
      });
    },
    [setColCluesStr],
  );

  const zoomBoard = useCallback(
    (delta) => {
      setCellSize((prev) => Math.min(MAX_CELL_SIZE, Math.max(MIN_CELL_SIZE, prev + delta)));
    },
    [setCellSize],
  );

  const fitToWidth = useCallback(() => {
    const container = document.getElementById('board-scroll-container');
    const gridElement = document.getElementById('board-grid');
    if (container && gridElement) {
      const currentColsWidth = cols * cellSize;
      const totalGridWidth = gridElement.offsetWidth;
      const fixedWidth = totalGridWidth - currentColsWidth;
      const targetWidth = container.clientWidth - 40;
      let newCellSize = Math.floor((targetWidth - fixedWidth) / cols);
      if (newCellSize < MIN_CELL_SIZE) newCellSize = MIN_CELL_SIZE;
      if (newCellSize > MAX_CELL_SIZE) newCellSize = MAX_CELL_SIZE;
      setCellSize(newCellSize);
    }
  }, [cols, cellSize, setCellSize]);

  return {
    initBoard,
    clearBoard,
    clearClues,
    openPuzzleFromBrowse,
    generateRandom,
    toggleMarkedRow,
    toggleMarkedCol,
    editRowClue,
    editColClue,
    zoomBoard,
    fitToWidth,
  };
}
