import { useCallback, useRef } from 'react';
import { MAX_BOARD } from '../constants.js';
import { getLineClue } from '../logic/clues.js';
import { createGrid, cloneGrid } from '../logic/board.js';
import { translate as tr } from '../i18n/index.js';

/** 编辑模式：进入/取消/完成编辑、图片图案应用 */
export default function useEditing({
  editInputMode,
  grid,
  rowCluesStr,
  colCluesStr,
  markedRowClues,
  markedColClues,
  rows,
  cols,
  user,
  onSubmitToLibrary,
  setRows,
  setCols,
  setMode,
  setEditInputMode,
  setGrid,
  setRowCluesStr,
  setColCluesStr,
  setMarkedRowClues,
  setMarkedColClues,
  setHintInfo,
  setHoverPos,
  setIsPanelPinned,
  setShowLeftPanel,
  setLastCorrectSnapshot,
  setDeductionLevel,
  setBackupGrids,
  setAlertMsg,
}) {
  // 进入编辑模式前的盘面快照，用于“取消编辑”时还原
  const editSnapshotRef = useRef(null);

  const handleModeChange = useCallback(
    (m) => {
      setMode(m);
      setHintInfo(null);
      setHoverPos({ r: -1, c: -1 });
      if (m === 'edit') {
        // 进入编辑前快照当前盘面，供“取消编辑”还原
        editSnapshotRef.current = {
          grid: cloneGrid(grid),
          rowCluesStr: rowCluesStr.slice(),
          colCluesStr: colCluesStr.slice(),
          markedRowClues: { ...markedRowClues },
          markedColClues: { ...markedColClues },
        };
        setEditInputMode('pattern');
        // 编辑时面板必须可见可操作
        setIsPanelPinned(true);
        setShowLeftPanel(true);
      }
    },
    [grid, rowCluesStr, colCluesStr, markedRowClues, markedColClues, setMode, setHintInfo, setHoverPos, setEditInputMode, setIsPanelPinned, setShowLeftPanel],
  );

  /** 取消编辑：还原进入编辑前的盘面 */
  const cancelEditing = useCallback(() => {
    const s = editSnapshotRef.current;
    if (s) {
      setGrid(cloneGrid(s.grid));
      setRowCluesStr(s.rowCluesStr);
      setColCluesStr(s.colCluesStr);
      setMarkedRowClues(s.markedRowClues);
      setMarkedColClues(s.markedColClues);
    }
    editSnapshotRef.current = null;
    setMode('play');
    setHintInfo(null);
    setAlertMsg('');
  }, [setGrid, setRowCluesStr, setColCluesStr, setMarkedRowClues, setMarkedColClues, setMode, setHintInfo, setAlertMsg]);

  /** 完成编辑：画盘面模式自动从图案生成线索，然后回到游玩 */
  const finishEditing = useCallback(() => {
    if (editInputMode === 'pattern') {
      const hasFill = grid.some((row) => row.some((v) => v % 2 === 1));
      if (hasFill) {
        const rClues = grid.map((row) => getLineClue(row));
        const cClues = Array.from({ length: cols }, (_, c) => {
          const line = new Array(rows);
          for (let r = 0; r < rows; r++) line[r] = grid[r][c];
          return getLineClue(line);
        });
        const rStr = rClues.map((c) => c.join(' '));
        const cStr = cClues.map((c) => c.join('\n'));
        setRowCluesStr(rStr);
        setColCluesStr(cStr);
        // 自定义图案入库：登录后自动提交到共享题库（图案即答案，校验唯一解后入库）
        if (user) {
          onSubmitToLibrary({
            rows,
            cols,
            rowCluesStr: rStr,
            colCluesStr: cStr,
            grid: grid.map((row) => row.map((v) => (v % 2 === 1 ? 1 : 0))),
          });
        }
      }
      // 图案只是设计稿：完成后面板清空，让玩家从头解谜
      setGrid(createGrid(rows, cols));
    } else if (user) {
      // 手动输入线索模式：按当前线索入库（不带答案网格）
      onSubmitToLibrary({
        rows,
        cols,
        rowCluesStr,
        colCluesStr,
        grid: null,
      });
    }
    editSnapshotRef.current = null;
    setMarkedRowClues({});
    setMarkedColClues({});
    setLastCorrectSnapshot(null);
    setDeductionLevel(0);
    setBackupGrids([]);
    setMode('play');
    setHintInfo(null);
    setAlertMsg(tr('msg.customFinished'));
  }, [editInputMode, grid, rows, cols, user, onSubmitToLibrary, rowCluesStr, colCluesStr, setRowCluesStr, setColCluesStr, setGrid, setMarkedRowClues, setMarkedColClues, setLastCorrectSnapshot, setDeductionLevel, setBackupGrids, setMode, setHintInfo, setAlertMsg]);

  /** 应用图片转换出的二值图案到画盘面模式（0/1 网格） */
  const applyPatternImage = useCallback(
    (imgGrid, r, c) => {
      const validR = Math.max(1, Math.min(MAX_BOARD, r));
      const validC = Math.max(1, Math.min(MAX_BOARD, c));
      const grid2d = Array.from({ length: validR }, (_, y) => {
        const row = new Array(validC).fill(0);
        for (let x = 0; x < validC; x++) row[x] = imgGrid?.[y]?.[x] ? 1 : 0;
        return row;
      });
      setRows(validR);
      setCols(validC);
      setRowCluesStr(Array(validR).fill('0'));
      setColCluesStr(Array(validC).fill('0'));
      setGrid(grid2d);
      setMode('edit');
      setEditInputMode('pattern');
      setAlertMsg(tr('msg.imagePatternApplied'));
    },
    [setRows, setCols, setRowCluesStr, setColCluesStr, setGrid, setMode, setEditInputMode, setAlertMsg],
  );

  return { handleModeChange, cancelEditing, finishEditing, applyPatternImage };
}
