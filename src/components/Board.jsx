import { Fragment, useEffect, useRef } from 'react';
import GridCell from './GridCell.jsx';
import RowClueBar from './RowClueBar.jsx';
import ColClueBar from './ColClueBar.jsx';
import {
  getBorderColorClass,
  getContainerBgClass,
  getBorderBaseClass,
} from '../logic/theme.js';

/**
 * 棋盘：CSS Grid 布局，格子通过事件委托绑定鼠标事件，
 * 行/列线索条与格子均为 memo 化组件。
 */
const Board = ({
  grid,
  rows,
  cols,
  cellSize,
  mode,
  editInputMode,
  deductionLevel,
  rowCluesStr,
  colCluesStr,
  lineAnalysis,
  derivedClues,
  hoverPos,
  measureStart,
  hintInfo,
  gameSettings,
  clueTextSize,
  onCellMouseDown,
  onCellMouseEnter,
  startTouchPaint,
  continueTouchPaint,
  endTouchPaint,
  onToggleMarkedRow,
  onToggleMarkedCol,
  onEditRowClue,
  onEditColClue,
  onMouseLeave,
  onZoom,
}) => {
  const lastHoverKeyRef = useRef('');
  const gridRef = useRef(null);
  const scrollRef = useRef(null);
  const editable = mode === 'play' || (mode === 'edit' && editInputMode === 'pattern');
  const showDualSideClues = gameSettings.showDualSideClues;

  // Ctrl + 滚轮缩放棋盘（原生监听，确保 preventDefault 生效）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onZoom?.(e.deltaY < 0 ? 2 : -2);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onZoom]);

  // 触摸拖画：长按进入绘制，快速滑动保持原生滚动
  const editableRef = useRef(editable);
  const startPaintRef = useRef(startTouchPaint);
  const continuePaintRef = useRef(continueTouchPaint);
  const endPaintRef = useRef(endTouchPaint);
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);
  useEffect(() => {
    startPaintRef.current = startTouchPaint;
  }, [startTouchPaint]);
  useEffect(() => {
    continuePaintRef.current = continueTouchPaint;
  }, [continueTouchPaint]);
  useEffect(() => {
    endPaintRef.current = endTouchPaint;
  }, [endTouchPaint]);

  useEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    let paintTimer = null;
    let startX = 0;
    let startY = 0;
    let painting = false;
    let startCell = null;

    const findCell = (el) => el?.closest?.('[data-cell]');

    const onTouchStart = (e) => {
      if (!editableRef.current) return;
      const cell = findCell(e.target);
      if (!cell) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startCell = { r: +cell.dataset.r, c: +cell.dataset.c };
      painting = false;
      clearTimeout(paintTimer);
      paintTimer = setTimeout(() => {
        if (!editableRef.current) return;
        painting = true;
        if (navigator.vibrate) navigator.vibrate(15);
        startPaintRef.current(startCell.r, startCell.c);
      }, 220);
    };

    const onTouchMove = (e) => {
      if (!painting) {
        // 手指快速移动：视为滑动画面，取消长按绘制
        const touch = e.touches[0];
        const moved =
          Math.abs(touch.clientX - startX) + Math.abs(touch.clientY - startY) > 12;
        if (moved) clearTimeout(paintTimer);
        return;
      }
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = findCell(el);
      if (!cell) return;
      continuePaintRef.current(+cell.dataset.r, +cell.dataset.c);
    };

    const onTouchEnd = (e) => {
      clearTimeout(paintTimer);
      // 长按绘制结束时阻止合成鼠标事件，避免重复触发一次点击
      if (painting) e.preventDefault();
      painting = false;
      startCell = null;
      endPaintRef.current();
    };

    gridEl.addEventListener('touchstart', onTouchStart, { passive: true });
    gridEl.addEventListener('touchmove', onTouchMove, { passive: false });
    gridEl.addEventListener('touchend', onTouchEnd, { passive: false });
    gridEl.addEventListener('touchcancel', onTouchEnd, { passive: false });
    return () => {
      clearTimeout(paintTimer);
      gridEl.removeEventListener('touchstart', onTouchStart);
      gridEl.removeEventListener('touchmove', onTouchMove);
      gridEl.removeEventListener('touchend', onTouchEnd);
      gridEl.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const handleMouseOver = (e) => {
    const cell = e.target.closest?.('[data-cell]');
    if (!cell) return;
    const key = `${cell.dataset.r},${cell.dataset.c}`;
    if (key === lastHoverKeyRef.current) return;
    lastHoverKeyRef.current = key;
    onCellMouseEnter(e, +cell.dataset.r, +cell.dataset.c);
  };

  const handleMouseDown = (e) => {
    const cell = e.target.closest?.('[data-cell]');
    if (!cell) return;
    onCellMouseDown(e, +cell.dataset.r, +cell.dataset.c);
  };

  const measureRect =
    mode === 'play' && measureStart && hoverPos.r !== -1 && hoverPos.c !== -1
      ? {
          minR: Math.min(measureStart.r, hoverPos.r),
          maxR: Math.max(measureStart.r, hoverPos.r),
          minC: Math.min(measureStart.c, hoverPos.c),
          maxC: Math.max(measureStart.c, hoverPos.c),
        }
      : null;

  const renderTopClues = (position) =>
    lineAnalysis.cols.map((info, c) => (
      <ColClueBar
        key={`col-clue-${position}-${c}`}
        c={c}
        position={position}
        mode={mode}
        editInputMode={editInputMode}
        clueTextSize={clueTextSize}
        parsed={info.parsed}
        previewClues={derivedClues?.cols[c]}
        completed={mode === 'play' && info.completed}
        isHovered={mode === 'play' && hoverPos.c === c}
        isHintCol={
          (hintInfo?.type === 'col' && hintInfo.index === c) ||
          (hintInfo?.type === 'cell' && hintInfo.c === c)
        }
        hintError={!!hintInfo?.isError}
        deductionLevel={deductionLevel}
        markedFlags={info.markedFlags}
        sum={info.sum}
        showClueSums={gameSettings.showClueSums}
        completeLineStyle={gameSettings.completeLineStyle}
        editValue={colCluesStr[c]}
        onEditClue={onEditColClue}
        onClueMouseDown={onToggleMarkedCol}
        hasRightBorder={c % 5 === 4 && c !== cols - 1}
      />
    ));

  return (
    <div
      id="board-scroll-container"
      ref={scrollRef}
      className={`flex-1 overflow-auto p-4 md:p-8 flex ${getContainerBgClass(deductionLevel)}`}
      onMouseLeave={onMouseLeave}
    >
      <div className="m-auto relative">
        <div
          id="board-grid"
          ref={gridRef}
          className={`grid gap-[1px] bg-slate-400 border-2 relative transition-colors ${getBorderColorClass(deductionLevel)}`}
          style={{
            gridTemplateColumns: showDualSideClues
              ? `auto repeat(${cols}, ${cellSize}px) auto`
              : `auto repeat(${cols}, ${cellSize}px)`,
          }}
          onContextMenu={(e) => e.preventDefault()}
          onMouseOver={handleMouseOver}
          onMouseDown={handleMouseDown}
          onMouseLeave={onMouseLeave}
        >
          {/* 第一行：顶部列线索 */}
          <div className={`bg-white border-r-2 border-b-2 transition-colors ${getBorderBaseClass(deductionLevel)}`} />
          {renderTopClues('top')}
          {showDualSideClues && (
            <div className={`bg-white border-l-2 border-b-2 transition-colors ${getBorderBaseClass(deductionLevel)}`} />
          )}

          {/* 中间游戏区域 */}
          {grid.map((row, r) => {
            const rowInfo = lineAnalysis.rows[r];
            const isHintRow =
              (hintInfo?.type === 'row' && hintInfo.index === r) ||
              (hintInfo?.type === 'cell' && hintInfo.r === r);

            return (
              <Fragment key={`row-${r}`}>
                <RowClueBar
                  r={r}
                  position="left"
                  mode={mode}
                  editInputMode={editInputMode}
                  clueTextSize={clueTextSize}
                  parsed={rowInfo.parsed}
                  previewClues={derivedClues?.rows[r]}
                  completed={mode === 'play' && rowInfo.completed}
                  isHovered={mode === 'play' && hoverPos.r === r}
                  isHintRow={isHintRow}
                  hintError={!!hintInfo?.isError}
                  deductionLevel={deductionLevel}
                  markedFlags={rowInfo.markedFlags}
                  sum={rowInfo.sum}
                  showClueSums={gameSettings.showClueSums}
                  completeLineStyle={gameSettings.completeLineStyle}
                  editValue={rowCluesStr[r]}
                  onEditClue={onEditRowClue}
                  onClueMouseDown={onToggleMarkedRow}
                  hasBottomBorder={r % 5 === 4 && r !== rows - 1}
                />

                {row.map((cell, c) => {
                  const isHintCol =
                    (hintInfo?.type === 'col' && hintInfo.index === c) ||
                    (hintInfo?.type === 'cell' && hintInfo.c === c);
                  const isExactError =
                    hintInfo?.type === 'cell' &&
                    hintInfo.r === r &&
                    hintInfo.c === c &&
                    hintInfo.isError;
                  const inMeasureRect = measureRect
                    ? r >= measureRect.minR &&
                      r <= measureRect.maxR &&
                      c >= measureRect.minC &&
                      c <= measureRect.maxC
                    : false;

                  return (
                    <GridCell
                      key={`cell-${r}-${c}`}
                      r={r}
                      c={c}
                      value={cell}
                      size={cellSize}
                      editable={editable}
                      deductionLevel={deductionLevel}
                      isHovered={mode === 'play' && (hoverPos.r === r || hoverPos.c === c)}
                      isHintRow={isHintRow}
                      isHintCol={isHintCol}
                      hintError={!!hintInfo?.isError}
                      isExactError={isExactError}
                      inMeasureRect={inMeasureRect}
                      hasRightBorder={c % 5 === 4 && c !== cols - 1}
                      hasBottomBorder={r % 5 === 4 && r !== rows - 1}
                    />
                  );
                })}

                {showDualSideClues && (
                  <RowClueBar
                    r={r}
                    position="right"
                    mode={mode}
                    editInputMode={editInputMode}
                    clueTextSize={clueTextSize}
                    parsed={rowInfo.parsed}
                    previewClues={derivedClues?.rows[r]}
                    completed={mode === 'play' && rowInfo.completed}
                    isHovered={mode === 'play' && hoverPos.r === r}
                    isHintRow={isHintRow}
                    hintError={!!hintInfo?.isError}
                    deductionLevel={deductionLevel}
                    markedFlags={rowInfo.markedFlags}
                    sum={rowInfo.sum}
                    showClueSums={gameSettings.showClueSums}
                    completeLineStyle={gameSettings.completeLineStyle}
                    editValue={rowCluesStr[r]}
                    onEditClue={onEditRowClue}
                    onClueMouseDown={onToggleMarkedRow}
                    hasBottomBorder={r % 5 === 4 && r !== rows - 1}
                  />
                )}
              </Fragment>
            );
          })}

          {/* 最后一行：底部列线索 */}
          {showDualSideClues && (
            <>
              <div className={`bg-white border-r-2 border-t-2 transition-colors ${getBorderBaseClass(deductionLevel)}`} />
              {renderTopClues('bottom')}
              <div className={`bg-white border-l-2 border-t-2 transition-colors ${getBorderBaseClass(deductionLevel)}`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Board;
