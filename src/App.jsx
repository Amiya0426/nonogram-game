import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings, Play, Check, RefreshCw, Dices, Eraser, 
  AlertCircle, ZoomIn, MousePointerClick, PaintRoller, 
  Square, CheckSquare, XSquare, Menu, FileMinus, Lightbulb,
  Link as LinkIcon, Download, Code, SearchCheck,
  ChevronRight, Pin, PinOff, Maximize, SaveAll, UploadCloud, 
  ClipboardCopy, FileJson, Image as ImageIcon, FileText, MessageSquare,
  Library, Trash2, PlayCircle, BookmarkPlus, GitBranch, X
} from 'lucide-react';

// --- 预设题目库 ---
const PRESETS = {
  heart: {
    name: '心形 (5x5)',
    rows: 5, cols: 5,
    rowClues: [[1, 1], [5], [5], [3], [1]],
    colClues: [[2], [4], [4], [4], [2]]
  },
  duck: {
    name: '小黄鸭 (10x10)',
    rows: 10, cols: 10,
    rowClues: [[3], [2, 1], [3, 2], [8], [9], [2, 6], [1, 5], [1, 5], [1, 4], [4]],
    colClues: [[2], [1, 3], [2, 6], [2, 8], [9], [10], [1, 6], [4], [3], [3]]
  },
  smile: {
    name: '笑脸 (10x10)',
    rows: 10, cols: 10,
    rowClues: [[4], [2, 2], [1, 2, 1], [1, 1], [1, 1], [1, 1, 1, 1], [1, 1], [1, 4, 1], [2, 2], [4]],
    colClues: [[4], [2, 2], [1, 2, 1], [1, 1, 1], [1, 1, 2], [1, 1, 2], [1, 1, 1], [1, 2, 1], [2, 2], [4]]
  },
  uploaded_puzzle: {
    name: '截图谜题 (30x25)',
    rows: 30, cols: 25,
    rowClues: [
      [3, 5, 3, 7], [3, 5, 2, 7], [1, 1, 7, 1, 4], [2, 5, 1, 3], [2, 5, 3],
      [1, 2, 3, 3, 3], [1, 2, 3, 2, 1], [6, 1, 3, 2], [5, 3, 4], [7, 1, 5, 4],
      [7, 2, 3], [1, 3, 2, 1, 1, 1], [4, 2, 4, 1], [1, 6, 9], [3, 6, 2, 3, 4],
      [7, 2, 3, 4], [4, 2, 2, 4], [3, 5, 3], [1, 2, 1, 2, 2], [3, 2, 2],
      [3, 1, 2], [1, 10, 3], [1, 1, 5, 1, 1, 6], [1, 2, 5, 4, 4], [4, 1, 4, 3, 1, 4],
      [4, 1, 1, 4], [4, 3, 2], [3, 4], [3, 1, 10], [4, 11]
    ],
    colClues: [
      [2, 2, 4, 9], [2, 3, 4, 4, 6], [3, 5, 4, 6], [4, 4, 3, 1], [4, 1, 2, 2],
      [1, 9, 3], [3, 7, 3], [2, 3, 6, 7, 1], [2, 3, 2, 1, 1], [3, 2, 4, 1],
      [6, 4, 2, 1, 2, 5], [7, 1, 2, 1, 1, 3, 1], [1, 1, 1, 2], [7, 2, 10], [1, 3, 1, 2, 2, 1, 7],
      [1, 2, 2, 5, 3], [11, 1, 3], [3, 4, 8, 1, 2], [3, 4, 1, 5, 3, 2], [2, 3, 1, 1, 1, 1, 2],
      [2, 1, 4, 2, 2], [3, 2, 5, 4, 2], [4, 6, 6, 4], [4, 1, 5, 11], [4, 1, 2, 3, 1, 1]
    ]
  }
};

export default function NonogramApp() {
  // --- 状态管理 ---
  const [mode, setMode] = useState('play'); 
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  
  const [rowCluesStr, setRowCluesStr] = useState(PRESETS.heart.rowClues.map(c => c.join(' ')));
  const [colCluesStr, setColCluesStr] = useState(PRESETS.heart.colClues.map(c => c.join('\n')));
  
  // grid 中: 0:空 | 主盘: 1黑 2叉 | 1级: 3紫黑 4紫叉 | 2级: 5蓝黑 6蓝叉 | 3级: 7黄黑 8黄叉
  const [grid, setGrid] = useState(Array(5).fill().map(() => Array(5).fill(0))); 
  const [cellSize, setCellSize] = useState(32); 

  const [interactionMode, setInteractionMode] = useState('toggle'); 
  const [currentBrush, setCurrentBrush] = useState(1); 

  const [dragAction, setDragAction] = useState(null); 
  const [isSolvedStatus, setIsSolvedStatus] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  
  const [hintInfo, setHintInfo] = useState(null);
  
  // 多级推演模式状态
  const [deductionLevel, setDeductionLevel] = useState(0); // 0(主), 1, 2, 3
  const [backupGrids, setBackupGrids] = useState([]); // 存各级快照

  // 面板显示与停靠状态
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [isPanelPinned, setIsPanelPinned] = useState(true); 
  const [isPanelHovered, setIsPanelHovered] = useState(false);

  // 网页导入与存档状态
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const [showLocalImport, setShowLocalImport] = useState(false);
  const [localImportData, setLocalImportData] = useState('');
  const [exportData, setExportData] = useState('');
  
  const [exportFilename, setExportFilename] = useState('nonogram-save');
  const [exportRemark, setExportRemark] = useState('');

  // 题库收藏夹状态
  const [puzzleCollection, setPuzzleCollection] = useState([]);
  const [randomDifficulty, setRandomDifficulty] = useState('medium'); 

  // 辅助功能设置状态
  const [gameSettings, setGameSettings] = useState({
    completeLineStyle: 'highlight', 
    autoMarkNumbers: true,
    hoverRowClues: true,
    hoverColClues: true,
    autoFillCross: true, 
  });

  // 交互状态
  const [hoverPos, setHoverPos] = useState({ r: -1, c: -1 }); 
  const [markedRowClues, setMarkedRowClues] = useState({}); 
  const [markedColClues, setMarkedColClues] = useState({}); 

  // 状态引用
  const hoverPosRef = useRef({ r: -1, c: -1 });
  const measureStartRef = useRef(null);
  const [measureStart, setMeasureStart] = useState(null);
  
  const cluesRef = useRef({ r: [], c: [] });
  const settingsRef = useRef(gameSettings);

  useEffect(() => { hoverPosRef.current = hoverPos; }, [hoverPos]);
  useEffect(() => { cluesRef.current = { r: rowCluesStr, c: colCluesStr }; }, [rowCluesStr, colCluesStr]);
  useEffect(() => { settingsRef.current = gameSettings; }, [gameSettings]);

  // --- 初始化加载收藏夹与自动存读档 ---
  useEffect(() => {
    const storedCol = localStorage.getItem('nonogram_collection');
    if (storedCol) setPuzzleCollection(JSON.parse(storedCol));

    const interval = setInterval(() => {
      if (mode === 'play') {
        const data = { 
          rows, cols, rowCluesStr, colCluesStr, grid, markedRowClues, markedColClues, 
          isSolvedStatus, deductionLevel, backupGrids 
        };
        localStorage.setItem('nonogram_autosave_data', JSON.stringify(data));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [mode, rows, cols, rowCluesStr, colCluesStr, grid, markedRowClues, markedColClues, isSolvedStatus, deductionLevel, backupGrids]);

  const restoreAutoSave = () => {
    try {
      const jsonStr = localStorage.getItem('nonogram_autosave_data');
      if (jsonStr) {
        applyImportedData(JSON.parse(jsonStr));
      } else {
        setAlertMsg('ℹ️ 未找到自动存档数据。');
      }
    } catch (e) {
      setAlertMsg('❌ 恢复自动存档失败。');
    }
  };

  // --- 辅助函数 ---
  const parseClue = (str) => {
    if (typeof str !== 'string') return [0];
    const parsed = str.trim().split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
    return parsed.length > 0 ? parsed : [0];
  };

  const getClueTextSize = () => {
    if (cellSize < 20) return 'text-[11px]';
    if (cellSize < 28) return 'text-sm';
    if (cellSize < 40) return 'text-base';
    return 'text-lg';
  };

  const getLineClue = (line) => {
    const clues = [];
    let count = 0;
    for (let v of line) {
      // 一切奇数均视作黑块：1(主), 3(紫), 5(蓝), 7(黄)
      if (v % 2 === 1) count++;
      else if (count > 0) { clues.push(count); count = 0; }
    }
    if (count > 0) clues.push(count);
    return clues.length > 0 ? clues : [0];
  };

  const isLineCompleted = useCallback((lineIdx, isRow, currentGrid) => {
    const rawStr = isRow ? rowCluesStr[lineIdx] : colCluesStr[lineIdx];
    const targetClues = parseClue(rawStr);
    const line = isRow ? currentGrid[lineIdx] : currentGrid.map(row => row[lineIdx]);
    const currentClues = getLineClue(line);
    return JSON.stringify(targetClues) === JSON.stringify(currentClues);
  }, [rowCluesStr, colCluesStr]);

  // --- 全局检查完成状态的 useEffect ---
  useEffect(() => {
    if (mode !== 'play') return;
    let win = true;
    for (let r = 0; r < rows; r++) {
      if (!isLineCompleted(r, true, grid)) { win = false; break; }
    }
    if (win) {
      for (let c = 0; c < cols; c++) {
        if (!isLineCompleted(c, false, grid)) { win = false; break; }
      }
    }
    setIsSolvedStatus(win);
  }, [grid, mode, rows, cols, isLineCompleted]);

  // --- 带有 1000 ms 防抖的 自动打X 功能 ---
  useEffect(() => {
    // 推演模式下自动打 X 功能失效
    if (!gameSettings.autoFillCross || mode !== 'play' || isSolvedStatus || deductionLevel > 0) return;

    const timer = setTimeout(() => {
      setGrid(prevGrid => {
        let changed = false;
        let newGrid = prevGrid.map(row => [...row]);
        
        const parsedRowClues = rowCluesStr.map(parseClue);
        const parsedColClues = colCluesStr.map(parseClue);

        for (let r = 0; r < rows; r++) {
          const rowLine = newGrid[r];
          if (JSON.stringify(getLineClue(rowLine)) === JSON.stringify(parsedRowClues[r])) {
            for (let c = 0; c < cols; c++) {
              if (newGrid[r][c] === 0) { 
                newGrid[r][c] = 2; 
                changed = true; 
              }
            }
          }
        }
        
        for (let c = 0; c < cols; c++) {
          const colLine = newGrid.map(row => row[c]);
          if (JSON.stringify(getLineClue(colLine)) === JSON.stringify(parsedColClues[c])) {
            for (let r = 0; r < rows; r++) {
              if (newGrid[r][c] === 0) { 
                newGrid[r][c] = 2; 
                changed = true; 
              }
            }
          }
        }

        return changed ? newGrid : prevGrid; 
      });
    }, 1000); 

    return () => clearTimeout(timer); 
  }, [grid, gameSettings.autoFillCross, mode, isSolvedStatus, deductionLevel, rows, cols, rowCluesStr, colCluesStr]);

  // --- 重构：完美级 自动检测高亮算法 ---
  const getAutoMarked = useCallback((line, clues) => {
    const marked = new Array(clues.length).fill(false);
    const assignedBlocks = [];
    const blocks = [];
    let currentStart = -1;

    for (let i = 0; i <= line.length; i++) {
      const isBlack = i < line.length && (line[i] % 2 === 1);
      
      if (isBlack) {
        if (currentStart === -1) currentStart = i;
      } else {
        if (currentStart !== -1) {
          const isLeftBounded = currentStart === 0 || (line[currentStart - 1] > 0 && line[currentStart - 1] % 2 === 0);
          const isRightBounded = i === line.length || (line[i] > 0 && line[i] % 2 === 0);
          
          let hasUnknownLeft = false;
          for (let k = 0; k < currentStart; k++) {
            if (line[k] === 0) { hasUnknownLeft = true; break; }
          }
          let hasUnknownRight = false;
          for (let k = i; k < line.length; k++) {
            if (line[k] === 0) { hasUnknownRight = true; break; }
          }

          blocks.push({
            start: currentStart,
            end: i - 1,
            len: i - currentStart,
            isFullyBounded: isLeftBounded && isRightBounded,
            hasUnknownLeft,
            hasUnknownRight,
            assignedClueIdx: -1
          });
          currentStart = -1;
        }
      }
    }

    let clueIdx = 0;
    for (let b = 0; b < blocks.length; b++) {
      if (clueIdx >= clues.length) break;
      if (blocks[b].isFullyBounded && !blocks[b].hasUnknownLeft && blocks[b].len === clues[clueIdx]) {
        blocks[b].assignedClueIdx = clueIdx;
        marked[clueIdx] = true;
        assignedBlocks.push({ clueIdx, start: blocks[b].start, end: blocks[b].end });
        clueIdx++;
      } else {
        break; 
      }
    }

    clueIdx = clues.length - 1;
    for (let b = blocks.length - 1; b >= 0; b--) {
      if (clueIdx < 0) break;
      if (blocks[b].assignedClueIdx !== -1) break;
      if (blocks[b].isFullyBounded && !blocks[b].hasUnknownRight && blocks[b].len === clues[clueIdx]) {
        blocks[b].assignedClueIdx = clueIdx;
        marked[clueIdx] = true;
        assignedBlocks.push({ clueIdx, start: blocks[b].start, end: blocks[b].end });
        clueIdx--;
      } else {
        break;
      }
    }

    for (let b = 0; b < blocks.length; b++) {
      if (blocks[b].isFullyBounded && blocks[b].assignedClueIdx === -1) {
        const len = blocks[b].len;
        const matchingClues = [];
        for(let i = 0; i < clues.length; i++) {
          if (clues[i] === len) matchingClues.push(i);
        }
        if (matchingClues.length === 1) {
          const targetClueIdx = matchingClues[0];
          if (!marked[targetClueIdx]) {
            blocks[b].assignedClueIdx = targetClueIdx;
            marked[targetClueIdx] = true;
            assignedBlocks.push({ clueIdx: targetClueIdx, start: blocks[b].start, end: blocks[b].end });
          }
        }
      }
    }
    
    return { marked, assignedBlocks };
  }, []);

  const getInsertIdx = useCallback((lineLength, clues, mouseIdx, assignedBlocks) => {
    if (!clues || clues.length === 0 || clues[0] === 0) return 0;
    
    assignedBlocks.sort((a, b) => a.start - b.start);
    
    let leftBlock = null;
    let rightBlock = null;
    for (const b of assignedBlocks) {
        if (b.end < mouseIdx) {
            if (!leftBlock || b.end > leftBlock.end) leftBlock = b;
        }
        if (b.start > mouseIdx) {
            if (!rightBlock || b.start < rightBlock.start) rightBlock = b;
        }
    }
    
    for (const b of assignedBlocks) {
        if (mouseIdx >= b.start && mouseIdx <= b.end) {
            return b.clueIdx + 1; 
        }
    }
    
    const minCIdx = leftBlock ? leftBlock.clueIdx + 1 : 0;
    const maxCIdx = rightBlock ? rightBlock.clueIdx : clues.length;
    
    if (minCIdx >= maxCIdx) return minCIdx;
    
    const leftEnd = leftBlock ? leftBlock.end : -1;
    const rightStart = rightBlock ? rightBlock.start : lineLength;
    
    const physicalGap = rightStart - leftEnd;
    const offset = mouseIdx - leftEnd;
    const ratio = offset / physicalGap;
    
    const clueGapCount = maxCIdx - minCIdx;
    let insertIdx = minCIdx + Math.round(ratio * clueGapCount);
    
    if (insertIdx < minCIdx) insertIdx = minCIdx;
    if (insertIdx > maxCIdx) insertIdx = maxCIdx;
    
    return insertIdx;
  }, []);

  // --- 按 Ctrl 测量格子与悬浮位置追踪 ---
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
      if (tooltip) {
        tooltip.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`;
      }
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

  const handleGlobalLeave = () => {
    setHoverPos({ r: -1, c: -1 });
    measureStartRef.current = null;
    setMeasureStart(null);
  };

  const initBoard = (r, c, rClues, cClues) => {
    const validR = Math.max(1, Math.min(80, r)); 
    const validC = Math.max(1, Math.min(80, c));
    setRows(validR);
    setCols(validC);
    
    setRowCluesStr(rClues ? rClues.map(arr => arr.join(' ')) : Array(validR).fill('0'));
    setColCluesStr(cClues ? cClues.map(arr => arr.join('\n')) : Array(validC).fill('0'));
    
    setGrid(Array(validR).fill().map(() => Array(validC).fill(0)));
    setIsSolvedStatus(false);
    setAlertMsg('');
    setHintInfo(null);
    setMarkedRowClues({});
    setMarkedColClues({});
    setDeductionLevel(0);
    setBackupGrids([]);
  };

  const loadPreset = (presetKey) => {
    const p = PRESETS[presetKey];
    initBoard(p.rows, p.cols, p.rowClues, p.colClues);
  };

  const generateRandom = () => {
    let prob = 0.55; 
    if (randomDifficulty === 'easy') prob = 0.65;
    if (randomDifficulty === 'hard') prob = 0.40;

    let randomGrid = Array(rows).fill().map(() => 
      Array(cols).fill().map(() => (Math.random() < prob ? 1 : 0))
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
        else if (count > 0) { clues.push(count); count = 0; }
      }
      if (count > 0) clues.push(count);
      return clues.length > 0 ? clues : [0];
    };

    const newRowClues = randomGrid.map(row => extractClues(row));
    const newColClues = Array(cols).fill().map((_, colIdx) => 
      extractClues(randomGrid.map(row => row[colIdx]))
    );

    initBoard(rows, cols, newRowClues, newColClues);
    setGrid(Array(rows).fill().map(() => Array(cols).fill(0))); 
  };

  const clearClues = () => {
    setRowCluesStr(Array(rows).fill('0'));
    setColCluesStr(Array(cols).fill('0'));
    setGrid(Array(rows).fill().map(() => Array(cols).fill(0)));
    setIsSolvedStatus(false);
    setAlertMsg('');
    setHintInfo(null);
    setMarkedRowClues({});
    setMarkedColClues({});
    setDeductionLevel(0);
    setBackupGrids([]);
  };

  // --- 本地题库管理 ---
  const saveToCollection = () => {
    const name = prompt("请输入此题目的名称以便后续识别：", exportFilename || "自定义谜题");
    if (name) {
      const newCol = [{
        id: Date.now(),
        name,
        date: new Date().toLocaleString(),
        rows, cols, rowCluesStr, colCluesStr, grid, markedRowClues, markedColClues, isSolvedStatus, deductionLevel, backupGrids
      }, ...puzzleCollection];
      setPuzzleCollection(newCol);
      localStorage.setItem('nonogram_collection', JSON.stringify(newCol));
      setAlertMsg(`✅ 题目 "${name}" 已成功存入收藏夹！`);
    }
  };

  const loadFromCollection = (item) => {
    applyImportedData(item);
    setExportFilename(item.name);
  };

  const deleteFromCollection = (id) => {
    if (confirm("确定要永久删除这个收藏的题目吗？")) {
      const newCol = puzzleCollection.filter(p => p.id !== id);
      setPuzzleCollection(newCol);
      localStorage.setItem('nonogram_collection', JSON.stringify(newCol));
    }
  };

  // --- 本地存档导出/导入 ---
  const handleExportCode = () => {
    const finalFilename = exportFilename.trim() || 'nonogram-save';
    const data = { rows, cols, rowCluesStr, colCluesStr, grid, markedRowClues, markedColClues, isSolvedStatus, remark: exportRemark.trim(), deductionLevel, backupGrids };
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(encodeURIComponent(jsonStr));
    setExportData(base64);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(base64).then(() => setAlertMsg(`✅ 存档代码 [${finalFilename}] 已成功复制！`));
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = base64;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setAlertMsg(`✅ 存档代码 [${finalFilename}] 已成功复制！`);
      }
    } catch(e) {
      setAlertMsg('✅ 存档代码已生成，请在下方手动复制。');
    }
  };

  const handleExportJSON = () => {
    const finalFilename = exportFilename.trim() || 'nonogram-save';
    const data = { rows, cols, rowCluesStr, colCluesStr, grid, markedRowClues, markedColClues, isSolvedStatus, remark: exportRemark.trim(), deductionLevel, backupGrids };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${finalFilename}-${new Date().getTime()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setAlertMsg(`✅ 存档文件 [${finalFilename}] 已成功下载！`);
  };

  const exportAsImage = (format = 'png') => {
    try {
      setAlertMsg('正在生成高清图片，请稍候...');
      const finalFilename = exportFilename.trim() || 'nonogram-save';
      const remarkText = exportRemark.trim();
      
      const EXPORT_CELL_SIZE = 30; 
      const parsedRowClues = rowCluesStr.map(parseClue);
      const parsedColClues = colCluesStr.map(parseClue);

      const maxRowClueLen = Math.max(...parsedRowClues.map(c => c.length));
      const maxColClueLen = Math.max(...parsedColClues.map(c => c.length));

      const CLUE_CELL_W = 22;
      const CLUE_CELL_H = 22;

      const leftWidth = maxRowClueLen * CLUE_CELL_W + 15;
      const topHeight = maxColClueLen * CLUE_CELL_H + 15;
      const boardW = cols * EXPORT_CELL_SIZE;
      const boardH = rows * EXPORT_CELL_SIZE;

      const padding = 20;
      const remarkHeight = remarkText ? 40 : 0; 
      
      const totalW = leftWidth * 2 + boardW + padding * 2;
      const totalH = topHeight * 2 + boardH + padding * 2 + remarkHeight;

      const canvas = document.createElement('canvas');
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f8fafc'; 
      ctx.fillRect(0, 0, totalW, totalH);

      ctx.translate(padding, padding);

      ctx.fillStyle = '#cbd5e1'; 
      ctx.fillRect(leftWidth, topHeight, boardW, boardH);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = leftWidth + c * EXPORT_CELL_SIZE;
          const y = topHeight + r * EXPORT_CELL_SIZE;
          const v = grid[r][c];

          if (v % 2 === 1) { 
            let fillStyle = '#1e293b'; 
            if (v === 3) fillStyle = '#d946ef'; // 紫
            if (v === 5) fillStyle = '#3b82f6'; // 蓝
            if (v === 7) fillStyle = '#f59e0b'; // 黄
            ctx.fillStyle = fillStyle;
            ctx.fillRect(x, y, EXPORT_CELL_SIZE, EXPORT_CELL_SIZE);
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, EXPORT_CELL_SIZE, EXPORT_CELL_SIZE);
            if (v > 0 && v % 2 === 0) { 
              let strokeStyle = '#ef4444'; 
              if (v === 4) strokeStyle = '#d946ef';
              if (v === 6) strokeStyle = '#3b82f6';
              if (v === 8) strokeStyle = '#f59e0b';
              ctx.strokeStyle = strokeStyle;
              ctx.lineWidth = 3;
              ctx.globalAlpha = 0.8;
              ctx.beginPath();
              ctx.moveTo(x + EXPORT_CELL_SIZE * 0.2, y + EXPORT_CELL_SIZE * 0.2);
              ctx.lineTo(x + EXPORT_CELL_SIZE * 0.8, y + EXPORT_CELL_SIZE * 0.8);
              ctx.moveTo(x + EXPORT_CELL_SIZE * 0.8, y + EXPORT_CELL_SIZE * 0.2);
              ctx.lineTo(x + EXPORT_CELL_SIZE * 0.2, y + EXPORT_CELL_SIZE * 0.8);
              ctx.stroke();
              ctx.globalAlpha = 1.0;
            }
          }

          ctx.strokeStyle = '#94a3b8'; 
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, EXPORT_CELL_SIZE, EXPORT_CELL_SIZE);

          if (c % 5 === 4 && c !== cols - 1) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x + EXPORT_CELL_SIZE - 1, y, 2, EXPORT_CELL_SIZE);
          }
          if (r % 5 === 4 && r !== rows - 1) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x, y + EXPORT_CELL_SIZE - 1, EXPORT_CELL_SIZE, 2);
          }
        }
      }

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(leftWidth, topHeight, boardW, boardH);

      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let c = 0; c < cols; c++) {
        const clues = parsedColClues[c];
        const colLine = grid.map(row => row[c]);
        const autoMarkedCol = gameSettings.autoMarkNumbers ? getAutoMarked(colLine, clues).marked : [];

        const x = leftWidth + c * EXPORT_CELL_SIZE + EXPORT_CELL_SIZE / 2;
        
        for (let i = 0; i < clues.length; i++) {
          if (clues[i] === 0) continue;
          const isMarked = markedColClues[`${c}-${i}`] || autoMarkedCol[i];
          ctx.fillStyle = isMarked ? '#f97316' : '#1e293b';
          
          const yTop = topHeight - 10 - (clues.length - 1 - i) * CLUE_CELL_H;
          ctx.fillText(clues[i], x, yTop);
          
          const yBottom = topHeight + boardH + 10 + i * CLUE_CELL_H;
          ctx.fillText(clues[i], x, yBottom);
        }
      }

      for (let r = 0; r < rows; r++) {
        const clues = parsedRowClues[r];
        const rowLine = grid[r];
        const autoMarkedRow = gameSettings.autoMarkNumbers ? getAutoMarked(rowLine, clues).marked : [];

        const y = topHeight + r * EXPORT_CELL_SIZE + EXPORT_CELL_SIZE / 2 + 1; 

        for (let i = 0; i < clues.length; i++) {
          if (clues[i] === 0) continue;
          const isMarked = markedRowClues[`${r}-${i}`] || autoMarkedRow[i];
          ctx.fillStyle = isMarked ? '#f97316' : '#1e293b';
          
          const xLeft = leftWidth - 15 - (clues.length - 1 - i) * CLUE_CELL_W;
          ctx.fillText(clues[i], xLeft, y);
          
          const xRight = leftWidth + boardW + 15 + i * CLUE_CELL_W;
          ctx.fillText(clues[i], xRight, y);
        }
      }

      if (remarkText) {
        ctx.fillStyle = '#64748b'; 
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(remarkText, (leftWidth * 2 + boardW) / 2, topHeight * 2 + boardH + 20);
      }

      const link = document.createElement('a');
      link.download = `${finalFilename}-${new Date().getTime()}.${format}`;
      link.href = canvas.toDataURL(`image/${format}`, 0.9);
      link.click();
      setAlertMsg(`✅ 成功导出为 ${format.toUpperCase()} 格式的图片！`);

    } catch (err) {
      console.error(err);
      setAlertMsg(`❌ 图片导出失败: ${err.message}`);
    }
  };

  const handleLocalImportCode = () => {
    try {
      const jsonStr = decodeURIComponent(atob(localImportData.trim()));
      const data = JSON.parse(jsonStr);
      applyImportedData(data);
      setLocalImportData('');
    } catch (err) {
      setAlertMsg('❌ 导入失败，存档代码格式错误或已损坏！');
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        applyImportedData(data);
      } catch (err) {
        setAlertMsg('❌ 导入失败，文件格式错误或已损坏！');
      }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const applyImportedData = (data) => {
    if (data.rows && data.cols && data.rowCluesStr && data.colCluesStr && data.grid) {
      setRows(data.rows);
      setCols(data.cols);
      setRowCluesStr(data.rowCluesStr);
      setColCluesStr(data.colCluesStr);
      setGrid(data.grid);
      setMarkedRowClues(data.markedRowClues || {});
      setMarkedColClues(data.markedColClues || {});
      setIsSolvedStatus(data.isSolvedStatus || false);
      setDeductionLevel(data.deductionLevel || 0);
      setBackupGrids(data.backupGrids || []);
      setAlertMsg('✅ 存档导入成功！已恢复进度。');
      setShowLocalImport(false);
      setMode('play');
    } else {
      throw new Error("格式不完整");
    }
  }

  // --- 自适应宽度 ---
  const fitToWidth = () => {
    const container = document.getElementById('board-scroll-container');
    const gridElement = document.getElementById('board-grid');
    
    if (container && gridElement) {
      const currentColsWidth = cols * cellSize;
      const totalGridWidth = gridElement.offsetWidth;
      const fixedWidth = totalGridWidth - currentColsWidth; 
      const targetWidth = container.clientWidth - 40; 
      let newCellSize = Math.floor((targetWidth - fixedWidth) / cols);
      
      if (newCellSize < 12) newCellSize = 12;
      if (newCellSize > 80) newCellSize = 80;
      
      setCellSize(newCellSize);
    }
  };

  // --- HTML 提取 ---
  const parseHtmlAndLoad = (html) => {
    let parsedRowClues = [];
    let parsedColClues = [];
    let r = 0, c = 0;
    const safeHtml = html.trim();

    try {
      const taskMatch = safeHtml.match(/(?:var\s+task\s*=\s*|task:\s*)['"](.*?)['"]/i);
      const wMatch = safeHtml.match(/puzzleWidth:\s*(\d+)/i);
      const hMatch = safeHtml.match(/puzzleHeight:\s*(\d+)/i);

      if (taskMatch && wMatch && hMatch) {
        const width = parseInt(wMatch[1], 10);
        const height = parseInt(hMatch[1], 10);
        const taskStr = taskMatch[1];
        const clues = taskStr.split('/');
        
        if (clues.length >= width + height) {
          const parseTaskClue = str => {
            if (!str || str === '0') return [0];
            return str.split('.').map(Number).filter(n => !isNaN(n) && n > 0);
          };
          
          parsedColClues = clues.slice(0, width).map(parseTaskClue).map(arr => arr.length ? arr : [0]);
          parsedRowClues = clues.slice(width, width + height).map(parseTaskClue).map(arr => arr.length ? arr : [0]);
          r = height;
          c = width;
        }
      }
    } catch (e) { console.warn("策略1失败", e); }

    if (parsedRowClues.length === 0 || parsedColClues.length === 0) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(safeHtml, 'text/html');
        const extractNumbers = (element) => {
          const cleanText = element.innerHTML.replace(/<[^>]+>/g, ' ');
          const numbers = cleanText.match(/\d+/g);
          return numbers ? numbers.map(Number) : [0]; 
        };
        const rowGroups = Array.from(doc.querySelectorAll('[class*="task-row-"]')).sort((a,b) => {
          const aId = parseInt(a.className.match(/task-row-(\d+)/)?.[1] || 0);
          const bId = parseInt(b.className.match(/task-row-(\d+)/)?.[1] || 0);
          return aId - bId;
        });
        const colGroups = Array.from(doc.querySelectorAll('[class*="task-col-"]')).sort((a,b) => {
          const aId = parseInt(a.className.match(/task-col-(\d+)/)?.[1] || 0);
          const bId = parseInt(b.className.match(/task-col-(\d+)/)?.[1] || 0);
          return aId - bId;
        });

        if (rowGroups.length > 0 && colGroups.length > 0) {
          parsedRowClues = rowGroups.map(extractNumbers);
          parsedColClues = colGroups.map(extractNumbers);
          r = parsedRowClues.length;
          c = parsedColClues.length;
        }
      } catch (e) { console.warn("策略2失败", e); }
    }

    if (parsedRowClues.length === 0 || parsedColClues.length === 0) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(safeHtml, 'text/html');

        const leftContainer = doc.querySelector('.nmtl') || doc.querySelector('#taskLeft') || doc.querySelector('table tbody tr td:first-child');
        const topContainer = doc.querySelector('.nmtt') || doc.querySelector('#taskTop') || doc.querySelector('table tbody tr:first-child');

        if (leftContainer && topContainer) {
          const extractNumbers = (element) => {
            const cleanText = element.innerHTML.replace(/<[^>]+>/g, ' ');
            const numbers = cleanText.match(/\d+/g);
            return numbers ? numbers.map(Number) : [];
          };

          let leftChildren = Array.from(leftContainer.children);
          if (leftChildren.length === 1 && ['TBODY', 'TABLE'].includes(leftChildren[0].tagName)) {
            leftChildren = Array.from(leftChildren[0].children);
          }
          if (leftChildren.length === 0) leftChildren = Array.from(leftContainer.querySelectorAll('tr, div.task-group'));

          let topChildren = Array.from(topContainer.children);
          if (topChildren.length === 1 && ['TBODY', 'TABLE'].includes(topChildren[0].tagName)) {
            topChildren = Array.from(topChildren[0].children);
          }
          if (topChildren.length > 0 && topChildren[0].tagName === 'TR') {
            topChildren = Array.from(topChildren[0].children); 
          }
          if (topChildren.length === 0) topChildren = Array.from(topContainer.querySelectorAll('td, div.task-group'));

          const tempRow = leftChildren.map(extractNumbers).filter(arr => arr.length > 0);
          const tempCol = topChildren.map(extractNumbers).filter(arr => arr.length > 0);
          
          if (tempRow.length > 0 && tempCol.length > 0) {
            parsedRowClues = tempRow;
            parsedColClues = tempCol;
            r = parsedRowClues.length;
            c = parsedColClues.length;
          }
        }
      } catch(e) { console.warn("策略3失败", e); }
    }

    if (parsedRowClues.length === 0 || parsedColClues.length === 0) {
      throw new Error("解析失败。未能找到任何题目数据。请确保您完整复制了目标区域的代码（如包含 task-row 的元素片段）。");
    }

    initBoard(r, c, parsedRowClues, parsedColClues);
    setAlertMsg(`✅ 提取成功！生成 ${r} × ${c} 谜题。`);
    setImportData('');
    setShowImport(false);
    setMode('play');
  };

  const handleImport = async () => {
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
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(data)}`
        ];

        let html = null;
        for (let proxy of proxies) {
          try {
            const response = await fetch(proxy);
            if (response.ok) {
              if (proxy.includes('allorigins')) {
                const resJson = await response.json();
                html = resJson.contents;
              } else {
                html = await response.text();
              }
              if (html && html.includes('<html')) break;
            }
          } catch (e) {
            console.warn(`代理 ${proxy} 失败`);
          }
        }

        if (!html || !html.includes('<html')) {
          throw new Error("代理请求失败或被目标网站拦截。请直接使用【粘贴网页源代码】的方式提取！");
        }
        
        parseHtmlAndLoad(html);
      } else {
        parseHtmlAndLoad(data);
      }
    } catch (e) {
      console.error(e);
      setAlertMsg(`❌ 提取失败: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // --- 手动标记数字逻辑 ---
  const toggleMarkedRow = (r, idx) => {
    if (mode !== 'play') return;
    setMarkedRowClues(prev => ({ ...prev, [`${r}-${idx}`]: !prev[`${r}-${idx}`] }));
  };
  
  const toggleMarkedCol = (c, idx) => {
    if (mode !== 'play') return;
    setMarkedColClues(prev => ({ ...prev, [`${c}-${idx}`]: !prev[`${c}-${idx}`] }));
  };

  // --- 多级推演功能核心逻辑 ---
  const startDeduction = () => {
    if (deductionLevel < 3) {
      setBackupGrids(prev => [...prev, grid.map(r => [...r])]);
      setDeductionLevel(prev => prev + 1);
      setAlertMsg(`🔬 已进入 ${deductionLevel + 1} 级推演模式，填涂将以新颜色显示。`);
    }
  };

  const applyDeduction = () => {
    if (deductionLevel > 0) {
      const currentCF = deductionLevel * 2 + 1; // 3, 5, 7
      const currentCX = deductionLevel * 2 + 2; // 4, 6, 8
      const targetCF = (deductionLevel - 1) * 2 + 1; // 1, 3, 5
      const targetCX = (deductionLevel - 1) * 2 + 2; // 2, 4, 6

      setGrid(prev => prev.map(r => r.map(c => c === currentCF ? targetCF : (c === currentCX ? targetCX : c))));
      setBackupGrids(prev => prev.slice(0, -1));
      setDeductionLevel(prev => prev - 1);
      setAlertMsg(`✅ 成功将 ${deductionLevel} 级推演应用到上级盘面。`);
    }
  };

  const cancelDeduction = () => {
    if (deductionLevel > 0) {
      const lastBackup = backupGrids[backupGrids.length - 1];
      setGrid(lastBackup.map(r => [...r]));
      setBackupGrids(prev => prev.slice(0, -1));
      setDeductionLevel(prev => prev - 1);
      setAlertMsg(`🔙 已放弃 ${deductionLevel} 级推演，恢复上级盘面。`);
    }
  };

  // --- 交互逻辑核心 ---
  const checkLineValid = (clues, length, currentLine) => {
    if (currentLine.every(v => v !== -1)) return true;
    const allPossibilities = generateLines(clues, length);
    const validPossibilities = allPossibilities.filter(p => 
        p.every((val, idx) => currentLine[idx] === -1 || currentLine[idx] === val)
    );
    return validPossibilities.length > 0;
  };

  const updateCell = (r, c, val) => {
    if (hintInfo?.isError) {
      if (hintInfo.type === 'cell' && hintInfo.r === r && hintInfo.c === c) {
        setHintInfo(null);
      } else if (hintInfo.type === 'row' && hintInfo.index === r) {
        setHintInfo(null);
      } else if (hintInfo.type === 'col' && hintInfo.index === c) {
        setHintInfo(null);
      }
    }
    
    setGrid(prev => {
      let newGrid = prev.map(row => [...row]);
      newGrid[r][c] = val;
      return newGrid;
    });
  };

  const handleCellMouseDown = (e, r, c) => {
    if (mode !== 'play') return;
    e.preventDefault();
    let newAction = 0;
    
    const currentVal = grid[r][c];
    const CF = deductionLevel * 2 + 1; // Current Fill (Black)
    const CX = deductionLevel * 2 + 2; // Current Cross

    if (e.button === 0) {
      if (interactionMode === 'toggle') {
        newAction = (currentVal === 0 || (currentVal !== CF && currentVal !== CX)) ? CF : (currentVal === CF ? CX : 0);
      } else {
        newAction = currentBrush === 1 ? CF : (currentBrush === 2 ? CX : 0);
      }
    } else if (e.button === 2) {
      newAction = currentVal === CX ? 0 : CX;
    }

    setDragAction(newAction);
    updateCell(r, c, newAction);
  };

  const handleCellMouseEnter = (e, r, c) => {
    if (dragAction !== null && e.buttons === 0) {
      setDragAction(null);
    }
    setHoverPos({ r, c });

    if (mode !== 'play' || dragAction === null) return;
    if (e.buttons === 0) return; 

    updateCell(r, c, dragAction);
  };

  const generateLines = (clues, length) => {
    if (clues.length === 0 || (clues.length === 1 && clues[0] === 0)) {
      return [Array(length).fill(0)];
    }
    const lines = [];
    const minSpaceNeeded = clues.reduce((a, b) => a + b, 0) + clues.length - 1;
    const maxStart = length - minSpaceNeeded;

    for (let start = 0; start <= maxStart; start++) {
      const block = [...Array(start).fill(0), ...Array(clues[0]).fill(1)];
      if (clues.length > 1) block.push(0);
      
      const restLines = generateLines(clues.slice(1), length - block.length);
      for (let rest of restLines) {
        lines.push([...block, ...rest]);
      }
    }
    return lines;
  };

  const solveBoardLogic = (rClues, cClues, rCount, cCount) => {
    const parsedRowClues = rClues.map(parseClue);
    const parsedColClues = cClues.map(parseClue);

    let tempBoard = Array(rCount).fill().map(() => Array(cCount).fill(-1));
    let rowPossibilities = parsedRowClues.map(r => generateLines(r, cCount));
    let colPossibilities = parsedColClues.map(c => generateLines(c, rCount));

    let changed = true;
    let iteration = 0;

    while (changed && iteration < 100) {
      changed = false;
      iteration++;

      for (let i = 0; i < rCount; i++) {
        const validRows = rowPossibilities[i].filter(p => 
          p.every((val, j) => tempBoard[i][j] === -1 || tempBoard[i][j] === val)
        );
        rowPossibilities[i] = validRows;
        if (validRows.length === 0) return null; 

        for (let j = 0; j < cCount; j++) {
          if (tempBoard[i][j] === -1 && validRows.length > 0) {
            if (validRows.every(p => p[j] === 1)) { tempBoard[i][j] = 1; changed = true; }
            else if (validRows.every(p => p[j] === 0)) { tempBoard[i][j] = 0; changed = true; }
          }
        }
      }

      for (let j = 0; j < cCount; j++) {
        const validCols = colPossibilities[j].filter(p => 
          p.every((val, i) => tempBoard[i][j] === -1 || tempBoard[i][j] === val)
        );
        colPossibilities[j] = validCols;
        if (validCols.length === 0) return null;

        for (let i = 0; i < rCount; i++) {
          if (tempBoard[i][j] === -1 && validCols.length > 0) {
            if (validCols.every(p => p[i] === 1)) { tempBoard[i][j] = 1; changed = true; }
            else if (validCols.every(p => p[i] === 0)) { tempBoard[i][j] = 0; changed = true; }
          }
        }
      }
    }
    return tempBoard;
  };

  const validateGrid = () => {
    setHintInfo(null);
    setAlertMsg('');
    if (mode !== 'play') return;

    const solvedBoard = solveBoardLogic(rowCluesStr, colCluesStr, rows, cols);
    if (!solvedBoard) {
      setHintInfo({ text: "⚠️ 题目本身存在无法调和的矛盾，请检查线索输入是否正确！", type: 'error', isError: true });
      return;
    }

    let errorFound = false;
    let errorR = -1;
    let errorC = -1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const userVal = grid[r][c]; 
        const solvedVal = solvedBoard[r][c]; 
        
        const isUserBlack = (userVal % 2 === 1);
        const isUserCross = (userVal > 0 && userVal % 2 === 0);

        if (solvedVal !== -1 && (isUserBlack || isUserCross)) {
          if (isUserBlack && solvedVal === 0) {
            errorFound = true; errorR = r; errorC = c; break;
          }
          if (isUserCross && solvedVal === 1) {
            errorFound = true; errorR = r; errorC = c; break;
          }
        }
      }
      if (errorFound) break;
    }

    if (errorFound) {
      setHintInfo({ 
        text: `⚠️ 发现错误！第 ${errorR + 1} 行，第 ${errorC + 1} 列与最终答案冲突！请检查您的推理。`, 
        type: 'cell', 
        r: errorR, 
        c: errorC, 
        isError: true 
      });
    } else {
      const hasUnknowns = solvedBoard.some(row => row.includes(-1));
      if (hasUnknowns) {
        setHintInfo({ text: "✅ 目前填涂无绝对冲突！（注：由于此题部分区域需要猜测，未验证全局唯一性）", type: 'success', isError: false });
      } else {
        setHintInfo({ text: "✅ 检查通过！当前已填入的内容与最终答案完全一致，请继续保持！", type: 'success', isError: false });
      }
    }
  };

  const provideHint = () => {
    setHintInfo(null);
    setAlertMsg('');
    
    if (isSolvedStatus) {
      setHintInfo({ text: "🎉 谜题已经完成了！无需提示啦。", type: 'success' });
      return;
    }

    const parsedRowClues = rowCluesStr.map(parseClue);
    const parsedColClues = colCluesStr.map(parseClue);

    const evaluateLine = (lineIdx, isRow) => {
      const clues = isRow ? parsedRowClues[lineIdx] : parsedColClues[lineIdx];
      const length = isRow ? cols : rows;
      const currentLine = isRow 
        ? grid[lineIdx].map(v => (v % 2 === 1) ? 1 : ((v > 0 && v % 2 === 0) ? 0 : -1))
        : grid.map(r => r[lineIdx]).map(v => (v % 2 === 1) ? 1 : ((v > 0 && v % 2 === 0) ? 0 : -1));
        
      if (currentLine.every(v => v !== -1)) return { status: 'full' };

      const allPossibilities = generateLines(clues, length);
      
      const validPossibilities = allPossibilities.filter(p => 
        p.every((val, idx) => currentLine[idx] === -1 || currentLine[idx] === val)
      );

      if (validPossibilities.length === 0) return { status: 'error' };

      let sureBlack = 0;
      let sureCross = 0;

      for (let idx = 0; idx < length; idx++) {
        if (currentLine[idx] === -1 && validPossibilities.length > 0) {
          if (validPossibilities.every(p => p[idx] === 1)) sureBlack++;
          else if (validPossibilities.every(p => p[idx] === 0)) sureCross++;
        }
      }

      return { status: 'ok', sureBlack, sureCross, totalNew: sureBlack + sureCross };
    };

    let bestHint = null;

    for (let r = 0; r < rows; r++) {
      const res = evaluateLine(r, true);
      if (res.status === 'error') {
        setHintInfo({ text: `⚠️ 警告：在 横向第 ${r + 1} 行 发现了逻辑矛盾！当前填入的格子已经无法满足该行的线索，请检查并擦除错误的地方。`, type: 'row', index: r, isError: true });
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
        setHintInfo({ text: `⚠️ 警告：在 纵向第 ${c + 1} 列 发现了逻辑矛盾！当前填入的格子已经无法满足该列的线索，请仔细检查。`, type: 'col', index: c, isError: true });
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
      const clueText = bestHint.type === 'row' ? rowCluesStr[bestHint.index] : colCluesStr[bestHint.index].replace(/\n/g, ' ');
      
      let explainStr = "";
      if (bestHint.sureBlack > 0 && bestHint.sureCross > 0) {
        explainStr = `必然有 ${bestHint.sureBlack} 个可以涂黑的方块，以及 ${bestHint.sureCross} 个可以打叉的空白。`;
      } else if (bestHint.sureBlack > 0) {
        explainStr = `必然有 ${bestHint.sureBlack} 个方块是可以被安全涂黑的。`;
      } else {
        explainStr = `必然有 ${bestHint.sureCross} 个地方是不可能被涂黑的（应该打叉）。`;
      }

      setHintInfo({
        text: `💡 破局点在 ${direction} ${bestHint.index + 1} 行/列 (线索: ${clueText})。结合您现有的标记，排除掉所有不可能的组合后，${explainStr} 试着推演一下这一段！`,
        type: bestHint.type,
        index: bestHint.index,
        isError: false
      });
    } else {
      setHintInfo({
        text: "🧠 当前盘面没有简单的单行/单列线索可以推进了。您可能需要结合多行交叉推导，或者利用假设法（推演模式）来进行下一步试探。",
        type: 'info',
        isError: false
      });
    }
  };

  const autoSolve = () => {
    setAlertMsg('');
    setHintInfo(null);
    
    const solvedBoard = solveBoardLogic(rowCluesStr, colCluesStr, rows, cols);
    if (!solvedBoard) {
      setAlertMsg("当前题目存在矛盾，无解！");
      return;
    }

    const finalGrid = solvedBoard.map(row => row.map(cell => cell === 1 ? 1 : (cell === 0 ? 2 : 0)));
    setGrid(finalGrid);
    // 强制触发一次校验
    setIsSolvedStatus(true);
    if (solvedBoard.some(row => row.includes(-1))) {
      setIsSolvedStatus(false);
      setAlertMsg("逻辑推导已完成。剩余部分存在多解或需要深度试错。");
    }
    setDeductionLevel(0);
    setBackupGrids([]);
  };

  const clearBoard = () => {
    setGrid(Array(rows).fill().map(() => Array(cols).fill(0)));
    setIsSolvedStatus(false);
    setAlertMsg('');
    setHintInfo(null);
    setMarkedRowClues({});
    setMarkedColClues({});
    setDeductionLevel(0);
    setBackupGrids([]);
  };

  // --- 提取各级推演的主题样式 ---
  const getBorderColorClass = () => {
    if (deductionLevel === 1) return 'border-fuchsia-600 shadow-[0_0_20px_rgba(217,70,239,0.3)]';
    if (deductionLevel === 2) return 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]';
    if (deductionLevel === 3) return 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]';
    return 'border-slate-800 shadow-xl';
  };
  
  const getContainerBgClass = () => {
    if (deductionLevel === 1) return 'bg-fuchsia-50/50 shadow-[inset_0_0_40px_rgba(217,70,239,0.15)]';
    if (deductionLevel === 2) return 'bg-blue-50/50 shadow-[inset_0_0_40px_rgba(59,130,246,0.15)]';
    if (deductionLevel === 3) return 'bg-amber-50/50 shadow-[inset_0_0_40px_rgba(251,191,36,0.15)]';
    return '';
  };
  
  const getHoverBgClass = () => {
    if (deductionLevel === 1) return 'bg-fuchsia-100';
    if (deductionLevel === 2) return 'bg-blue-100';
    if (deductionLevel === 3) return 'bg-amber-100';
    return 'bg-[#e0f2e9]';
  };
  
  const getBorderBaseClass = () => {
    if (deductionLevel === 1) return 'border-fuchsia-600';
    if (deductionLevel === 2) return 'border-blue-500';
    if (deductionLevel === 3) return 'border-amber-400';
    return 'border-slate-800';
  };

  // --- 提前计算悬浮高亮与外挂数据 ---
  const showMeasure = measureStart && hoverPos.r !== -1 && hoverPos.c !== -1;
  const showHoverRow = gameSettings.hoverRowClues && hoverPos.r !== -1;
  const showHoverCol = gameSettings.hoverColClues && hoverPos.c !== -1;
  const showTooltip = showMeasure || showHoverRow || showHoverCol;

  let hoverParsedRow = [];
  let hoverAutoRow = [];
  let hoverRowInsertIdx = -1;
  if (showHoverRow) {
    hoverParsedRow = parseClue(rowCluesStr[hoverPos.r]);
    const rowLine = grid[hoverPos.r];
    const autoRes = gameSettings.autoMarkNumbers ? getAutoMarked(rowLine, hoverParsedRow) : { marked: [], assignedBlocks: [] };
    hoverAutoRow = autoRes.marked;
    hoverRowInsertIdx = getInsertIdx(cols, hoverParsedRow, hoverPos.c, autoRes.assignedBlocks);
  }

  let hoverParsedCol = [];
  let hoverAutoCol = [];
  let hoverColInsertIdx = -1;
  if (showHoverCol) {
    hoverParsedCol = parseClue(colCluesStr[hoverPos.c]);
    const colLine = grid.map(row => row[hoverPos.c]);
    const autoRes = gameSettings.autoMarkNumbers ? getAutoMarked(colLine, hoverParsedCol) : { marked: [], assignedBlocks: [] };
    hoverAutoCol = autoRes.marked;
    hoverColInsertIdx = getInsertIdx(rows, hoverParsedCol, hoverPos.r, autoRes.assignedBlocks);
  }

  const hoverOnlyRow = showHoverRow && !showHoverCol;
  const hoverOnlyCol = !showHoverRow && showHoverCol;

  const renderTooltipClues = (parsed, autoMarked, manualMarkedDict, insertIdx, isRow) => {
    return Array.from({ length: parsed.length + 1 }).map((_, i) => {
        const elements = [];
        if (i === insertIdx) {
            elements.push(<span key={`cursor-${i}`} className="text-cyan-400 mx-1 animate-pulse drop-shadow-md">!</span>);
        }
        if (i < parsed.length) {
            const isMarked = manualMarkedDict[`${isRow ? hoverPos.r : hoverPos.c}-${i}`] || autoMarked[i];
            elements.push(<span key={`clue-${i}`} className={isMarked ? 'text-orange-400' : 'text-slate-100'}>{parsed[i]}</span>);
        }
        return elements;
    });
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden text-slate-800 select-none relative" onMouseLeave={handleGlobalLeave}>
      
      {/* 测量与悬浮线索提示框 (外挂) */}
      <div
        id="measure-tooltip-container"
        className="fixed pointer-events-none z-50 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl"
        style={{ 
          display: showTooltip ? 'flex' : 'none', 
          flexDirection: 'column', 
          gap: '4px',
          top: 0, left: 0 
        }}
      >
        {showMeasure && (
          <div className="text-amber-300 border-b border-white/20 pb-1 mb-1">
            {Math.abs(hoverPos.r - measureStart.r) + 1 > 1 && Math.abs(hoverPos.c - measureStart.c) + 1 > 1 
              ? `📐 ${Math.abs(hoverPos.r - measureStart.r) + 1} × ${Math.abs(hoverPos.c - measureStart.c) + 1} 格` 
              : `📐 ${Math.max(Math.abs(hoverPos.r - measureStart.r) + 1, Math.abs(hoverPos.c - measureStart.c) + 1)} 格`}
          </div>
        )}
        
        {showHoverRow && (
          <div className={`flex items-center ${hoverOnlyRow ? 'text-3xl font-black gap-2' : 'text-base font-bold gap-1'}`}>
            {(!hoverOnlyRow) && <span className="text-slate-400 font-normal text-xs mr-1">行:</span>}
            {renderTooltipClues(hoverParsedRow, hoverAutoRow, markedRowClues, hoverRowInsertIdx, true)}
          </div>
        )}
        
        {showHoverCol && (
          <div className={`flex items-center ${hoverOnlyCol ? 'text-3xl font-black gap-2' : 'text-base font-bold gap-1'}`}>
            {(!hoverOnlyCol) && <span className="text-slate-400 font-normal text-xs mr-1">列:</span>}
            {renderTooltipClues(hoverParsedCol, hoverAutoCol, markedColClues, hoverColInsertIdx, false)}
          </div>
        )}
      </div>

      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-20 shadow-sm shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-900">
          <Dices className="w-6 h-6 text-indigo-500" /> Nonogram
        </h1>
        <button onClick={() => setShowLeftPanel(!showLeftPanel)} className="p-2 bg-slate-100 rounded-md">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {!isPanelPinned && !isPanelHovered && (
        <div 
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 h-40 w-2 hover:w-6 z-30 items-center justify-start cursor-pointer group transition-all"
          onMouseEnter={() => setIsPanelHovered(true)}
        >
          <div className="bg-slate-800 text-white rounded-r-lg opacity-40 group-hover:opacity-100 py-6 shadow-md flex items-center justify-center w-full h-full">
            <ChevronRight className="w-3 h-3 hidden group-hover:block" />
          </div>
        </div>
      )}

      {/* 左侧控制台 */}
      <div 
        onMouseLeave={() => { if (!isPanelPinned) setIsPanelHovered(false); }}
        className={`
        ${showLeftPanel ? 'flex' : 'hidden'} md:flex flex-col bg-white border-r border-slate-200 shadow-2xl
        w-full md:w-80 lg:w-96 
        ${isPanelPinned ? 'relative h-[calc(100vh-65px)] md:h-screen z-10 shrink-0' : `fixed top-0 left-0 h-screen z-40 transition-transform duration-300 ease-in-out ${isPanelHovered ? 'translate-x-0' : '-translate-x-full'}`}
      `}>
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          
          <div className="hidden md:flex pb-4 border-b border-slate-100 justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 text-indigo-900">
                <Dices className="w-8 h-8 text-indigo-500" /> 数织解谜
              </h1>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">纯逻辑推理涂色游戏。利用左侧的工具享受思考的乐趣。</p>
            </div>
            <button 
              onClick={() => {
                setIsPanelPinned(!isPanelPinned);
                setIsPanelHovered(true); 
              }} 
              className={`p-1.5 rounded-lg transition-colors shrink-0 ml-2 ${!isPanelPinned ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
              title={isPanelPinned ? "取消固定 (收起以享受全屏)" : "固定侧边栏"}
            >
              {isPanelPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => { setMode('play'); setHintInfo(null); }}
              className={`flex-1 py-2.5 rounded-lg font-bold flex justify-center items-center gap-2 transition-all ${mode === 'play' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Play className="w-4 h-4" /> 游玩模式
            </button>
            <button 
              onClick={() => { setMode('edit'); setHintInfo(null); }}
              className={`flex-1 py-2.5 rounded-lg font-bold flex justify-center items-center gap-2 transition-all ${mode === 'edit' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Settings className="w-4 h-4" /> 自定义题目
            </button>
          </div>

          {hintInfo && mode === 'play' && (
            <div className={`p-4 rounded-xl border-2 text-sm shadow-sm leading-relaxed flex gap-3 shrink-0 transition-all animate-in fade-in slide-in-from-top-2
              ${hintInfo.isError ? 'bg-red-50 border-red-200 text-red-800' : (hintInfo.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800')}`}>
              <div className="mt-0.5 shrink-0">
                {hintInfo.isError ? <AlertCircle className="w-5 h-5 text-red-500" /> : (hintInfo.type === 'success' ? <Check className="w-5 h-5 text-emerald-500" /> : <Lightbulb className="w-5 h-5 text-amber-500" />)}
              </div>
              <p>{hintInfo.text}</p>
            </div>
          )}

          {/* 设置与提取区 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-4 shrink-0">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">棋盘设置</h2>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold">行</label>
                <input type="number" min="1" max="80" value={rows} onChange={e => initBoard(parseInt(e.target.value)||5, cols)} className="w-14 px-2 py-1 text-sm rounded border border-slate-300 outline-none focus:border-indigo-500 text-center" />
              </div>
              <span className="text-slate-300">×</span>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold">列</label>
                <input type="number" min="1" max="80" value={cols} onChange={e => initBoard(rows, parseInt(e.target.value)||5)} className="w-14 px-2 py-1 text-sm rounded border border-slate-300 outline-none focus:border-indigo-500 text-center" />
              </div>
              
              <div className="flex ml-auto gap-1">
                <select 
                  value={randomDifficulty}
                  onChange={(e) => setRandomDifficulty(e.target.value)}
                  className="px-2 py-1 text-xs rounded-md border border-slate-300 outline-none focus:border-emerald-500 bg-white"
                  title="随机生成难度"
                >
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
                <button onClick={generateRandom} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md transition-colors" title="随机生成该尺寸的题目">
                  <RefreshCw className="w-4 h-4" />
                </button>
                {mode === 'edit' && (
                  <button onClick={clearClues} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors" title="清空线索">
                    <FileMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 mt-1">
              <div className="flex items-center gap-2 text-slate-500">
                <ZoomIn className="w-4 h-4" />
                <span className="text-sm font-semibold">缩放</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="range" min="12" max="80" 
                  value={cellSize} 
                  onChange={(e) => setCellSize(Number(e.target.value))}
                  className="w-24 accent-indigo-500 cursor-ew-resize"
                />
                <button 
                  onClick={fitToWidth}
                  className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors shadow-sm border border-indigo-100"
                  title="自适应铺满可视宽度 (避免左右拖动)"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 mt-1">
              <button 
                onClick={() => setShowImport(!showImport)}
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 font-bold transition-colors"
              >
                <Code className="w-4 h-4" /> 从外部网站提取题目
              </button>
              
              {showImport && (
                <div className="flex flex-col gap-2 mt-3 animate-in fade-in slide-in-from-top-1">
                  <p className="text-xs text-slate-500 mb-1 leading-relaxed">
                    💡 <strong className="text-indigo-600">强烈推荐方式：</strong>在目标网站<br/>
                    1. 按 <strong>Ctrl + U</strong> (或右键“查看网页源代码”)<br/>
                    2. 按 <strong>Ctrl + A</strong> 全选并复制<br/>
                    3. 直接贴入下方框中点击提取！这能100%绕过所有网络限制！
                  </p>
                  <textarea 
                    rows={4}
                    value={importData} 
                    onChange={e => setImportData(e.target.value)} 
                    placeholder="在此贴入 网页源代码 (HTML) 或者 网页链接 (URL)..." 
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 shadow-sm resize-none font-mono text-xs"
                  />
                  <button 
                    onClick={handleImport} 
                    disabled={isImporting}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:bg-indigo-300 flex justify-center items-center gap-1.5 shadow-sm"
                  >
                    {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    立即提取解析
                  </button>
                </div>
              )}
            </div>

            {/* 本地存档导出/导入 - 加入自定义文件名与备注 */}
            <div className="pt-3 border-t border-slate-200 mt-1">
              <button 
                onClick={() => setShowLocalImport(!showLocalImport)}
                className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center gap-1.5 font-bold transition-colors"
              >
                <SaveAll className="w-4 h-4" /> 本地存档导出 / 导入
              </button>
              
              {showLocalImport && (
                <div className="flex flex-col gap-2 mt-3 animate-in fade-in slide-in-from-top-1">
                  
                  <div className="flex flex-col gap-2 mb-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={exportFilename} 
                        onChange={e => setExportFilename(e.target.value)}
                        placeholder="导出文件名 (选填)" 
                        className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-300 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={exportRemark} 
                        onChange={e => setExportRemark(e.target.value)}
                        placeholder="添加底部备注 (图片专用)" 
                        className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-300 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button onClick={handleExportCode} className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors flex justify-center items-center gap-1">
                      <ClipboardCopy className="w-3.5 h-3.5" /> 复制代码
                    </button>
                    <button onClick={handleExportJSON} className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors flex justify-center items-center gap-1">
                      <FileJson className="w-3.5 h-3.5" /> 下载 JSON
                    </button>
                    <button onClick={() => exportAsImage('png')} className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex justify-center items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" /> 导出 PNG
                    </button>
                    <button onClick={() => exportAsImage('jpeg')} className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex justify-center items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" /> 导出 JPG
                    </button>
                  </div>

                  <div className="my-2 border-t border-slate-200" />
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={localImportData} 
                        onChange={e => setLocalImportData(e.target.value)} 
                        placeholder="粘贴存档代码..." 
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-indigo-500 shadow-sm font-mono"
                      />
                      <button 
                        onClick={handleLocalImportCode} 
                        disabled={!localImportData.trim()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:bg-indigo-300 flex justify-center items-center whitespace-nowrap"
                      >
                        导入代码
                      </button>
                    </div>

                    <div className="relative">
                      <input type="file" accept=".json" onChange={handleImportFile} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" title="选择 JSON 存档文件" />
                      <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1 border border-slate-300">
                        <UploadCloud className="w-3.5 h-3.5" /> 选取 JSON 文件恢复进度
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 我的题库收藏夹 */}
            <div className="pt-3 border-t border-slate-200 mt-1">
              <div className="flex items-center justify-between">
                <div className="text-sm text-indigo-900 flex items-center gap-1.5 font-bold">
                  <Library className="w-4 h-4 text-indigo-600" /> 我的题目收藏夹
                </div>
                <button 
                  onClick={saveToCollection}
                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold transition-colors border border-indigo-200 flex items-center gap-1"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" /> 存入
                </button>
              </div>
              
              <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
                {puzzleCollection.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">暂无收藏的题目</p>
                ) : (
                  puzzleCollection.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm group">
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-slate-700 truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400">{item.cols}×{item.rows} - {item.date}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => loadFromCollection(item)} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded" title="加载此题"><PlayCircle className="w-4 h-4"/></button>
                        <button onClick={() => deleteFromCollection(item.id)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded" title="删除"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 辅助设置面板 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3 shrink-0">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">辅助与外观</h2>
            
            <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
              <input type="checkbox" checked={gameSettings.completeLineStyle === 'highlight'} onChange={e => setGameSettings(p => ({...p, completeLineStyle: e.target.checked ? 'highlight' : 'fade'}))} className="accent-indigo-600 w-4 h-4" />
              行列完成后高亮 (取代变淡)
            </label>
            
            <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
              <input type="checkbox" checked={gameSettings.autoMarkNumbers} onChange={e => setGameSettings(p => ({...p, autoMarkNumbers: e.target.checked}))} className="accent-indigo-600 w-4 h-4" />
              自动高亮已达成的线索数字
            </label>
            
            <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
              <input type="checkbox" checked={gameSettings.autoFillCross} onChange={e => setGameSettings(p => ({...p, autoFillCross: e.target.checked}))} className="accent-indigo-600 w-4 h-4" />
              填涂满足某线索后，自动填补 X
            </label>
            
            <div className="flex gap-4 border-t border-slate-200 pt-3 mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
                <input type="checkbox" checked={gameSettings.hoverRowClues} onChange={e => setGameSettings(p => ({...p, hoverRowClues: e.target.checked}))} className="accent-indigo-600 w-4 h-4" />
                悬浮显示行提示
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
                <input type="checkbox" checked={gameSettings.hoverColClues} onChange={e => setGameSettings(p => ({...p, hoverColClues: e.target.checked}))} className="accent-indigo-600 w-4 h-4" />
                悬浮显示列提示
              </label>
            </div>

            <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 flex items-center gap-1"><SaveAll className="w-3 h-3"/> 自动存档已开启 (每10秒)</span>
              <button onClick={restoreAutoSave} className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded transition-colors font-bold shadow-sm">恢复进度</button>
            </div>
          </div>

          {mode === 'play' && (
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-4 shrink-0">
              
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">推演与检查</h2>
              </div>
              
              {/* 多级推演控件区域 */}
              <div className="flex flex-col gap-2 p-2 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 flex-wrap">
                  {deductionLevel < 3 && (
                    <button 
                      onClick={startDeduction}
                      className={`px-2 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-sm border flex-1 justify-center
                        ${deductionLevel === 0 ? 'bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 border-fuchsia-200' : ''}
                        ${deductionLevel === 1 ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200' : ''}
                        ${deductionLevel === 2 ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200' : ''}
                      `}
                    >
                      <GitBranch className="w-3.5 h-3.5" /> 
                      {deductionLevel === 0 ? "开始推演 (1级)" : `深入推演 (${deductionLevel + 1}级)`}
                    </button>
                  )}
                  {deductionLevel > 0 && (
                    <>
                      <button 
                        onClick={applyDeduction}
                        className="px-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-sm border border-emerald-200 flex-1 justify-center"
                        title={`将第 ${deductionLevel} 级合并入上层`}
                      >
                        <Check className="w-3.5 h-3.5" /> 应用 ({deductionLevel}级)
                      </button>
                      <button 
                        onClick={cancelDeduction}
                        className="px-2 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-sm border border-rose-200 flex-1 justify-center"
                        title={`放弃第 ${deductionLevel} 级的操作`}
                      >
                        <X className="w-3.5 h-3.5" /> 放弃 ({deductionLevel}级)
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={validateGrid}
                  className="flex-1 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm border border-blue-200"
                >
                  <SearchCheck className="w-3.5 h-3.5" /> 检查错误
                </button>
                <button 
                  onClick={provideHint}
                  className="flex-1 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm border border-amber-200"
                >
                  <Lightbulb className="w-3.5 h-3.5" /> 给我提示
                </button>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setInteractionMode('toggle')}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${interactionMode === 'toggle' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  <MousePointerClick className="w-4 h-4" /> 轮切
                </button>
                <button 
                  onClick={() => setInteractionMode('paint')}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${interactionMode === 'paint' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  <PaintRoller className="w-4 h-4" /> 放置
                </button>
              </div>

              {interactionMode === 'paint' && (
                <div className="flex gap-2 mt-1 p-1 bg-white rounded-lg border border-slate-200">
                  <button onClick={() => setCurrentBrush(1)} className={`flex-1 py-2 rounded flex justify-center ${currentBrush === 1 ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-100'}`} title="涂黑">
                    <Square fill="currentColor" className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCurrentBrush(2)} className={`flex-1 py-2 rounded flex justify-center ${currentBrush === 2 ? 'bg-red-50 text-red-500' : 'text-slate-400 hover:bg-slate-100'}`} title="打叉">
                    <XSquare className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCurrentBrush(0)} className={`flex-1 py-2 rounded flex justify-center ${currentBrush === 0 ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'}`} title="橡皮擦">
                    <Eraser className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'edit' && (
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-sm text-orange-800 flex items-start gap-2 shrink-0">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-orange-500" />
              <p>当前处于编辑模式。直接在右侧棋盘边缘的文本框中输入数字即可。数字间用<strong>空格</strong>或回车分隔。</p>
            </div>
          )}

          {alertMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200 font-medium text-center shrink-0">
              {alertMsg}
            </div>
          )}

          <div className="mt-auto pt-4 flex flex-col gap-3 shrink-0">
            <button onClick={clearBoard} className="w-full py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Eraser className="w-5 h-5" /> 清空画板
            </button>
            <button onClick={autoSolve} className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-colors">
              <Check className="w-5 h-5" /> 一键解题
            </button>
          </div>
        </div>
      </div>

      {/* 右侧棋盘主区域 */}
      <div 
        className={`flex-1 relative bg-slate-200/50 flex flex-col h-[calc(100vh-65px)] md:h-screen transition-all`}
        onMouseLeave={handleGlobalLeave}
      >

        {isSolvedStatus && mode === 'play' && (
          <div className="absolute bottom-6 left-6 z-30 pointer-events-none">
            <div className="bg-emerald-500 text-white px-5 py-3 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(16,185,129,0.3)] flex items-center gap-2 animate-bounce border-2 border-white">
              <Check className="w-6 h-6" /> 解谜成功！
            </div>
          </div>
        )}

        {/* Board 容器 */}
        <div 
          id="board-scroll-container" 
          className={`flex-1 overflow-auto p-4 md:p-8 flex ${getContainerBgClass()}`} 
          onMouseLeave={handleGlobalLeave}
        >
          <div className="m-auto relative">
            
            <div 
              id="board-grid"
              className={`grid gap-[1px] bg-slate-400 border-2 relative transition-colors ${getBorderColorClass()}`} 
              style={{ gridTemplateColumns: `auto repeat(${cols}, ${cellSize}px) auto` }}
              onContextMenu={(e) => e.preventDefault()}
              onMouseLeave={handleGlobalLeave} 
            >
              
              {/* === 第一行：顶部列线索 === */}
              <div className={`bg-white border-r-2 border-b-2 transition-colors ${getBorderBaseClass()}`} /> 
              
              {colCluesStr.map((str, c) => {
                const isDone = mode === 'play' && isLineCompleted(c, false, grid);
                const isHintCol = (hintInfo?.type === 'col' && hintInfo.index === c) || (hintInfo?.type === 'cell' && hintInfo.c === c);
                const isHoverCol = hoverPos.c === c && mode === 'play';
                const clueTextSize = getClueTextSize();
                const parsed = parseClue(str);
                
                const colLine = grid.map(row => row[c]);
                const autoMarkedCol = gameSettings.autoMarkNumbers ? getAutoMarked(colLine, parsed).marked : [];

                return (
                  <div key={`col-clue-top-${c}`} className={`flex flex-col justify-end items-center pb-2 border-b-2 transition-colors
                    ${getBorderBaseClass()}
                    ${isHintCol ? (hintInfo.isError ? 'bg-red-100' : 'bg-amber-100/80') : (isHoverCol ? getHoverBgClass() : (isDone && gameSettings.completeLineStyle === 'highlight' ? 'bg-emerald-100' : 'bg-slate-50'))} 
                    ${c % 5 === 4 && c !== cols - 1 ? `border-r-2 ${getBorderBaseClass()}` : ''} 
                    ${isDone && gameSettings.completeLineStyle === 'fade' ? 'opacity-30' : ''}`}
                  >
                    {mode === 'edit' ? (
                      <textarea 
                        value={str}
                        onChange={(e) => {
                          const newClues = [...colCluesStr];
                          newClues[c] = e.target.value;
                          setColCluesStr(newClues);
                        }}
                        className={`w-full text-center ${clueTextSize} font-black bg-orange-100 hover:bg-orange-200 outline-none resize-none overflow-hidden text-orange-900 leading-tight focus:bg-white`}
                        rows={Math.max(4, str.split('\n').length)}
                        placeholder="0"
                      />
                    ) : (
                      parsed.map((num, i) => {
                        const isMarked = markedColClues[`${c}-${i}`] || autoMarkedCol[i];
                        return (
                          <span 
                            key={i} 
                            onMouseDown={(e) => { e.stopPropagation(); toggleMarkedCol(c, i); }}
                            className={`cursor-pointer transition-colors ${clueTextSize} font-black leading-tight hover:opacity-70
                              ${num === 0 ? 'text-transparent' : (isMarked ? 'text-orange-500' : (isHintCol ? 'text-amber-900' : 'text-slate-800'))}`}
                          >
                            {num}
                          </span>
                        );
                      })
                    )}
                  </div>
                );
              })}
              
              <div className={`bg-white border-l-2 border-b-2 transition-colors ${getBorderBaseClass()}`} /> 


              {/* === 中间区域 === */}
              {grid.map((row, r) => {
                const isRowDone = mode === 'play' && isLineCompleted(r, true, grid);
                const isHintRow = (hintInfo?.type === 'row' && hintInfo.index === r) || (hintInfo?.type === 'cell' && hintInfo.r === r);
                const isHoverRow = hoverPos.r === r && mode === 'play';
                const clueTextSize = getClueTextSize();
                const parsed = parseClue(rowCluesStr[r]);
                
                const rowLine = row;
                const autoMarkedRow = gameSettings.autoMarkNumbers ? getAutoMarked(rowLine, parsed).marked : [];
                
                const renderRowClues = () => parsed.map((num, i) => {
                  const isMarked = markedRowClues[`${r}-${i}`] || autoMarkedRow[i];
                  return (
                    <span 
                      key={i} 
                      onMouseDown={(e) => { e.stopPropagation(); toggleMarkedRow(r, i); }}
                      className={`cursor-pointer transition-colors ${clueTextSize} font-black leading-tight hover:opacity-70
                        ${num === 0 ? 'text-transparent' : (isMarked ? 'text-orange-500' : (isHintRow ? 'text-amber-900' : 'text-slate-800'))}`}
                    >
                      {num}
                    </span>
                  );
                });

                return (
                  <React.Fragment key={`row-${r}`}>
                    
                    {/* 左侧行线索 */}
                    <div className={`flex justify-end items-center pr-2 border-r-2 gap-1.5 transition-colors
                      ${getBorderBaseClass()}
                      ${isHintRow ? (hintInfo.isError ? 'bg-red-100' : 'bg-amber-100/80') : (isHoverRow ? getHoverBgClass() : (isRowDone && gameSettings.completeLineStyle === 'highlight' ? 'bg-emerald-100' : 'bg-slate-50'))}
                      ${r % 5 === 4 && r !== rows - 1 ? `border-b-2 ${getBorderBaseClass()}` : ''} 
                      ${isRowDone && gameSettings.completeLineStyle === 'fade' ? 'opacity-30' : ''}`}
                    >
                      {mode === 'edit' ? (
                        <input 
                          type="text"
                          value={rowCluesStr[r]}
                          onChange={(e) => {
                            const newClues = [...rowCluesStr];
                            newClues[r] = e.target.value;
                            setRowCluesStr(newClues);
                          }}
                          className={`w-24 text-right ${clueTextSize} font-black bg-orange-100 hover:bg-orange-200 outline-none text-orange-900 px-1 py-0.5 rounded focus:bg-white`}
                          placeholder="0"
                        />
                      ) : renderRowClues()}
                    </div>

                    {/* 游戏格子 */}
                    {row.map((cell, c) => {
                      const isHintCol = (hintInfo?.type === 'col' && hintInfo.index === c) || (hintInfo?.type === 'cell' && hintInfo.c === c);
                      const isHintCell = isHintRow || isHintCol;
                      const isExactErrorCell = hintInfo?.type === 'cell' && hintInfo.r === r && hintInfo.c === c && hintInfo.isError;
                      const isHoverCell = (hoverPos.r === r || hoverPos.c === c) && mode === 'play';
                      
                      const borderRight = c % 5 === 4 && c !== cols - 1 ? `border-r-2 ${getBorderBaseClass()}` : '';
                      const borderBottom = r % 5 === 4 && r !== rows - 1 ? `border-b-2 ${getBorderBaseClass()}` : '';

                      let inMeasureRect = false;
                      if (measureStart && hoverPos.r !== -1 && hoverPos.c !== -1) {
                        const minR = Math.min(measureStart.r, hoverPos.r);
                        const maxR = Math.max(measureStart.r, hoverPos.r);
                        const minC = Math.min(measureStart.c, hoverPos.c);
                        const maxC = Math.max(measureStart.c, hoverPos.c);
                        inMeasureRect = r >= minR && r <= maxR && c >= minC && c <= maxC;
                      }

                      let cellBg = isHintCell 
                        ? (hintInfo.isError ? 'bg-red-200' : 'bg-amber-100')
                        : (isHoverCell ? getHoverBgClass() : 'bg-white');

                      let finalBg = cellBg;
                      
                      if (cell === 1) finalBg = 'bg-slate-800';
                      else if (cell === 3) finalBg = 'bg-fuchsia-600';
                      else if (cell === 5) finalBg = 'bg-blue-500';
                      else if (cell === 7) finalBg = 'bg-amber-400';

                      if (inMeasureRect && cell % 2 !== 1) finalBg = 'bg-indigo-100/70'; // 选中区域非黑块高亮
                      if (inMeasureRect && cell % 2 === 1) finalBg += ' brightness-75'; // 选中黑块变深
                      
                      if (isExactErrorCell) {
                        finalBg = cell % 2 === 1 ? 'bg-red-700 animate-pulse' : 'bg-red-300 animate-pulse';
                      }

                      // 各种叉叉的颜色
                      const getCrossColor = (val) => {
                        if (isExactErrorCell) return 'text-red-900';
                        if (val === 2) return 'text-red-500';
                        if (val === 4) return 'text-fuchsia-500';
                        if (val === 6) return 'text-blue-500';
                        if (val === 8) return 'text-amber-500';
                        return 'text-red-500';
                      };

                      return (
                        <div
                          key={`cell-${r}-${c}`}
                          onMouseDown={(e) => handleCellMouseDown(e, r, c)}
                          onMouseEnter={(e) => handleCellMouseEnter(e, r, c)}
                          className={`
                            flex items-center justify-center cursor-crosshair transition-colors duration-75
                            ${borderRight} ${borderBottom}
                            ${mode !== 'play' ? 'opacity-50 pointer-events-none' : ''}
                            ${finalBg} ${mode === 'play' && cell % 2 === 1 && !isExactErrorCell ? 'hover:brightness-110' : (mode === 'play' && !inMeasureRect && !isExactErrorCell ? 'hover:brightness-95' : '')}
                          `}
                          style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                        >
                          {(cell > 0 && cell % 2 === 0) && (
                            <svg className={`${getCrossColor(cell)} opacity-80`} style={{ width: '65%', height: '65%' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      );
                    })}

                    {/* 右侧行线索 */}
                    <div className={`flex justify-start items-center pl-2 border-l-2 gap-1.5 transition-colors
                      ${getBorderBaseClass()}
                      ${isHintRow ? (hintInfo.isError ? 'bg-red-100' : 'bg-amber-100/80') : (isHoverRow ? getHoverBgClass() : (isRowDone && gameSettings.completeLineStyle === 'highlight' ? 'bg-emerald-100' : 'bg-slate-50'))}
                      ${r % 5 === 4 && r !== rows - 1 ? `border-b-2 ${getBorderBaseClass()}` : ''} 
                      ${isRowDone && gameSettings.completeLineStyle === 'fade' ? 'opacity-30' : ''}`}
                    >
                       {mode === 'edit' ? <span className="text-slate-300 px-4 text-xs font-medium">镜像</span> : renderRowClues()}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* === 最后一行：底部列线索 === */}
              <div className={`bg-white border-r-2 border-t-2 transition-colors ${getBorderBaseClass()}`} />

              {colCluesStr.map((str, c) => {
                const isDone = mode === 'play' && isLineCompleted(c, false, grid);
                const isHintCol = (hintInfo?.type === 'col' && hintInfo.index === c) || (hintInfo?.type === 'cell' && hintInfo.c === c);
                const isHoverCol = hoverPos.c === c && mode === 'play';
                const clueTextSize = getClueTextSize();
                const parsed = parseClue(str);
                
                const colLine = grid.map(row => row[c]);
                const autoMarkedCol = gameSettings.autoMarkNumbers ? getAutoMarked(colLine, parsed).marked : [];

                return (
                  <div key={`col-clue-bottom-${c}`} className={`flex flex-col justify-start items-center pt-2 border-t-2 transition-colors
                    ${getBorderBaseClass()}
                    ${isHintCol ? (hintInfo.isError ? 'bg-red-100' : 'bg-amber-100/80') : (isHoverCol ? getHoverBgClass() : (isDone && gameSettings.completeLineStyle === 'highlight' ? 'bg-emerald-100' : 'bg-slate-50'))} 
                    ${c % 5 === 4 && c !== cols - 1 ? `border-r-2 ${getBorderBaseClass()}` : ''} 
                    ${isDone && gameSettings.completeLineStyle === 'fade' ? 'opacity-30' : ''}`}
                  >
                    {mode === 'edit' ? <span className="text-slate-300 text-xs font-medium pt-2">镜像</span> : (
                      parsed.map((num, i) => {
                        const isMarked = markedColClues[`${c}-${i}`] || autoMarkedCol[i];
                        return (
                          <span 
                            key={i} 
                            onMouseDown={(e) => { e.stopPropagation(); toggleMarkedCol(c, i); }}
                            className={`cursor-pointer transition-colors ${clueTextSize} font-black leading-tight hover:opacity-70
                              ${num === 0 ? 'text-transparent' : (isMarked ? 'text-orange-500' : (isHintCol ? 'text-amber-900' : 'text-slate-800'))}`}
                          >
                            {num}
                          </span>
                        );
                      })
                    )}
                  </div>
                );
              })}

              <div className={`bg-white border-l-2 border-t-2 transition-colors ${getBorderBaseClass()}`} />

            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}