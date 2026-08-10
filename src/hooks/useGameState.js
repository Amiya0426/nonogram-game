import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_THEME,
  PRESETS,
  DEFAULT_SETTINGS,
  MAX_BOARD,
  MIN_CELL_SIZE,
  MAX_CELL_SIZE,
  DEFAULT_CELL_SIZE,
} from '../constants.js';
import {
  parseClue,
  getLineClue,
  arraysEqual,
  getAutoMarked,
  getInsertIdx,
  getSmartInsertIdx,
} from '../logic/clues.js';
import { createGrid, cloneGrid, updateCell } from '../logic/board.js';
import { loadJSON, saveJSON } from '../logic/storage.js';
import { solveBoardLogic, solveLineFast } from '../logic/solver.js';
import { generateReplayGif as buildReplayGif, downloadGif } from '../logic/gifReplay.js';
import { extractPuzzleFromHtml, normalizePuzzleData } from '../logic/importer.js';
import { api } from '../api.js';
import {
  downloadJSON,
  buildExportData,
  buildExportCode,
  decodeExportCode,
  copyToClipboard,
  exportBoardAsImage,
  buildPuzzleExportName,
} from '../logic/exporter.js';

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

export default function useGameState() {
  // ==========================================
  // 1. 初始状态：从 localStorage 恢复上次游玩设置与棋盘进度
  // ==========================================
  const savedState = useMemo(() => loadSavedState(), []);

  const [mode, setMode] = useState(savedState?.mode === 'edit' ? 'edit' : 'play');
  const [editInputMode, setEditInputMode] = useState(
    savedState?.editInputMode === 'manual' ? 'manual' : 'pattern',
  );
  const [user, setUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
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

  const [dragAction, setDragAction] = useState(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [hintInfo, setHintInfo] = useState(null);

  const [deductionLevel, setDeductionLevel] = useState(
    Math.max(0, Math.min(3, savedState?.deductionLevel || 0)),
  );
  const [backupGrids, setBackupGrids] = useState(savedState?.backupGrids || []);

  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [isPanelPinned, setIsPanelPinned] = useState(true);
  const [isPanelHovered, setIsPanelHovered] = useState(false);

  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [localImportData, setLocalImportData] = useState('');
  const [exportFilename, setExportFilename] = useState('');
  const [exportRemark, setExportRemark] = useState('');

  const [gameSettings, setGameSettings] = useState({
    ...DEFAULT_SETTINGS,
    ...(savedState?.gameSettings || {}),
  });

  const [hoverPos, setHoverPos] = useState({ r: -1, c: -1 });
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
  const [timerSeconds, setTimerSeconds] = useState(
    Number.isInteger(savedState?.timerSeconds) ? savedState.timerSeconds : 0,
  );
  const [timerRunning, setTimerRunning] = useState(
    savedState ? savedState.timerRunning === true : false,
  );
  const [moveHistory, setMoveHistory] = useState(
    Array.isArray(savedState?.moveHistory) ? savedState.moveHistory : [],
  );
  const [userProgress, setUserProgress] = useState([]);
  const [browse, setBrowse] = useState({
    items: [],
    total: 0,
    page: 1,
    perPage: 30,
    loading: false,
    rows: null,
    cols: null,
    mine: false,
    done: false,
  });

  /** 拉取当前用户已完成题目列表 */
  const refreshUserProgress = useCallback(async () => {
    try {
      const list = await api.userProgress();
      setUserProgress(Array.isArray(list) ? list : []);
    } catch {
      // 未登录或接口不可用时忽略
    }
  }, []);

  /** 题库浏览：分页拉取题目列表 */
  const loadPuzzles = useCallback(
    async (page = 1, rows = null, cols = null, mine = false, done = false) => {
      setBrowse((prev) => ({ ...prev, loading: true, page, rows, cols, mine, done }));
    try {
      const data = await api.listPuzzles({
        page,
        perPage: 30,
        rows,
        cols,
        mine: mine ? '1' : undefined,
        done: done ? '1' : undefined,
      });
      setBrowse({
        items: data.items || [],
        total: data.total || 0,
        page: data.page || 1,
        perPage: data.perPage || 30,
        loading: false,
        rows,
        cols,
        mine,
        done,
      });
    } catch {
      setBrowse((prev) => ({ ...prev, loading: false }));
      setAlertMsg('❌ 题库加载失败');
    }
    },
    [],
  );

  // 自动存档：游玩设置 + 棋盘进度防抖写入 localStorage（刷新后恢复）
  useEffect(() => {
    const timer = setTimeout(() => {
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
    return () => clearTimeout(timer);
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

  const hoverPosRef = useRef({ r: -1, c: -1 });
  const measureStartRef = useRef(null);
  const [measureStart, setMeasureStart] = useState(null);
  // 进入编辑模式前的盘面快照，用于“取消编辑”时还原
  const editSnapshotRef = useRef(null);

  // hover 的 rAF 节流：避免鼠标快速扫过时每格触发一次重渲染
  const hoverRafRef = useRef(0);
  const pendingHoverRef = useRef(null);

  useEffect(() => {
    hoverPosRef.current = hoverPos;
  }, [hoverPos]);

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
  }, [refreshUserProgress]);

  const scheduleHover = useCallback((r, c) => {
    pendingHoverRef.current = { r, c };
    if (hoverRafRef.current) return;
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = 0;
      const p = pendingHoverRef.current;
      pendingHoverRef.current = null;
      if (p) setHoverPos(p);
    });
  }, []);

  // ==========================================
  // 2. 线索与盘面状态分析（缓存，供渲染与胜负判定复用）
  // ==========================================
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

  // ==========================================
  // 操作记录（GIF 复盘数据源）
  // ==========================================
  const dragBatchRef = useRef(null);
  const touchBatchRef = useRef(null);

  const recordMove = useCallback((type, cells) => {
    if (!cells || cells.length === 0) return;
    // 压缩本次记录中同一格子的重复操作（拖拽/画笔划过同格时取最后值）
    const dedup = [];
    for (const cell of cells) {
      const idx = dedup.findIndex((x) => x.r === cell.r && x.c === cell.c);
      if (idx >= 0) dedup[idx] = cell;
      else dedup.push(cell);
    }
    if (dedup.length === 0) return;

    setMoveHistory((prev) => {
      const last = prev[prev.length - 1];
      // 轮换模式合并：上一条是单格 fill 且与本次同格时，合并为一条（取本次最终值）
      // 例如打叉的 空→黑→叉 路径只记录"叉"，复盘时一步到位，不出现中间黑块
      if (
        type === 'fill' &&
        last &&
        last.type === 'fill' &&
        last.cells.length === 1 &&
        dedup.length === 1 &&
        last.cells[0].r === dedup[0].r &&
        last.cells[0].c === dedup[0].c
      ) {
        const merged = [...prev];
        merged[merged.length - 1] = { ...last, cells: [{ ...dedup[0] }] };
        return merged;
      }
      return [...prev, { type, at: Date.now(), cells: dedup }];
    });
  }, []);

  /** 正常填入：合并同一次拖拽/画笔的连续操作 */
  const recordFill = useCallback(
    (r, c, val, batchRef) => {
      if (batchRef?.current) {
        batchRef.current.cells.push({ r, c, val });
        return;
      }
      recordMove('fill', [{ r, c, val }]);
    },
    [recordMove],
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

  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const generateReplayGif = useCallback(async () => {
    if (!moveHistory.length) {
      setAlertMsg('当前这盘还没有操作记录，无法生成复盘 GIF');
      return;
    }
    setIsGeneratingGif(true);
    setAlertMsg('正在生成复盘 GIF，请稍候...');
    try {
      const { bytes, frames } = await buildReplayGif({
        rows,
        cols,
        rowCluesStr,
        colCluesStr,
        moveHistory,
      });
      downloadGif(bytes, `${buildPuzzleExportName({ rows, cols, progressPercent })}_replay`);
      setAlertMsg(`✅ 复盘 GIF 已生成（${frames} 帧）`);
    } catch (e) {
      setAlertMsg(`❌ GIF 生成失败：${e.message}`);
    } finally {
      setIsGeneratingGif(false);
    }
  }, [rows, cols, rowCluesStr, colCluesStr, moveHistory, progressPercent]);



  // 完成服务器题库题目时记录进度（黑格=1，叉/空=0 提交服务器校验）
  const completedRef = useRef(null);
  useEffect(() => {
    if (isSolvedStatus && user && currentPuzzleId) {
      if (completedRef.current === currentPuzzleId) return;
      completedRef.current = currentPuzzleId;
      const binaryGrid = grid.map((row) =>
        row.map((v) => (typeof v === 'number' && v % 2 === 1 ? 1 : 0)),
      );
      api
        .completePuzzle(currentPuzzleId, binaryGrid)
        .then(() => {
          setUserProgress((prev) =>
            prev.some((p) => (typeof p === 'string' ? p : p.id) === currentPuzzleId)
              ? prev
              : [...prev, { id: currentPuzzleId, rows, cols }],
          );
        })
        .catch(() => {
          completedRef.current = null;
        });
    } else if (!isSolvedStatus) {
      completedRef.current = null;
    }
  }, [isSolvedStatus, user, currentPuzzleId, grid]);


  // ==========================================
  // 计时：每盘开始计时，可暂停；完成后停止
  // ==========================================
  useEffect(() => {
    if (!timerRunning) return;
    const iv = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [timerRunning]);

  // 完成或切换模式时自动暂停
  useEffect(() => {
    if (isSolvedStatus || mode !== 'play') setTimerRunning(false);
  }, [isSolvedStatus, mode]);

  /** 新盘重置计时：清零但不启动，等待玩家第一次点击格子 */
  const resetTimer = useCallback(() => {
    setTimerSeconds(0);
    setTimerRunning(false);
  }, []);

  const togglePauseTimer = useCallback(() => {
    setTimerRunning((r) => !r);
  }, []);

  const getClueTextSize = useCallback(() => {
    if (cellSize < 20) return 'text-[11px]';
    if (cellSize < 28) return 'text-sm';
    if (cellSize < 40) return 'text-base';
    return 'text-lg';
  }, [cellSize]);

  // ==========================================
  // 3. 全局键盘 / 鼠标事件（测量工具）
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control' && !measureStartRef.current && hoverPosRef.current.r !== -1) {
        measureStartRef.current = hoverPosRef.current;
        setMeasureStart(hoverPosRef.current);
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Control') {
        measureStartRef.current = null;
        setMeasureStart(null);
      }
    };
    const handleMouseMove = (e) => {
      const tooltip = document.getElementById('measure-tooltip-container');
      if (tooltip) tooltip.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`;
    };
    const handleBlur = () => {
      measureStartRef.current = null;
      setMeasureStart(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleGlobalLeave = useCallback(() => {
    setHoverPos({ r: -1, c: -1 });
    measureStartRef.current = null;
    setMeasureStart(null);
    setDragAction(null);
    flushDragBatch();
  }, [flushDragBatch]);

  // ==========================================
  // 4. 盘面操作
  // ==========================================
  const initBoard = useCallback((r, c, rClues, cClues) => {
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
  }, [resetTimer]);

  const clearBoard = useCallback(() => {
    setGrid(createGrid(rows, cols));
    setAlertMsg('');
    setHintInfo(null);
    setMarkedRowClues({});
    setMarkedColClues({});
    setDeductionLevel(0);
    setBackupGrids([]);
  }, [rows, cols]);

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
  }, [rows, cols]);

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
      setAlertMsg(`✅ 已载入题库题目 ${item.cols}×${item.rows}`);
    },
    [initBoard],
  );

  /** 修改自己导入的题目名称（题库浏览内） */
  const renamePuzzle = useCallback(
    async (item) => {
      if (!user) {
        setAlertMsg('请先登录');
        return;
      }
      if (String(item.user_id) !== String(user.id)) {
        setAlertMsg('只能修改自己导入的题目名称');
        return;
      }
      const newName = prompt('输入题目名称（留空清除自定义名称）：', item.name || '');
      if (newName === null) return;
      const name = newName.trim();
      try {
        const r = await api.renamePuzzle(item.id, name || null);
        setBrowse((prev) => ({
          ...prev,
          items: prev.items.map((it) =>
            it.id === item.id ? { ...it, name: r.name } : it,
          ),
        }));
        setAlertMsg(name ? `✅ 已命名为 "${name}"` : '✅ 已清除自定义名称');
      } catch (e) {
        setAlertMsg(`❌ ${e.message}`);
      }
    },
    [user],
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
        setAlertMsg(`✅ 已从服务器题库抽取 ${serverPuzzle.rows} × ${serverPuzzle.cols} 题目`);
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
    const extractClues = (line) => {
      const clues = [];
      let count = 0;
      for (let v of line) {
        if (v === 1) count++;
        else if (count > 0) {
          clues.push(count);
          count = 0;
        }
      }
      if (count > 0) clues.push(count);
      return clues.length > 0 ? clues : [0];
    };
    const newRowClues = randomGrid.map(extractClues);
    const newColClues = Array.from({ length: cols }, (_, colIdx) =>
      extractClues(randomGrid.map((row) => row[colIdx])),
    );
    // 编辑-画盘面模式下：直接把随机图案放到盘面上，线索按图案实时生成
    if (mode === 'edit' && editInputMode === 'pattern') {
      setGrid(randomGrid);
      setAlertMsg('已生成随机图案，可直接拖拽修改。');
      return;
    }
    initBoard(rows, cols, newRowClues, newColClues);
    setGrid(createGrid(rows, cols));
  }, [rows, cols, initBoard, mode, editInputMode, user]);

  const toggleMarkedRow = useCallback((r, idx) => {
    if (mode === 'play') {
      setMarkedRowClues((prev) => ({ ...prev, [`${r}-${idx}`]: !prev[`${r}-${idx}`] }));
    }
  }, [mode]);

  const toggleMarkedCol = useCallback((c, idx) => {
    if (mode === 'play') {
      setMarkedColClues((prev) => ({ ...prev, [`${c}-${idx}`]: !prev[`${c}-${idx}`] }));
    }
  }, [mode]);

  const editRowClue = useCallback((r, value) => {
    setRowCluesStr((prev) => {
      const next = prev.slice();
      next[r] = value;
      return next;
    });
  }, []);

  const editColClue = useCallback((c, value) => {
    setColCluesStr((prev) => {
      const next = prev.slice();
      next[c] = value;
      return next;
    });
  }, []);

  const updateCellValue = useCallback((r, c, val) => {
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
    if (mode === 'play' && !isSolvedStatus && timerSeconds === 0 && !timerRunning) {
      setTimerRunning(true);
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
  }, [hintInfo, mode, isSolvedStatus, recordMove, timerSeconds, timerRunning]);

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
      if (!editable) return;
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
    [mode, editInputMode, computeCellAction, grid, deductionLevel, updateCellValue, flushDragBatch],
  );

  const handleCellMouseEnter = useCallback(
    (e, r, c) => {
      const editable = mode === 'play' || (mode === 'edit' && editInputMode === 'pattern');
      if (dragAction !== null && e.buttons === 0) {
        setDragAction(null);
        flushDragBatch();
      }
      scheduleHover(r, c);
      if (!editable || dragAction === null || e.buttons === 0) return;
      // 拖拽：首次进入时开启批量记录，后续格合并为一条操作
      if (!dragBatchRef.current) dragBatchRef.current = { cells: [] };
      updateCellValue(r, c, dragAction);
    },
    [dragAction, mode, editInputMode, scheduleHover, updateCellValue],
  );

  /** 触摸拖画：长按进入绘制后使用同一操作值连续填充 */
  const touchPaintActionRef = useRef(null);
  const startTouchPaint = useCallback(
    (r, c) => {
      const editable = mode === 'play' || (mode === 'edit' && editInputMode === 'pattern');
      if (!editable) return;
      const action = computeCellAction(r, c);
      if (mode === 'play') {
        flushTouchBatch();
      }
      touchPaintActionRef.current = action;
      updateCellValue(r, c, action);
    },
    [mode, editInputMode, computeCellAction, updateCellValue, flushTouchBatch],
  );
  const continueTouchPaint = useCallback(
    (r, c) => {
      if (touchPaintActionRef.current != null) {
        // 长按拖动：后续格合并为一条批量记录
        if (!touchBatchRef.current) touchBatchRef.current = { cells: [] };
        updateCellValue(r, c, touchPaintActionRef.current);
      }
    },
    [updateCellValue],
  );
  const endTouchPaint = useCallback(() => {
    touchPaintActionRef.current = null;
    flushTouchBatch();
  }, [flushTouchBatch]);

  // ==========================================
  // 5. 自动打叉（防抖，1.5s）
  // ==========================================
  useEffect(() => {
    if (!gameSettings.autoFillCross || mode !== 'play' || isSolvedStatus || deductionLevel > 0) {
      return;
    }

    const timer = setTimeout(() => {
      setGrid((prevGrid) => {
        let changed = false;
        const newGrid = cloneGrid(prevGrid);
        const parsedRowClues = rowCluesStr.map(parseClue);
        const parsedColClues = colCluesStr.map(parseClue);

        const processLine = (line, clues, updateGridFn) => {
          const currentClues = getLineClue(line);
          if (arraysEqual(currentClues, clues)) {
            for (let k = 0; k < line.length; k++) {
              if (line[k] === 0) {
                updateGridFn(k, 2);
                changed = true;
              }
            }
            return;
          }

          const { marked, assignedBlocks } = getAutoMarked(line, clues);
          const blockMap = {};
          assignedBlocks.forEach((b) => {
            blockMap[b.clueIdx] = b;
          });

          if (clues.length === 1 && clues[0] === 0) {
            for (let i = 0; i < line.length; i++) {
              if (line[i] === 0) {
                updateGridFn(i, 2);
                changed = true;
              }
            }
            return;
          }

          for (let i = 0; i < clues.length; i++) {
            if (!marked[i]) continue;
            const b = blockMap[i];

            if (i === 0) {
              for (let k = 0; k < b.start; k++) {
                if (line[k] === 0) {
                  updateGridFn(k, 2);
                  changed = true;
                }
              }
            }
            if (i === clues.length - 1) {
              for (let k = b.end + 1; k < line.length; k++) {
                if (line[k] === 0) {
                  updateGridFn(k, 2);
                  changed = true;
                }
              }
            }
            if (i > 0 && marked[i - 1]) {
              const prevB = blockMap[i - 1];
              for (let k = prevB.end + 1; k < b.start; k++) {
                if (line[k] === 0) {
                  updateGridFn(k, 2);
                  changed = true;
                }
              }
            }
          }

          if (marked.length > 0 && marked.every((m) => m)) {
            for (let k = 0; k < line.length; k++) {
              if (line[k] === 0) {
                updateGridFn(k, 2);
                changed = true;
              }
            }
          }
        };

        for (let r = 0; r < rows; r++) {
          processLine(newGrid[r], parsedRowClues[r], (cIdx, val) => {
            newGrid[r][cIdx] = val;
          });
        }
        for (let c = 0; c < cols; c++) {
          const colLine = new Array(rows);
          for (let r = 0; r < rows; r++) colLine[r] = newGrid[r][c];
          processLine(colLine, parsedColClues[c], (rIdx, val) => {
            newGrid[rIdx][c] = val;
          });
        }

        return changed ? newGrid : prevGrid;
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    grid,
    gameSettings.autoFillCross,
    mode,
    isSolvedStatus,
    deductionLevel,
    rows,
    cols,
    rowCluesStr,
    colCluesStr,
  ]);

  // ==========================================
  // 6. 推演模式
  // ==========================================
  const startDeduction = useCallback(() => {
    if (deductionLevel < 3) {
      setBackupGrids((prev) => [...prev, cloneGrid(grid)]);
      setDeductionLevel((prev) => prev + 1);
      setAlertMsg(`🔬 已进入 ${deductionLevel + 1} 级推演模式，填涂将以新颜色显示。`);
    }
  }, [deductionLevel, grid]);

  const applyDeduction = useCallback(() => {
    if (deductionLevel > 0) {
      const currentCF = deductionLevel * 2 + 1;
      const currentCX = deductionLevel * 2 + 2;
      const targetCF = (deductionLevel - 1) * 2 + 1;
      const targetCX = (deductionLevel - 1) * 2 + 2;
      const cells = [];
      grid.forEach((row, rr) =>
        row.forEach((v, cc) => {
          if (v === currentCF) cells.push({ r: rr, c: cc, val: targetCF });
          else if (v === currentCX) cells.push({ r: rr, c: cc, val: targetCX });
        }),
      );
      setGrid((g) =>
        g.map((row) =>
          row.map((v) => (v === currentCF ? targetCF : v === currentCX ? targetCX : v)),
        ),
      );
      if (mode === 'play' && !isSolvedStatus && cells.length) {
        recordMove('deduct', cells);
      }
      setBackupGrids((prev) => prev.slice(0, -1));
      setDeductionLevel((prev) => prev - 1);
      setAlertMsg(`✅ 成功将 ${deductionLevel} 级推演应用到上级盘面。`);
    }
  }, [deductionLevel, grid, mode, isSolvedStatus, recordMove]);

  const cancelDeduction = useCallback(() => {
    if (deductionLevel > 0) {
      setGrid(backupGrids[backupGrids.length - 1].map((r) => [...r]));
      setBackupGrids((prev) => prev.slice(0, -1));
      setDeductionLevel((prev) => prev - 1);
      setAlertMsg(`🔙 已放弃 ${deductionLevel} 级推演，恢复上级盘面。`);
    }
  }, [deductionLevel, backupGrids]);

  // ==========================================
  // 7. 校验 / 提示 / 自动求解
  // ==========================================
  const validateGrid = useCallback(() => {
    setHintInfo(null);
    setAlertMsg('');
    if (mode !== 'play') return;

    const solvedBoard = solveBoardLogic(rowCluesStr, colCluesStr, rows, cols);
    if (!solvedBoard) {
      setHintInfo({
        text: '⚠️ 题目本身存在无法调和的矛盾，请检查线索输入是否正确！',
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
        text: `⚠️ 发现疑似冲突！第 ${errorR + 1} 行，第 ${errorC + 1} 列与逻辑推演不符。注意：未执行存档。`,
        type: 'cell',
        r: errorR,
        c: errorC,
        isError: true,
      });
    } else {
      setLastCorrectSnapshot(cloneGrid(grid));
      if (solvedBoard.some((row) => row.includes(-1))) {
        setAlertMsg('✅ 检查通过并存为正确回溯点！当前无逻辑冲突，但可能有多解或需试错。');
      } else {
        setAlertMsg('✅ 检查通过并存为正确回溯点！当前进度完全正确，请继续保持！');
      }
    }
  }, [mode, rowCluesStr, colCluesStr, rows, cols, grid]);

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
      setAlertMsg('🔙 已成功回溯到上一次【检查无误】的进度点！');
    } else {
      setAlertMsg('您还未在无错时执行过【检查错误】，没有可回溯的记录。');
    }
  }, [lastCorrectSnapshot, grid, rows, cols, mode, isSolvedStatus, recordMove]);

  const provideHint = useCallback(() => {
    setHintInfo(null);
    setAlertMsg('');
    if (isSolvedStatus) {
      setHintInfo({ text: '🎉 谜题已经完成了！无需提示啦。', type: 'success' });
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
          text: `⚠️ 警告：在 横向第 ${r + 1} 行 发现了逻辑矛盾！当前填入的格子已经无法满足该行的线索，请检查并擦除错误的地方。`,
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
          text: `⚠️ 警告：在 纵向第 ${c + 1} 列 发现了逻辑矛盾！当前填入的格子已经无法满足该列的线索，请仔细检查。`,
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
      const direction = bestHint.type === 'row' ? '横向第' : '纵向第';
      const clueText =
        bestHint.type === 'row'
          ? rowCluesStr[bestHint.index]
          : colCluesStr[bestHint.index].replace(/\n/g, ' ');
      const explainStr =
        bestHint.sureBlack > 0 && bestHint.sureCross > 0
          ? `必然有 ${bestHint.sureBlack} 个可以涂黑的方块，以及 ${bestHint.sureCross} 个可以打叉的空白。`
          : bestHint.sureBlack > 0
            ? `必然有 ${bestHint.sureBlack} 个方块是可以被安全涂黑的。`
            : `必然有 ${bestHint.sureCross} 个地方是不可能被打叉的（应该打叉）。`;
      setHintInfo({
        text: `💡 破局点在 ${direction} ${bestHint.index + 1} 行/列 (线索: ${clueText})。结合您现有的标记，排除掉所有不可能的组合后，${explainStr} 试着推演一下这一段！`,
        type: bestHint.type,
        index: bestHint.index,
        isError: false,
      });
    } else {
      setHintInfo({
        text: '🧠 当前盘面没有简单的单行/单列线索可以推进了。您可能需要结合多行交叉推导，或者利用假设法（推演模式）来进行下一步试探。',
        type: 'info',
        isError: false,
      });
    }
  }, [isSolvedStatus, rowCluesStr, colCluesStr, rows, cols, grid]);

  const autoSolve = useCallback(() => {
    setAlertMsg('');
    setHintInfo(null);
    const solvedBoard = solveBoardLogic(rowCluesStr, colCluesStr, rows, cols);
    if (!solvedBoard) {
      setAlertMsg('当前题目存在矛盾，无解！');
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
    if (currentPuzzleId) completedRef.current = currentPuzzleId;
    if (solvedBoard.some((row) => row.includes(-1))) {
      setAlertMsg('逻辑推导已完成。剩余部分存在多解或需要深度试错。');
    }
    setDeductionLevel(0);
    setBackupGrids([]);
  }, [rowCluesStr, colCluesStr, rows, cols, mode, recordMove, currentPuzzleId]);

  // ==========================================
  // 8. 收藏夹
  // ==========================================
  const applyImportedData = useCallback((data) => {
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
      setAlertMsg('✅ 存档导入成功！已恢复进度。');
      setMode('play');
    } else {
      throw new Error('格式不完整');
    }
  }, [resetTimer]);

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
              okItem.created
                ? '✅ 题目已校验唯一解并加入服务器题库'
                : '✅ 题目已在服务器题库中（重复导入）',
            );
          } else if (r.results[0]) {
            setAlertMsg(`⚠️ 题目已载入游玩，但未能入库：${r.results[0].reason}`);
          }
        })
        .catch(() => {});
    },
    [user],
  );

  const login = useCallback(async (username, password) => {
    setAuthBusy(true);
    try {
      const me = await api.login(username, password);
      setUser(me);
      refreshUserProgress();
      setAlertMsg(`✅ 欢迎回来，${me.username}！`);
    } catch (e) {
      setAlertMsg(`❌ 登录失败：${e.message}`);
    } finally {
      setAuthBusy(false);
    }
  }, [refreshUserProgress]);

  const register = useCallback(async (username, password) => {
    setAuthBusy(true);
    try {
      const me = await api.register(username, password);
      setUser(me);
      refreshUserProgress();
      setAlertMsg(`✅ 注册成功，${me.username}！`);
    } catch (e) {
      setAlertMsg(`❌ 注册失败：${e.message}`);
    } finally {
      setAuthBusy(false);
    }
  }, [refreshUserProgress]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // 忽略登出接口错误
    }
    setUser(null);
    setUserProgress([]);
    setAlertMsg('已退出登录');
  }, []);

  // ==========================================
  // 9. 导入 / 导出
  // ==========================================
  const handleExportCode = useCallback(async () => {
    const finalFilename =
      exportFilename.trim() || buildPuzzleExportName({ rows, cols, progressPercent });
    const code = buildExportCode(
      {
        rows,
        cols,
        rowCluesStr,
        colCluesStr,
        grid,
        markedRowClues,
        markedColClues,
        isSolvedStatus,
        deductionLevel,
      },
      exportRemark,
    );
    try {
      await copyToClipboard(code);
      setAlertMsg(`✅ 存档代码 [${finalFilename}] 已复制（已压缩，更短）！`);
    } catch {
      setAlertMsg('✅ 存档代码已生成，请在下方手动复制。');
    }
  }, [
    exportFilename,
    exportRemark,
    rows,
    cols,
    progressPercent,
    rowCluesStr,
    colCluesStr,
    grid,
    markedRowClues,
    markedColClues,
    isSolvedStatus,
    deductionLevel,
  ]);

  const handleExportJSON = useCallback(() => {
    const data = buildExportData(
      {
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
      },
      exportRemark,
    );
    const finalFilename =
      exportFilename.trim() || buildPuzzleExportName({ rows, cols, progressPercent });
    downloadJSON(finalFilename, data);
    setAlertMsg(`✅ 存档文件 [${finalFilename}] 已成功下载！`);
  }, [
    exportFilename,
    exportRemark,
    rows,
    cols,
    progressPercent,
    rowCluesStr,
    colCluesStr,
    grid,
    markedRowClues,
    markedColClues,
    isSolvedStatus,
    deductionLevel,
    backupGrids,
  ]);

  const exportAsImage = useCallback(
    async (format = 'png', options = {}) => {
      try {
        setAlertMsg('正在生成高清图片，请稍候...');
        const finalFilename =
          exportFilename.trim() || buildPuzzleExportName({ rows, cols, progressPercent });
        await exportBoardAsImage(
          {
            grid,
            rows,
            cols,
            rowCluesStr,
            colCluesStr,
            markedRowClues,
            markedColClues,
            gameSettings,
          },
          { parseClue, getAutoMarked, theme: DEFAULT_THEME },
          { filename: finalFilename, remark: exportRemark.trim(), ...options },
          format,
        );
        const scaleText = options.scale && options.scale > 1 ? `（${options.scale}x 高清）` : '';
        setAlertMsg(`✅ 成功导出为 ${format.toUpperCase()} 图片${scaleText}！`);
      } catch (err) {
        setAlertMsg(`❌ 图片导出失败: ${err.message}`);
      }
    },
    [
      exportFilename,
      exportRemark,
      grid,
      rows,
      cols,
      progressPercent,
      rowCluesStr,
      colCluesStr,
      markedRowClues,
      markedColClues,
      gameSettings,
    ],
  );

  /** 从存档代码导入（base64 → JSON → 应用到盘面） */
  const importFromCode = useCallback(
    (code) => {
      const data = decodeExportCode(code);
      applyImportedData(data);
      submitToLibrary(data);
    },
    [applyImportedData, submitToLibrary],
  );

  /**
   * 代码导入：输入框有内容直接用；
   * 为空时一键读取剪贴板（需 HTTPS 或浏览器授权），自动填入并导入。
   */
  const handleLocalImportCode = useCallback(async () => {
    let code = localImportData.trim();
    if (!code) {
      try {
        if (!navigator.clipboard?.readText) throw new Error('unsupported');
        code = (await navigator.clipboard.readText()).trim();
        if (!code) {
          setAlertMsg('剪贴板为空，请先复制存档代码');
          return;
        }
        setLocalImportData(code);
      } catch {
        setAlertMsg('无法自动读取剪贴板（需要 HTTPS 或浏览器授权），请手动粘贴后点击导入');
        return;
      }
    }
    try {
      importFromCode(code);
      setLocalImportData('');
    } catch {
      setAlertMsg('❌ 导入失败，存档代码格式错误或已损坏！');
    }
  }, [localImportData, importFromCode]);

  /** 文件导入：直接接收 File 对象（文件选择与拖拽共用） */
  const handleImportFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = normalizePuzzleData(JSON.parse(event.target.result));
          applyImportedData(data);
          submitToLibrary(data);
        } catch {
          setAlertMsg('❌ 导入失败，文件格式错误或已损坏！');
        }
      };
      reader.readAsText(file);
    },
    [applyImportedData, submitToLibrary],
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
  }, [cols, cellSize]);

  const handleImport = useCallback(async () => {
    const data = importData.trim();
    if (!data) return;
    setIsImporting(true);
    setHintInfo(null);
    setAlertMsg('');
    try {
      if (data.startsWith('http://') || data.startsWith('https://')) {
        setAlertMsg('正在尝试通过代理拉取网页...');
        const proxies = [
          `https://api.allorigins.win/get?url=${encodeURIComponent(data)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(data)}`,
        ];
        let html = null;
        for (const proxy of proxies) {
          try {
            const response = await fetch(proxy);
            if (response.ok) {
              html = proxy.includes('allorigins')
                ? (await response.json()).contents
                : await response.text();
              if (html && html.includes('<html')) break;
            }
          } catch {
            console.warn('Proxy fetch attempt failed, trying next proxy.');
          }
        }
        if (!html || !html.includes('<html')) {
          throw new Error('代理请求失败或被目标网站拦截。请直接使用【粘贴网页源代码】的方式提取！');
        }
        const puzzle = extractPuzzleFromHtml(html);
        initBoard(puzzle.rows, puzzle.cols, puzzle.rowClues, puzzle.colClues);
        const importedData = {
          rows: puzzle.rows,
          cols: puzzle.cols,
          rowCluesStr: puzzle.rowClues.map((arr) => arr.join('.')),
          colCluesStr: puzzle.colClues.map((arr) => arr.join('.')),
          grid: null,
        };
        submitToLibrary(importedData);
        setAlertMsg(`✅ 提取成功！生成 ${puzzle.rows} × ${puzzle.cols} 谜题。`);
      } else {
        const puzzle = extractPuzzleFromHtml(data);
        initBoard(puzzle.rows, puzzle.cols, puzzle.rowClues, puzzle.colClues);
        const importedData = {
          rows: puzzle.rows,
          cols: puzzle.cols,
          rowCluesStr: puzzle.rowClues.map((arr) => arr.join('.')),
          colCluesStr: puzzle.colClues.map((arr) => arr.join('.')),
          grid: null,
        };
        submitToLibrary(importedData);
        setAlertMsg(`✅ 提取成功！生成 ${puzzle.rows} × ${puzzle.cols} 谜题。`);
      }
      setImportData('');
      setMode('play');
    } catch (e) {
      setAlertMsg(`❌ 提取失败: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  }, [importData, initBoard, submitToLibrary]);

  const handleModeChange = useCallback((m) => {
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
  }, [grid, rowCluesStr, colCluesStr, markedRowClues, markedColClues]);

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
  }, []);

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
          submitToLibrary({
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
      submitToLibrary({
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
    setAlertMsg('✅ 题目已更新，开始游玩！');
  }, [editInputMode, grid, rows, cols, user, submitToLibrary, rowCluesStr, colCluesStr]);

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
      setAlertMsg('✅ 已从图片生成图案，可微调后点击“完成编辑并游玩”入库');
    },
    [],
  );

  /** 滚轮缩放棋盘 */
  const zoomBoard = useCallback((delta) => {
    setCellSize((prev) => Math.min(MAX_CELL_SIZE, Math.max(MIN_CELL_SIZE, prev + delta)));
  }, []);

  // ==========================================
  // 10. 悬浮线索提示（工具提示）分析
  // ==========================================
  const showMeasure = mode === 'play' && measureStart && hoverPos.r !== -1 && hoverPos.c !== -1;
  const showHoverRow = mode === 'play' && gameSettings.hoverRowClues && hoverPos.r !== -1;
  const showHoverCol = mode === 'play' && gameSettings.hoverColClues && hoverPos.c !== -1;

  // 编辑-画盘面模式：根据当前图案实时推导的行/列线索预览
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
    importData,
    isImporting,
    localImportData,
    exportFilename,
    exportRemark,
    browse,
    gameSettings,
    hoverPos,
    measureStart,
    markedRowClues,
    markedColClues,
    lastCorrectSnapshot,
    isSolvedStatus,
    clueTextSize: getClueTextSize(),
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
    setImportData,
    setLocalImportData,
    setExportFilename,
    setExportRemark,
    initBoard,
    clearBoard,
    clearClues,
    generateRandom,
    loadPuzzles,
    openPuzzleFromBrowse,
    renamePuzzle,
    zoomBoard,
    applyPatternImage,
    timerSeconds,
    timerRunning,
    togglePauseTimer,
    moveHistory,
    userProgress,
    refreshUserProgress,
    isGeneratingGif,
    generateReplayGif,
    toggleMarkedRow,
    toggleMarkedCol,
    editRowClue,
    editColClue,
    handleCellMouseDown,
    handleCellMouseEnter,
    startTouchPaint,
    continueTouchPaint,
    endTouchPaint,
    handleGlobalLeave,
    startDeduction,
    applyDeduction,
    cancelDeduction,
    validateGrid,
    restoreLastCorrect,
    provideHint,
    autoSolve,
    handleExportCode,
    handleExportJSON,
    exportAsImage,
    handleLocalImportCode,
    handleImportFile,
    handleImport,
    handleModeChange,
    cancelEditing,
    finishEditing,
    login,
    register,
    logout,
    fitToWidth,
    setMode,
  };
}
