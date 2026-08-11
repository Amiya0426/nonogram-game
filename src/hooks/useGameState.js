import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PRESETS,
  DEFAULT_SETTINGS,
  MAX_BOARD,
  DEFAULT_CELL_SIZE,
} from '../constants.js';
import { createGrid } from '../logic/board.js';
import { loadJSON, saveJSON } from '../logic/storage.js';
import { api } from '../api.js';
import { translate as tr } from '../i18n/index.js';
import useAuth from './useAuth.js';
import useTimer from './useTimer.js';
import usePuzzleLibrary from './usePuzzleLibrary.js';
import useAnalysis from './useAnalysis.js';
import useHoverMeasure from './useHoverMeasure.js';
import useBoardInput from './useBoardInput.js';
import useDeduction from './useDeduction.js';
import useAutofillCross from './useAutofillCross.js';
import useReplay from './useReplay.js';
import useProgressReporting from './useProgressReporting.js';
import useGameActions from './useGameActions.js';
import useEditing from './useEditing.js';
import useImportExport from './useImportExport.js';

const SAVE_KEY = 'nonogram_master_save';

/** 读取自动存档并做基本校验，损坏或尺寸不符时返回 null */
const loadSavedState = () => {
  const s = loadJSON(SAVE_KEY, null);
  if (!s) return null;
  const rows = Number(s.rows) || 0;
  const cols = Number(s.cols) || 0;
  if (
    rows < 1 ||
    rows > MAX_BOARD ||
    cols < 1 ||
    cols > MAX_BOARD ||
    !Array.isArray(s.grid) ||
    s.grid.length !== rows ||
    !Array.isArray(s.grid[0]) ||
    s.grid[0].length !== cols ||
    !Array.isArray(s.rowCluesStr) ||
    s.rowCluesStr.length !== rows ||
    !Array.isArray(s.colCluesStr) ||
    s.colCluesStr.length !== cols
  ) {
    return null;
  }
  return s;
};

/**
 * 全局状态组合根：装配各领域 hook，对外暴露与拆分前一致的 API。
 * 棋盘/UI 基础状态由本文件持有，领域逻辑分别位于 useAuth / useTimer /
 * usePuzzleLibrary / useAnalysis / useHoverMeasure / useBoardInput /
 * useDeduction / useAutofillCross / useReplay / useProgressReporting /
 * useGameActions / useEditing / useImportExport。
 */
export default function useGameState() {
  // ==========================================
  // 1. 初始状态：从 localStorage 恢复上次游玩设置与棋盘进度
  // ==========================================
  const savedState = useMemo(() => loadSavedState(), []);

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

  // ==========================================
  // 2. 领域子 hook 装配
  // ==========================================
  const auth = useAuth({ setAlertMsg });
  const {
    user,
    authBusy,
    userProgress,
    setUser,
    setUserProgress,
    refreshUserProgress,
  } = auth;
  const timer = useTimer({
    initialSeconds: Number.isInteger(savedState?.timerSeconds)
      ? savedState.timerSeconds
      : 0,
    initialRunning: savedState ? savedState.timerRunning === true : false,
  });
  const { timerSeconds, timerRunning, resetTimer, stopTimer, startIfNotRunning } = timer;
  const library = usePuzzleLibrary({ user, setAlertMsg });

  // 拖拽/触摸批次的复位动作（由 handleGlobalLeave 触发；经 ref 解除与 useBoardInput 的循环依赖）
  const dragResetRef = useRef(null);
  const resetDragState = useCallback(() => {
    dragResetRef.current?.();
  }, []);
  const hover = useHoverMeasure({ onLeave: resetDragState });

  const analysis = useAnalysis({
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
    hoverPos: hover.hoverPos,
    measureStart: hover.measureStart,
    cellSize,
  });
  const {
    lineAnalysis,
    isSolvedStatus,
    progressPercent,
    derivedClues,
    hoverTooltipData,
    showMeasure,
    showHoverRow,
    showHoverCol,
    clueTextSize,
  } = analysis;

  const input = useBoardInput({
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
    scheduleHover: hover.scheduleHover,
    maybeStartTimer: startIfNotRunning,
  });
  const {
    dragAction,
    setDragAction,
    recordMove,
    flushDragBatch,
    handleCellMouseDown,
    handleCellMouseEnter,
    startTouchPaint,
    continueTouchPaint,
    endTouchPaint,
  } = input;

  useEffect(() => {
    dragResetRef.current = () => {
      setDragAction(null);
      flushDragBatch();
    };
  }, [setDragAction, flushDragBatch]);

  const deduction = useDeduction({
    deductionLevel,
    backupGrids,
    grid,
    mode,
    isSolvedStatus,
    setDeductionLevel,
    setBackupGrids,
    setGrid,
    setAlertMsg,
    recordMove,
  });

  useAutofillCross({
    grid,
    setGrid,
    gameSettings,
    mode,
    isSolvedStatus,
    deductionLevel,
    rows,
    cols,
    rowCluesStr,
    colCluesStr,
  });

  const progress = useProgressReporting({
    isSolvedStatus,
    user,
    currentPuzzleId,
    grid,
    rows,
    cols,
    setUserProgress,
  });

  const replay = useReplay({
    moveHistory,
    rows,
    cols,
    rowCluesStr,
    colCluesStr,
    progressPercent,
    setAlertMsg,
  });

  const actions = useGameActions({
    mode,
    editInputMode,
    rows,
    cols,
    rowCluesStr,
    colCluesStr,
    grid,
    user: auth.user,
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
    resetTimer: timer.resetTimer,
    recordMove,
    markHandled: progress.markHandled,
  });

  /** 登录用户导入题目时提交服务器题库：校验合法且唯一解后入库 */
  const submitToLibrary = useCallback(
    (data) => {
      if (!user || !data) return;
      const submit = {
        rows: data.rows,
        cols: data.cols,
        rowCluesStr: data.rowCluesStr,
        colCluesStr: data.colCluesStr,
        grid: data.grid
          ? data.grid.map((row) =>
              row.map((v) => (typeof v === 'number' && v % 2 === 1 ? 1 : 0)),
            )
          : null,
        source: 'user-import',
      };
      api
        .importPuzzles([submit])
        .then((r) => {
          const okItem = r.results.find((x) => x.ok);
          if (okItem) {
            setCurrentPuzzleId(okItem.id);
            setAlertMsg(
              okItem.created ? tr('msg.libraryAdded') : tr('msg.libraryExists'),
            );
          } else if (r.results[0]) {
            setAlertMsg(tr('msg.libraryFailed', { reason: r.results[0].reason }));
          }
        })
        .catch(() => {});
    },
    [user, setAlertMsg, setCurrentPuzzleId],
  );

  /** 从存档数据恢复盘面（代码/文件导入共用入口） */
  const applyImportedData = useCallback(
    (data) => {
      if (data.rows && data.cols && data.rowCluesStr && data.colCluesStr && data.grid) {
        setRows(data.rows);
        setCols(data.cols);
        setRowCluesStr(data.rowCluesStr);
        setColCluesStr(data.colCluesStr);
        setGrid(data.grid);
        setMarkedRowClues(data.markedRowClues || {});
        setMarkedColClues(data.markedColClues || {});
        setDeductionLevel(data.deductionLevel || 0);
        setBackupGrids(data.backupGrids || []);
        if (data.gameSettings) setGameSettings(data.gameSettings);
        setLastCorrectSnapshot(null);
        setMoveHistory([]);
        resetTimer();
        setAlertMsg(tr('msg.imported'));
        setMode('play');
      } else {
        throw new Error('import.incomplete');
      }
    },
    [
      setRows,
      setCols,
      setRowCluesStr,
      setColCluesStr,
      setGrid,
      setMarkedRowClues,
      setMarkedColClues,
      setDeductionLevel,
      setBackupGrids,
      setGameSettings,
      setLastCorrectSnapshot,
      setMoveHistory,
      resetTimer,
      setAlertMsg,
      setMode,
    ],
  );

  const editing = useEditing({
    editInputMode,
    grid,
    rowCluesStr,
    colCluesStr,
    markedRowClues,
    markedColClues,
    rows,
    cols,
    user,
    onSubmitToLibrary: submitToLibrary,
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
    setHoverPos: hover.setHoverPos,
    setIsPanelPinned,
    setShowLeftPanel,
    setLastCorrectSnapshot,
    setDeductionLevel,
    setBackupGrids,
    setAlertMsg,
  });

  const io = useImportExport({
    rows,
    cols,
    rowCluesStr,
    colCluesStr,
    grid,
    markedRowClues,
    markedColClues,
    isSolvedStatus,
    deductionLevel,
    backupGrids,
    gameSettings,
    progressPercent,
    setAlertMsg,
    setHintInfo,
    setMode,
    onApplyPuzzle: applyImportedData,
    onSubmitToLibrary: submitToLibrary,
    onInitBoard: actions.initBoard,
  });

  // ==========================================
  // 3. 自动存档 / 登录恢复 / 计时暂停
  // ==========================================
  useEffect(() => {
    const autosave = setTimeout(() => {
      saveJSON(SAVE_KEY, {
        mode,
        editInputMode,
        rows,
        cols,
        rowCluesStr,
        colCluesStr,
        grid,
        cellSize,
        interactionMode,
        currentBrush,
        deductionLevel,
        backupGrids,
        gameSettings,
        markedRowClues,
        markedColClues,
        lastCorrectSnapshot,
        currentPuzzleId,
        timerSeconds,
        timerRunning,
        moveHistory,
      });
    }, 500);
    return () => clearTimeout(autosave);
  }, [
    mode,
    editInputMode,
    rows,
    cols,
    rowCluesStr,
    colCluesStr,
    grid,
    cellSize,
    interactionMode,
    currentBrush,
    deductionLevel,
    backupGrids,
    gameSettings,
    markedRowClues,
    markedColClues,
    lastCorrectSnapshot,
    currentPuzzleId,
    timerSeconds,
    timerRunning,
    moveHistory,
  ]);

  // 页面加载时恢复登录态
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        setUser(me);
        refreshUserProgress();
      } catch {
        // 未登录或会话失效
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, refreshUserProgress]);

  // 完成或切换模式时自动暂停计时
  useEffect(() => {
    if (isSolvedStatus || mode !== 'play') stopTimer();
  }, [isSolvedStatus, mode, stopTimer]);

  // ==========================================
  // 4. 对外 API（与拆分前保持一致）
  // ==========================================
  return {
    // state
    mode,
    editInputMode,
    user,
    authBusy,
    rows,
    cols,
    rowCluesStr,
    colCluesStr,
    grid,
    cellSize,
    interactionMode,
    currentBrush,
    dragAction,
    alertMsg,
    hintInfo,
    deductionLevel,
    backupGrids,
    showLeftPanel,
    isPanelPinned,
    isPanelHovered,
    importData: io.importData,
    isImporting: io.isImporting,
    localImportData: io.localImportData,
    exportFilename: io.exportFilename,
    exportRemark: io.exportRemark,
    browse: library.browse,
    gameSettings,
    hoverPos: hover.hoverPos,
    measureStart: hover.measureStart,
    markedRowClues,
    markedColClues,
    lastCorrectSnapshot,
    isSolvedStatus,
    clueTextSize,
    lineAnalysis,
    derivedClues,
    hoverTooltipData,
    showMeasure,
    showHoverRow,
    showHoverCol,
    // actions
    setShowLeftPanel,
    setIsPanelPinned,
    setIsPanelHovered,
    setInteractionMode,
    setCurrentBrush,
    setCellSize,
    setGameSettings,
    setEditInputMode,
    setImportData: io.setImportData,
    setLocalImportData: io.setLocalImportData,
    setExportFilename: io.setExportFilename,
    setExportRemark: io.setExportRemark,
    initBoard: actions.initBoard,
    clearBoard: actions.clearBoard,
    clearClues: actions.clearClues,
    generateRandom: actions.generateRandom,
    loadPuzzles: library.loadPuzzles,
    openPuzzleFromBrowse: actions.openPuzzleFromBrowse,
    renamePuzzle: library.renamePuzzle,
    zoomBoard: actions.zoomBoard,
    applyPatternImage: editing.applyPatternImage,
    timerSeconds,
    timerRunning,
    togglePauseTimer: timer.togglePauseTimer,
    moveHistory,
    userProgress,
    refreshUserProgress,
    isGeneratingGif: replay.isGeneratingGif,
    generateReplayGif: replay.generateReplayGif,
    toggleMarkedRow: actions.toggleMarkedRow,
    toggleMarkedCol: actions.toggleMarkedCol,
    editRowClue: actions.editRowClue,
    editColClue: actions.editColClue,
    handleCellMouseDown,
    handleCellMouseEnter,
    startTouchPaint,
    continueTouchPaint,
    endTouchPaint,
    handleGlobalLeave: hover.handleGlobalLeave,
    startDeduction: deduction.startDeduction,
    applyDeduction: deduction.applyDeduction,
    cancelDeduction: deduction.cancelDeduction,
    validateGrid: actions.validateGrid,
    restoreLastCorrect: actions.restoreLastCorrect,
    provideHint: actions.provideHint,
    autoSolve: actions.autoSolve,
    handleExportCode: io.handleExportCode,
    handleExportJSON: io.handleExportJSON,
    exportAsImage: io.exportAsImage,
    handleLocalImportCode: io.handleLocalImportCode,
    handleImportFile: io.handleImportFile,
    handleImport: io.handleImport,
    handleModeChange: editing.handleModeChange,
    cancelEditing: editing.cancelEditing,
    finishEditing: editing.finishEditing,
    login: auth.login,
    register: auth.register,
    sendCode: auth.sendCode,
    resetPassword: auth.resetPassword,
    logout: auth.logout,
    fitToWidth: actions.fitToWidth,
    setMode,
  };
}
