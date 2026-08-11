import { useCallback } from 'react';
import {
  MAX_BOARD,
  MIN_CELL_SIZE,
  MAX_CELL_SIZE,
} from '../constants.js';
import { parseClue, getLineClue } from '../logic/clues.js';
import { createGrid, cloneGrid } from '../logic/board.js';
import { solveBoardLogic, solveLineFast } from '../logic/solver.js';
import { api } from '../api.js';
import { translate as tr } from '../i18n/index.js';

/** 棋盘级操作：初始化/清空/随机/校验/提示/自动求解/缩放等 */
export default function useGameActions({
  mode,
  editInputMode,
  rows,
  cols,
  cellSize,
  rowCluesStr,
  colCluesStr,
  grid,
  user,
  currentPuzzleId,
  lastCorrectSnapshot,
  isSolvedStatus,
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
  recordMove,
  markHandled,
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
  }, [rows, cols, setGrid, setAlertMsg, setHintInfo, setMarkedRowClues, setMarkedColClues, setDeductionLevel, setBackupGrids]);

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
    // 优先从服务器题库抽题（编辑-画盘面模式下仍使用本地随机图案）
    if (!(mode === 'edit' && editInputMode === 'pattern')) {
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
        // 服务器不可用 / 题库为空时回退本地随机生成
        setCurrentPuzzleId(null);
      }
    } else {
      setCurrentPuzzleId(null);
    }
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
    const newRowClues = randomGrid.map(getLineClue);
    const newColClues = Array.from({ length: cols }, (_, colIdx) =>
      getLineClue(randomGrid.map((row) => row[colIdx])),
    );
    // 编辑-画盘面模式下：直接把随机图案放到盘面上，线索按图案实时生成
    if (mode === 'edit' && editInputMode === 'pattern') {
      setGrid(randomGrid);
      setAlertMsg(tr('msg.randomPattern'));
      return;
    }
    initBoard(rows, cols, newRowClues, newColClues);
    setGrid(createGrid(rows, cols));
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

  const validateGrid = useCallback(() => {
    setHintInfo(null);
    setAlertMsg('');
    if (mode !== 'play') return;

    const solvedBoard = solveBoardLogic(rowCluesStr, colCluesStr, rows, cols);
    if (!solvedBoard) {
      setHintInfo({
        text: tr('msg.validateConflict'),
        type: 'error',
        isError: true,
      });
      return;
    }

    let errorFound = false;
    let errorR = -1;
    let errorC = -1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const userVal = grid[r][c];
        const solvedVal = solvedBoard[r][c];
        const isUserBlack = userVal % 2 === 1;
        const isUserCross = userVal > 0 && userVal % 2 === 0;
        if (solvedVal !== -1 && (isUserBlack || isUserCross)) {
          if ((isUserBlack && solvedVal === 0) || (isUserCross && solvedVal === 1)) {
            errorFound = true;
            errorR = r;
            errorC = c;
            break;
          }
        }
      }
      if (errorFound) break;
    }

    if (errorFound) {
      setHintInfo({
        text: tr('msg.cellConflict', { row: errorR + 1, col: errorC + 1 }),
        type: 'cell',
        r: errorR,
        c: errorC,
        isError: true,
      });
    } else {
      setLastCorrectSnapshot(cloneGrid(grid));
      if (solvedBoard.some((row) => row.includes(-1))) {
        setAlertMsg(tr('msg.checkOkMulti'));
      } else {
        setAlertMsg(tr('msg.checkOk'));
      }
    }
  }, [mode, rowCluesStr, colCluesStr, rows, cols, grid, setHintInfo, setAlertMsg, setLastCorrectSnapshot]);

  const restoreLastCorrect = useCallback(() => {
    if (lastCorrectSnapshot) {
      setGrid(cloneGrid(lastCorrectSnapshot));
      const cells = [];
      for (let rr = 0; rr < rows; rr++) {
        for (let cc = 0; cc < cols; cc++) {
          if (grid[rr][cc] !== lastCorrectSnapshot[rr][cc]) {
            cells.push({ r: rr, c: cc, val: lastCorrectSnapshot[rr][cc] });
          }
        }
      }
      if (mode === 'play' && !isSolvedStatus && cells.length) {
        recordMove('restore', cells);
      }
      setHintInfo(null);
      setAlertMsg(tr('msg.restored'));
    } else {
      setAlertMsg(tr('msg.noCheckpoint'));
    }
  }, [lastCorrectSnapshot, grid, rows, cols, mode, isSolvedStatus, recordMove, setGrid, setHintInfo, setAlertMsg]);

  const provideHint = useCallback(() => {
    setHintInfo(null);
    setAlertMsg('');
    if (isSolvedStatus) {
      setHintInfo({ text: tr('msg.solvedAlready'), type: 'success' });
      return;
    }

    const parsedRowClues = rowCluesStr.map(parseClue);
    const parsedColClues = colCluesStr.map(parseClue);
    const evaluateLine = (lineIdx, isRow) => {
      const clues = isRow ? parsedRowClues[lineIdx] : parsedColClues[lineIdx];
      const length = isRow ? cols : rows;
      const currentLine = isRow
        ? grid[lineIdx].map((v) => (v % 2 === 1 ? 1 : v > 0 ? 0 : -1))
        : grid.map((r) => r[lineIdx]).map((v) => (v % 2 === 1 ? 1 : v > 0 ? 0 : -1));

      if (currentLine.every((v) => v !== -1)) return { status: 'full' };

      const res = solveLineFast(currentLine, clues);
      if (!res) return { status: 'error' };

      let sureBlack = 0;
      let sureCross = 0;
      for (let idx = 0; idx < length; idx++) {
        if (currentLine[idx] === -1 && res.newLine[idx] !== -1) {
          if (res.newLine[idx] === 1) sureBlack++;
          else if (res.newLine[idx] === 0) sureCross++;
        }
      }
      return { status: 'ok', sureBlack, sureCross, totalNew: sureBlack + sureCross };
    };

    let bestHint = null;
    for (let r = 0; r < rows; r++) {
      const res = evaluateLine(r, true);
      if (res.status === 'error') {
        setHintInfo({
          text: tr('msg.rowConflict', { n: r + 1 }),
          type: 'row',
          index: r,
          isError: true,
        });
        return;
      }
      if (res.status === 'ok' && res.totalNew > 0) {
        if (!bestHint || res.totalNew > bestHint.totalNew) {
          bestHint = { type: 'row', index: r, ...res };
        }
      }
    }
    for (let c = 0; c < cols; c++) {
      const res = evaluateLine(c, false);
      if (res.status === 'error') {
        setHintInfo({
          text: tr('msg.colConflict', { n: c + 1 }),
          type: 'col',
          index: c,
          isError: true,
        });
        return;
      }
      if (res.status === 'ok' && res.totalNew > 0) {
        if (!bestHint || res.totalNew > bestHint.totalNew) {
          bestHint = { type: 'col', index: c, ...res };
        }
      }
    }

    if (bestHint) {
      const direction = tr(bestHint.type === 'row' ? 'msg.hintRowDir' : 'msg.hintColDir');
      const clueText =
        bestHint.type === 'row'
          ? rowCluesStr[bestHint.index]
          : colCluesStr[bestHint.index].replace(/\n/g, ' ');
      const explainStr =
        bestHint.sureBlack > 0 && bestHint.sureCross > 0
          ? tr('msg.hintBoth', { black: bestHint.sureBlack, cross: bestHint.sureCross })
          : bestHint.sureBlack > 0
            ? tr('msg.hintBlack', { black: bestHint.sureBlack })
            : tr('msg.hintCross', { cross: bestHint.sureCross });
      setHintInfo({
        text: tr('msg.hintSummary', {
          direction,
          index: bestHint.index + 1,
          clue: clueText,
          explain: explainStr,
        }),
        type: bestHint.type,
        index: bestHint.index,
        isError: false,
      });
    } else {
      setHintInfo({
        text: tr('msg.noSimpleHint'),
        type: 'info',
        isError: false,
      });
    }
  }, [isSolvedStatus, rowCluesStr, colCluesStr, rows, cols, grid, setHintInfo, setAlertMsg]);

  const autoSolve = useCallback(() => {
    setAlertMsg('');
    setHintInfo(null);
    const solvedBoard = solveBoardLogic(rowCluesStr, colCluesStr, rows, cols);
    if (!solvedBoard) {
      setAlertMsg(tr('msg.noSolution'));
      return;
    }
    const finalGrid = solvedBoard.map((row) =>
      row.map((cell) => (cell === 1 ? 1 : cell === 0 ? 2 : 0)),
    );
    const cells = [];
    finalGrid.forEach((row, rr) => row.forEach((v, cc) => cells.push({ r: rr, c: cc, val: v })));
    if (mode === 'play') recordMove('auto', cells);
    setGrid(finalGrid);
    // 一键解题不计入解题记录：标记为已处理，避免完成状态触发服务器上报
    if (currentPuzzleId) markHandled(currentPuzzleId);
    if (solvedBoard.some((row) => row.includes(-1))) {
      setAlertMsg(tr('msg.autoSolvePartial'));
    }
    setDeductionLevel(0);
    setBackupGrids([]);
  }, [rowCluesStr, colCluesStr, rows, cols, mode, recordMove, currentPuzzleId, setGrid, setAlertMsg, setHintInfo, setDeductionLevel, setBackupGrids, markHandled]);

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
    validateGrid,
    restoreLastCorrect,
    provideHint,
    autoSolve,
    zoomBoard,
    fitToWidth,
  };
}
