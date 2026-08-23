import { useCallback, useRef, useState } from 'react';
import { updateCell } from '../logic/board.js';
import { appendMove } from '../logic/moveHistory.js';

/** 棋盘格子的鼠标/触摸交互与操作记录（GIF 复盘数据源） */
export default function useBoardInput({
  mode,
  editInputMode,
  grid,
  interactionMode,
  currentBrush,
  deductionLevel,
  hintInfo,
  isSolvedStatus,
  setGrid,
  setHintInfo,
  setMoveHistory,
  scheduleHover,
  maybeStartTimer,
  sealed,
}) {
  const [dragAction, setDragAction] = useState(null);
  const dragBatchRef = useRef(null);
  const touchBatchRef = useRef(null);
  const touchPaintActionRef = useRef(null);

  const recordMove = useCallback(
    (type, cells) => {
      if (!cells || cells.length === 0) return;
      setMoveHistory((prev) => appendMove(prev, type, cells));
    },
    [setMoveHistory],
  );

  const flushDragBatch = useCallback(() => {
    if (dragBatchRef.current) {
      if (dragBatchRef.current.cells.length) {
        recordMove('fill', dragBatchRef.current.cells);
      }
      dragBatchRef.current = null;
    }
  }, [recordMove]);

  const flushTouchBatch = useCallback(() => {
    if (touchBatchRef.current) {
      if (touchBatchRef.current.cells.length) {
        recordMove('fill', touchBatchRef.current.cells);
      }
      touchBatchRef.current = null;
    }
  }, [recordMove]);

  const updateCellValue = useCallback(
    (r, c, val) => {
      if (hintInfo?.isError) {
        if (
          (hintInfo.type === 'cell' && hintInfo.r === r && hintInfo.c === c) ||
          (hintInfo.type === 'row' && hintInfo.index === r) ||
          (hintInfo.type === 'col' && hintInfo.index === c)
        ) {
          setHintInfo(null);
        }
      }
      setGrid((prev) => updateCell(prev, r, c, val));
      // 玩家第一次点击格子时启动计时（新盘从首击开始计时）
      if (mode === 'play' && !isSolvedStatus) {
        maybeStartTimer();
      }
      // 记录操作（仅游玩模式且未完成时）
      if (mode === 'play' && !isSolvedStatus) {
        if (dragBatchRef.current) {
          dragBatchRef.current.cells.push({ r, c, val });
        } else if (touchBatchRef.current) {
          touchBatchRef.current.cells.push({ r, c, val });
        } else {
          recordMove('fill', [{ r, c, val }]);
        }
      }
    },
    [hintInfo, mode, isSolvedStatus, setGrid, setHintInfo, maybeStartTimer, recordMove],
  );

  /** 计算某个格子的操作值（轮切/画笔，游玩与画盘面模式共用） */
  const computeCellAction = useCallback(
    (r, c) => {
      const currentVal = grid[r][c];
      const CF = deductionLevel * 2 + 1;
      const CX = deductionLevel * 2 + 2;
      if (mode === 'play') {
        if (interactionMode === 'toggle') {
          return currentVal === 0 || (currentVal !== CF && currentVal !== CX)
            ? CF
            : currentVal === CF
              ? CX
              : 0;
        }
        return currentBrush === 1 ? CF : currentBrush === 2 ? CX : 0;
      }
      // 编辑-画盘面模式
      if (interactionMode === 'toggle') {
        return currentVal === 0 ? 1 : currentVal === 1 ? 2 : 0;
      }
      return currentBrush === 1 ? 1 : currentBrush === 2 ? 2 : 0;
    },
    [mode, grid, interactionMode, currentBrush, deductionLevel],
  );

  const handleCellMouseDown = useCallback(
    (e, r, c) => {
      const editable = mode === 'play' || (mode === 'edit' && editInputMode === 'pattern');
      if (!editable || sealed) return;
      e.preventDefault();
      if (mode === 'play') {
        flushDragBatch();
      }
      let newAction = computeCellAction(r, c);
      const CX = deductionLevel * 2 + 2;
      if (e.button === 2) {
        newAction =
          mode === 'play'
            ? grid[r][c] === CX
              ? 0
              : CX
            : grid[r][c] === 2
              ? 0
              : 2;
      }
      setDragAction(newAction);
      updateCellValue(r, c, newAction);
    },
    [mode, editInputMode, sealed, computeCellAction, grid, deductionLevel, updateCellValue, flushDragBatch],
  );

  const handleCellMouseEnter = useCallback(
    (e, r, c) => {
      const editable = mode === 'play' || (mode === 'edit' && editInputMode === 'pattern');
      if (dragAction !== null && e.buttons === 0) {
        setDragAction(null);
        flushDragBatch();
      }
      scheduleHover(r, c);
      if (!editable || sealed || dragAction === null || e.buttons === 0) return;
      // 拖拽：首次进入时开启批量记录，后续格合并为一条操作
      if (!dragBatchRef.current) dragBatchRef.current = { cells: [] };
      updateCellValue(r, c, dragAction);
    },
    [dragAction, mode, editInputMode, sealed, scheduleHover, updateCellValue, flushDragBatch],
  );

  /** 触摸拖画：长按进入绘制后使用同一操作值连续填充 */
  const startTouchPaint = useCallback(
    (r, c) => {
      const editable = mode === 'play' || (mode === 'edit' && editInputMode === 'pattern');
      if (!editable || sealed) return;
      const action = computeCellAction(r, c);
      if (mode === 'play') {
        flushTouchBatch();
      }
      touchPaintActionRef.current = action;
      updateCellValue(r, c, action);
    },
    [mode, editInputMode, sealed, computeCellAction, updateCellValue, flushTouchBatch],
  );

  const continueTouchPaint = useCallback(
    (r, c) => {
      if (sealed) return;
      if (touchPaintActionRef.current != null) {
        // 长按拖动：后续格合并为一条批量记录
        if (!touchBatchRef.current) touchBatchRef.current = { cells: [] };
        updateCellValue(r, c, touchPaintActionRef.current);
      }
    },
    [sealed, updateCellValue],
  );

  const endTouchPaint = useCallback(() => {
    touchPaintActionRef.current = null;
    flushTouchBatch();
  }, [flushTouchBatch]);

  return {
    dragAction,
    setDragAction,
    recordMove,
    flushDragBatch,
    flushTouchBatch,
    handleCellMouseDown,
    handleCellMouseEnter,
    startTouchPaint,
    continueTouchPaint,
    endTouchPaint,
  };
}
