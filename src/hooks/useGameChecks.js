import { useCallback } from 'react';
import { parseClue } from '../logic/clues.js';
import { cloneGrid } from '../logic/board.js';
import { solveBoardLogic, solveLineFast, solveBoard } from '../logic/solver.js';
import { translate as tr } from '../i18n/index.js';

/** 校验 / 恢复检查点 / 提示 / 自动求解 */
export default function useGameChecks({
  mode,
  rows,
  cols,
  rowCluesStr,
  colCluesStr,
  grid,
  currentPuzzleId,
  lastCorrectSnapshot,
  isSolvedStatus,
  setGrid,
  setAlertMsg,
  setHintInfo,
  setLastCorrectSnapshot,
  setDeductionLevel,
  setBackupGrids,
  recordMove,
  markHandled,
  sealed,
}) {
  const validateGrid = useCallback(() => {
    if (sealed) return;
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
  }, [sealed, mode, rowCluesStr, colCluesStr, rows, cols, grid, setHintInfo, setAlertMsg, setLastCorrectSnapshot]);

  const restoreLastCorrect = useCallback(() => {
    if (sealed) return;
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
  }, [sealed, lastCorrectSnapshot, grid, rows, cols, mode, isSolvedStatus, recordMove, setGrid, setHintInfo, setAlertMsg]);

  const provideHint = useCallback(() => {
    if (sealed) return;
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
  }, [sealed, isSolvedStatus, rowCluesStr, colCluesStr, rows, cols, grid, setHintInfo, setAlertMsg]);

  const autoSolve = useCallback(() => {
    if (sealed) return;
    setAlertMsg('');
    setHintInfo(null);
    // 完整求解：先逻辑传播，推不动时 DFS 回溯补齐（带超时/节点上限）
    const res = solveBoard(
      rowCluesStr.map(parseClue),
      colCluesStr.map(parseClue),
      rows,
      cols,
      { maxIterations: 200, timeoutMs: 4000, nodeLimit: 500000 },
    );
    if (!res) {
      setAlertMsg(tr('msg.noSolution'));
      return;
    }
    const finalGrid = res.board.map((row) =>
      row.map((cell) => (cell === 1 ? 1 : cell === 0 ? 2 : 0)),
    );
    const cells = [];
    finalGrid.forEach((row, rr) => row.forEach((v, cc) => cells.push({ r: rr, c: cc, val: v })));
    if (mode === 'play') recordMove('auto', cells);
    setGrid(finalGrid);
    // 一键解题不计入解题记录：标记为已处理，避免完成状态触发服务器上报
    if (currentPuzzleId) markHandled(currentPuzzleId);
    if (!res.complete) {
      setAlertMsg(tr('msg.autoSolvePartial'));
    }
    setDeductionLevel(0);
    setBackupGrids([]);
  }, [sealed, rowCluesStr, colCluesStr, rows, cols, mode, recordMove, currentPuzzleId, setGrid, setAlertMsg, setHintInfo, setDeductionLevel, setBackupGrids, markHandled]);

  return { validateGrid, restoreLastCorrect, provideHint, autoSolve };
}
