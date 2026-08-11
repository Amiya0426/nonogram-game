import { useState } from 'react';
import {
  PRESETS,
  DEFAULT_SETTINGS,
  DEFAULT_CELL_SIZE,
} from '../constants.js';
import { createGrid } from '../logic/board.js';

/**
 * 棋盘/UI 基础状态层（拆分自 useGameState 组合根）。
 * 只持有状态声明与 setter，不包含业务逻辑。
 */
export default function useBoardState(savedState) {
  const [mode, setMode] = useState(savedState?.mode === 'edit' ? 'edit' : 'play');
  const [editInputMode, setEditInputMode] = useState(
    savedState?.editInputMode === 'manual' ? 'manual' : 'pattern',
  );
  const [rows, setRows] = useState(savedState?.rows || PRESETS.heart.rows);
  const [cols, setCols] = useState(savedState?.cols || PRESETS.heart.cols);
  const [rowCluesStr, setRowCluesStr] = useState(
    savedState?.rowCluesStr || PRESETS.heart.rowClues.map((c) => c.join(' ')),
  );
  const [colCluesStr, setColCluesStr] = useState(
    savedState?.colCluesStr || PRESETS.heart.colClues.map((c) => c.join('\n')),
  );
  const [grid, setGrid] = useState(
    savedState?.grid || createGrid(PRESETS.heart.rows, PRESETS.heart.cols),
  );
  const [cellSize, setCellSize] = useState(
    savedState?.cellSize || DEFAULT_CELL_SIZE,
  );
  const [interactionMode, setInteractionMode] = useState(
    savedState?.interactionMode === 'paint' ? 'paint' : 'toggle',
  );
  const [currentBrush, setCurrentBrush] = useState(
    [0, 1, 2].includes(savedState?.currentBrush) ? savedState.currentBrush : 1,
  );
  const [alertMsg, setAlertMsg] = useState('');
  const [hintInfo, setHintInfo] = useState(null);
  const [deductionLevel, setDeductionLevel] = useState(
    Math.max(0, Math.min(3, savedState?.deductionLevel || 0)),
  );
  const [backupGrids, setBackupGrids] = useState(savedState?.backupGrids || []);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [isPanelPinned, setIsPanelPinned] = useState(true);
  const [isPanelHovered, setIsPanelHovered] = useState(false);
  const [gameSettings, setGameSettings] = useState({
    ...DEFAULT_SETTINGS,
    ...(savedState?.gameSettings || {}),
  });
  const [markedRowClues, setMarkedRowClues] = useState(
    savedState?.markedRowClues || {},
  );
  const [markedColClues, setMarkedColClues] = useState(
    savedState?.markedColClues || {},
  );
  const [lastCorrectSnapshot, setLastCorrectSnapshot] = useState(
    savedState?.lastCorrectSnapshot || null,
  );
  const [currentPuzzleId, setCurrentPuzzleId] = useState(
    typeof savedState?.currentPuzzleId === 'string' ? savedState.currentPuzzleId : null,
  );
  const [moveHistory, setMoveHistory] = useState(
    Array.isArray(savedState?.moveHistory) ? savedState.moveHistory : [],
  );

  return {
    mode,
    setMode,
    editInputMode,
    setEditInputMode,
    rows,
    setRows,
    cols,
    setCols,
    rowCluesStr,
    setRowCluesStr,
    colCluesStr,
    setColCluesStr,
    grid,
    setGrid,
    cellSize,
    setCellSize,
    interactionMode,
    setInteractionMode,
    currentBrush,
    setCurrentBrush,
    alertMsg,
    setAlertMsg,
    hintInfo,
    setHintInfo,
    deductionLevel,
    setDeductionLevel,
    backupGrids,
    setBackupGrids,
    showLeftPanel,
    setShowLeftPanel,
    isPanelPinned,
    setIsPanelPinned,
    isPanelHovered,
    setIsPanelHovered,
    gameSettings,
    setGameSettings,
    markedRowClues,
    setMarkedRowClues,
    markedColClues,
    setMarkedColClues,
    lastCorrectSnapshot,
    setLastCorrectSnapshot,
    currentPuzzleId,
    setCurrentPuzzleId,
    moveHistory,
    setMoveHistory,
  };
}
