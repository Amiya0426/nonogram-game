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
import { extractPuzzleFromHtml } from '../logic/importer.js';
import { api } from '../api.js';
import {
  downloadJSON,
  buildExportData,
  copyToClipboard,
  exportBoardAsImage,
} from '../logic/exporter.js';

const COLLECTION_KEY = 'nonogram_collection';

export default function useGameState() {
  // ==========================================
  // 1. 初始状态（不做自动存档：仅默认盘面 + 手动检查错误快照）
  // ==========================================
  const [mode, setMode] = useState('play');
  const [editInputMode, setEditInputMode] = useState('pattern');
  const [user, setUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [rows, setRows] = useState(PRESETS.heart.rows);
  const [cols, setCols] = useState(PRESETS.heart.cols);

  const [rowCluesStr, setRowCluesStr] = useState(
    PRESETS.heart.rowClues.map((c) => c.join(' ')),
  );
  const [colCluesStr, setColCluesStr] = useState(
    PRESETS.heart.colClues.map((c) => c.join('\n')),
  );

  const [grid, setGrid] = useState(createGrid(PRESETS.heart.rows, PRESETS.heart.cols));
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);

  const [interactionMode, setInteractionMode] = useState('toggle');
  const [currentBrush, setCurrentBrush] = useState(1);

  const [dragAction, setDragAction] = useState(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [hintInfo, setHintInfo] = useState(null);

  const [deductionLevel, setDeductionLevel] = useState(0);
  const [backupGrids, setBackupGrids] = useState([]);

  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [isPanelPinned, setIsPanelPinned] = useState(true);
  const [isPanelHovered, setIsPanelHovered] = useState(false);

  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [localImportData, setLocalImportData] = useState('');
  const [exportFilename, setExportFilename] = useState('nonogram-save');
  const [exportRemark, setExportRemark] = useState('');

  const [puzzleCollection, setPuzzleCollection] = useState(() =>
    loadJSON(COLLECTION_KEY, []),
  );
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);

  const [randomDifficulty, setRandomDifficulty] = useState('medium');

  const [gameSettings, setGameSettings] = useState({ ...DEFAULT_SETTINGS });

  const [hoverPos, setHoverPos] = useState({ r: -1, c: -1 });
  const [markedRowClues, setMarkedRowClues] = useState({});
  const [markedColClues, setMarkedColClues] = useState({});
  const [lastCorrectSnapshot, setLastCorrectSnapshot] = useState(null);

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

  // 页面加载时恢复登录态：若会话有效，自动把本地收藏合并到云端
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        setUser(me);
        const cloud = await api.listCollections();
        if (cancelled) return;
        const local = loadJSON(COLLECTION_KEY, []);
        const existingKeys = new Set(
          cloud.map((c) => `${c.name}|${c.cols}x${c.rows}`),
        );
        const toUpload = local.filter(
          (item) => !existingKeys.has(`${item.name}|${item.cols}x${item.rows}`),
        );
        if (toUpload.length > 0) {
          for (const item of toUpload) {
            try {
              await api.addCollection(item);
            } catch {
              // 单个失败不阻塞
            }
          }
          saveJSON(COLLECTION_KEY, []);
        }
        const merged = await api.listCollections();
        if (cancelled) return;
        setPuzzleCollection(merged);
      } catch {
        // 未登录或会话失效：保持本地收藏
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  }, []);

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
  }, []);

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

  const generateRandom = useCallback(() => {
    let prob = 0.55;
    if (randomDifficulty === 'easy') prob = 0.65;
    if (randomDifficulty === 'hard') prob = 0.4;

    const randomGrid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() < prob ? 1 : 0)),
    );
    if (randomDifficulty !== 'easy' && rows > 2 && cols > 2) {
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
  }, [rows, cols, randomDifficulty, initBoard, mode, editInputMode]);

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
  }, [hintInfo]);

  const handleCellMouseDown = useCallback(
    (e, r, c) => {
      const editable = mode === 'play' || (mode === 'edit' && editInputMode === 'pattern');
      if (!editable) return;
      e.preventDefault();
      let newAction = 0;
      const currentVal = grid[r][c];
      const CF = deductionLevel * 2 + 1;
      const CX = deductionLevel * 2 + 2;

      if (mode === 'play') {
        if (e.button === 0) {
          if (interactionMode === 'toggle') {
            newAction =
              currentVal === 0 || (currentVal !== CF && currentVal !== CX)
                ? CF
                : currentVal === CF
                  ? CX
                  : 0;
          } else {
            newAction = currentBrush === 1 ? CF : currentBrush === 2 ? CX : 0;
          }
        } else if (e.button === 2) {
          newAction = currentVal === CX ? 0 : CX;
        }
      } else {
        // 编辑-画盘面模式：简单 0/1/2 循环
        if (e.button === 0) {
          if (interactionMode === 'toggle') {
            newAction = currentVal === 0 ? 1 : currentVal === 1 ? 2 : 0;
          } else {
            newAction = currentBrush === 1 ? 1 : currentBrush === 2 ? 2 : 0;
          }
        } else if (e.button === 2) {
          newAction = currentVal === 2 ? 0 : 2;
        } else {
          newAction = 0;
        }
      }
      setDragAction(newAction);
      updateCellValue(r, c, newAction);
    },
    [mode, editInputMode, grid, interactionMode, currentBrush, deductionLevel, updateCellValue],
  );

  const handleCellMouseEnter = useCallback(
    (e, r, c) => {
      const editable = mode === 'play' || (mode === 'edit' && editInputMode === 'pattern');
      if (dragAction !== null && e.buttons === 0) setDragAction(null);
      scheduleHover(r, c);
      if (!editable || dragAction === null || e.buttons === 0) return;
      updateCellValue(r, c, dragAction);
    },
    [dragAction, mode, editInputMode, scheduleHover, updateCellValue],
  );

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
      setGrid((g) =>
        g.map((row) =>
          row.map((v) => (v === currentCF ? targetCF : v === currentCX ? targetCX : v)),
        ),
      );
      setBackupGrids((prev) => prev.slice(0, -1));
      setDeductionLevel((prev) => prev - 1);
      setAlertMsg(`✅ 成功将 ${deductionLevel} 级推演应用到上级盘面。`);
    }
  }, [deductionLevel]);

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
      setHintInfo(null);
      setAlertMsg('🔙 已成功回溯到上一次【检查无误】的进度点！');
    } else {
      setAlertMsg('您还未在无错时执行过【检查错误】，没有可回溯的记录。');
    }
  }, [lastCorrectSnapshot]);

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
    setGrid(finalGrid);
    if (solvedBoard.some((row) => row.includes(-1))) {
      setAlertMsg('逻辑推导已完成。剩余部分存在多解或需要深度试错。');
    }
    setDeductionLevel(0);
    setBackupGrids([]);
  }, [rowCluesStr, colCluesStr, rows, cols]);

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
      setAlertMsg('✅ 存档导入成功！已恢复进度。');
      setMode('play');
    } else {
      throw new Error('格式不完整');
    }
  }, []);

  /** 把本地收藏（localStorage）合并上传到云端，按 名称+尺寸 去重 */
  const mergeLocalToCloud = useCallback(async () => {
    const cloud = await api.listCollections();
    const local = loadJSON(COLLECTION_KEY, []);
    const existingKeys = new Set(
      cloud.map((c) => `${c.name}|${c.cols}x${c.rows}`),
    );
    const toUpload = local.filter(
      (item) => !existingKeys.has(`${item.name}|${item.cols}x${item.rows}`),
    );
    for (const item of toUpload) {
      try {
        await api.addCollection(item);
      } catch {
        // 单个失败不阻塞
      }
    }
    const merged = await api.listCollections();
    setPuzzleCollection(merged);
    saveJSON(COLLECTION_KEY, []);
    return { uploaded: toUpload.length, total: merged.length };
  }, []);

  const login = useCallback(async (username, password) => {
    setAuthBusy(true);
    try {
      const me = await api.login(username, password);
      setUser(me);
      const { uploaded } = await mergeLocalToCloud();
      setAlertMsg(
        uploaded > 0
          ? `✅ 欢迎回来，${me.username}！已将 ${uploaded} 个本地收藏同步到云端。`
          : `✅ 欢迎回来，${me.username}！`,
      );
    } catch (e) {
      setAlertMsg(`❌ 登录失败：${e.message}`);
    } finally {
      setAuthBusy(false);
    }
  }, [mergeLocalToCloud]);

  const register = useCallback(async (username, password) => {
    setAuthBusy(true);
    try {
      const me = await api.register(username, password);
      setUser(me);
      const { uploaded } = await mergeLocalToCloud();
      setAlertMsg(
        uploaded > 0
          ? `✅ 注册成功，${me.username}！已将 ${uploaded} 个本地收藏同步到云端。`
          : `✅ 注册成功，${me.username}！现在可以云端保存收藏了。`,
      );
    } catch (e) {
      setAlertMsg(`❌ 注册失败：${e.message}`);
    } finally {
      setAuthBusy(false);
    }
  }, [mergeLocalToCloud]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // 忽略登出接口错误
    }
    setUser(null);
    setPuzzleCollection(loadJSON(COLLECTION_KEY, []));
    setSelectedCollectionIds([]);
    setAlertMsg('已退出登录，云端收藏已保留，随时可再登录。');
  }, []);

  const saveToCollection = useCallback(() => {
    const name = prompt(
      '请输入此题目的名称以便后续识别：',
      exportFilename || '自定义谜题',
    );
    if (!name) return;
    const item = {
      name,
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
    };
    if (user) {
      api
        .addCollection(item)
        .then((saved) => {
          setPuzzleCollection((prev) => [saved, ...prev]);
          setSelectedCollectionIds((prev) => [saved.id, ...prev]);
          setAlertMsg(`✅ 题目 "${name}" 已存入云端收藏夹！`);
        })
        .catch((e) => setAlertMsg(`❌ 保存失败：${e.message}`));
    } else {
      const newCol = [
        { id: Date.now(), name, date: new Date().toLocaleString(), ...item },
        ...puzzleCollection,
      ];
      setPuzzleCollection(newCol);
      setSelectedCollectionIds((prev) => [newCol[0].id, ...prev]);
      saveJSON(COLLECTION_KEY, newCol);
      setAlertMsg(`✅ 题目 "${name}" 已存入本地收藏夹！登录后可同步到云端。`);
    }
  }, [
    user,
    exportFilename,
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
    puzzleCollection,
  ]);

  const loadFromCollection = useCallback(
    (item) => {
      applyImportedData(item);
      setExportFilename(item.name);
    },
    [applyImportedData],
  );

  const toggleCollectionSelection = useCallback((id) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }, []);

  const selectAllCollection = useCallback(() => {
    setSelectedCollectionIds(puzzleCollection.map((item) => item.id));
  }, [puzzleCollection]);

  const clearCollectionSelection = useCallback(() => {
    setSelectedCollectionIds([]);
  }, []);

  const deleteFromCollection = useCallback((id) => {
    if (!confirm('确定要永久删除这个收藏的题目吗？')) return;
    if (user) {
      api
        .deleteCollection(id)
        .then(() => {
          setPuzzleCollection((prev) => prev.filter((p) => p.id !== id));
          setSelectedCollectionIds((prev) => prev.filter((itemId) => itemId !== id));
        })
        .catch((e) => setAlertMsg(`❌ 删除失败：${e.message}`));
    } else {
      setPuzzleCollection((prev) => {
        const newCol = prev.filter((p) => p.id !== id);
        saveJSON(COLLECTION_KEY, newCol);
        return newCol;
      });
      setSelectedCollectionIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  }, [user]);

  // ==========================================
  // 9. 导入 / 导出
  // ==========================================
  const handleExportCode = useCallback(async () => {
    const finalFilename = exportFilename.trim() || 'nonogram-save';
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
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(encodeURIComponent(jsonStr));
    try {
      await copyToClipboard(base64);
      setAlertMsg(`✅ 存档代码 [${finalFilename}] 已成功复制！`);
    } catch {
      setAlertMsg('✅ 存档代码已生成，请在下方手动复制。');
    }
  }, [
    exportFilename,
    exportRemark,
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
  ]);

  const handleExportJSON = useCallback(() => {
    const finalFilename = exportFilename.trim() || 'nonogram-save';
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
    downloadJSON(finalFilename, data);
    setAlertMsg(`✅ 存档文件 [${finalFilename}] 已成功下载！`);
  }, [
    exportFilename,
    exportRemark,
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
  ]);

  const handleExportCollectionJSON = useCallback(
    (selectedOnly = false) => {
      if (!puzzleCollection.length) {
        setAlertMsg('❌ 当前收藏夹为空，无法批量下载。');
        return;
      }
      const exportItems = selectedOnly
        ? puzzleCollection.filter((item) => selectedCollectionIds.includes(item.id))
        : puzzleCollection;
      if (!exportItems.length) {
        setAlertMsg('❌ 当前没有选中任何收藏题目，无法下载。');
        return;
      }
      const finalFilename =
        exportFilename.trim() ||
        (selectedOnly ? 'nonogram-collection-selected' : 'nonogram-collection');
      downloadJSON(finalFilename, exportItems);
      setAlertMsg(
        `✅ 已${selectedOnly ? '下载所选收藏题目' : '批量下载收藏夹'}中的 ${exportItems.length} 个题目为 JSON 文件！`,
      );
    },
    [puzzleCollection, selectedCollectionIds, exportFilename],
  );

  const exportAsImage = useCallback(
    (format = 'png') => {
      try {
        setAlertMsg('正在生成高清图片，请稍候...');
        const finalFilename = exportFilename.trim() || 'nonogram-save';
        exportBoardAsImage(
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
          { filename: finalFilename, remark: exportRemark.trim() },
          format,
        );
        setAlertMsg(`✅ 成功导出为 ${format.toUpperCase()} 格式的图片！`);
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
      rowCluesStr,
      colCluesStr,
      markedRowClues,
      markedColClues,
      gameSettings,
    ],
  );

  const handleLocalImportCode = useCallback(() => {
    try {
      const jsonStr = decodeURIComponent(atob(localImportData.trim()));
      applyImportedData(JSON.parse(jsonStr));
      setLocalImportData('');
    } catch {
      setAlertMsg('❌ 导入失败，存档代码格式错误或已损坏！');
    }
  }, [localImportData, applyImportedData]);

  const handleImportFile = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          applyImportedData(JSON.parse(event.target.result));
        } catch {
          setAlertMsg('❌ 导入失败，文件格式错误或已损坏！');
        }
      };
      reader.readAsText(file);
      e.target.value = null;
    },
    [applyImportedData],
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
        setAlertMsg(`✅ 提取成功！生成 ${puzzle.rows} × ${puzzle.cols} 谜题。`);
      } else {
        const puzzle = extractPuzzleFromHtml(data);
        initBoard(puzzle.rows, puzzle.cols, puzzle.rowClues, puzzle.colClues);
        setAlertMsg(`✅ 提取成功！生成 ${puzzle.rows} × ${puzzle.cols} 谜题。`);
      }
      setImportData('');
      setMode('play');
    } catch (e) {
      setAlertMsg(`❌ 提取失败: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  }, [importData, initBoard]);

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
        setRowCluesStr(rClues.map((c) => c.join(' ')));
        setColCluesStr(cClues.map((c) => c.join('\n')));
      }
      // 图案只是设计稿：完成后面板清空，让玩家从头解谜
      setGrid(createGrid(rows, cols));
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
  }, [editInputMode, grid, rows, cols]);

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
    puzzleCollection,
    selectedCollectionIds,
    randomDifficulty,
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
    setRandomDifficulty,
    setImportData,
    setLocalImportData,
    setExportFilename,
    setExportRemark,
    initBoard,
    clearBoard,
    clearClues,
    generateRandom,
    toggleMarkedRow,
    toggleMarkedCol,
    editRowClue,
    editColClue,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleGlobalLeave,
    startDeduction,
    applyDeduction,
    cancelDeduction,
    validateGrid,
    restoreLastCorrect,
    provideHint,
    autoSolve,
    saveToCollection,
    loadFromCollection,
    toggleCollectionSelection,
    selectAllCollection,
    clearCollectionSelection,
    deleteFromCollection,
    handleExportCode,
    handleExportJSON,
    handleExportCollectionJSON,
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
