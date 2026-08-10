import { useMemo, useRef, useState } from 'react';
import {
  Check,
  RefreshCw,
  Dices,
  Eraser,
  AlertCircle,
  ZoomIn,
  MousePointerClick,
  PaintRoller,
  Square,
  XSquare,
  FileMinus,
  Lightbulb,
  Download,
  SearchCheck,
  Pin,
  PinOff,
  Maximize,
  UploadCloud,
  ClipboardCopy,
  FileJson,
  Image as ImageIcon,
  Trash2,
  BookmarkPlus,
  GitBranch,
  X,
  Undo2,
  FolderHeart,
  FileSymlink,
  ChevronRight,
  Globe,
  Wand2,
  Braces,
  FileUp,
  PencilLine,
  UserRound,
  LogIn,
  LogOut,
  FolderInput,
  ClipboardPaste,
  ListChecks,
  Minus,
  Plus,
  Clock,
  Pause,
  Play,
  Film,
  Trophy,
} from 'lucide-react';
import Accordion from './Accordion.jsx';
import FileDropZone from './FileDropZone.jsx';

/** 左侧控制面板：所有折叠区与按钮 */
const SidePanel = ({
  showLeftPanel,
  setShowLeftPanel,
  isPanelPinned,
  setIsPanelPinned,
  isPanelHovered,
  setIsPanelHovered,
  mode,
  onModeChange,
  editInputMode,
  setEditInputMode,
  onCancelEditing,
  onFinishEditing,
  user,
  authBusy,
  onLogin,
  onRegister,
  onLogout,
  hintInfo,
  alertMsg,
  deductionLevel,
  onStartDeduction,
  onApplyDeduction,
  onCancelDeduction,
  onValidate,
  onRestore,
  lastCorrectSnapshot,
  onProvideHint,
  interactionMode,
  setInteractionMode,
  currentBrush,
  setCurrentBrush,
  gameSettings,
  setGameSettings,
  rows,
  cols,
  onInitBoard,
  onGenerateRandom,
  onClearClues,
  cellSize,
  setCellSize,
  onFitToWidth,
  puzzleCollection,
  selectedCollectionIds,
  onSaveToCollection,
  onRenameCollection,
  isItemCompleted,
  onLoadFromCollection,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onDeleteFromCollection,
  onDeleteSelected,
  onExportCollection,
  onImportCollectionFiles,
  onExportCode,
  onExportJSON,
  onExportImage,
  exportFilename,
  setExportFilename,
  exportRemark,
  setExportRemark,
  importData,
  setImportData,
  onImport,
  isImporting,
  localImportData,
  setLocalImportData,
  onLocalImport,
  onImportFile,
  onClearBoard,
  onAutoSolve,
  isSolvedStatus,
  timerSeconds,
  timerRunning,
  togglePauseTimer,
  userProgress,
  isGeneratingGif,
  generateReplayGif,
}) => {
  const [ioTab, setIoTab] = useState('import');
  const [activeTab, setActiveTab] = useState('game');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [collectionSelectMode, setCollectionSelectMode] = useState(false);
  const [collectionSort, setCollectionSort] = useState('newest');
  const [imgScale, setImgScale] = useState('2');
  const [imgJpegQuality, setImgJpegQuality] = useState('0.9');
  const [imgDpi, setImgDpi] = useState('96');
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const v = Number(localStorage.getItem('nonogram_panel_width'));
      return v >= 240 && v <= 520 ? v : 352;
    } catch {
      return 352;
    }
  });
  const panelWidthRef = useRef(panelWidth);
  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelWidthRef.current;
    const onMove = (ev) => {
      const w = Math.min(520, Math.max(240, startW + (ev.clientX - startX)));
      panelWidthRef.current = w;
      setPanelWidth(w);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      try {
        localStorage.setItem('nonogram_panel_width', String(panelWidthRef.current));
      } catch {
        // 忽略存储失败
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  const batchImportInputRef = useRef(null);
  const [rowText, setRowText] = useState(String(rows));
  const [colText, setColText] = useState(String(cols));
  const [prevRows, setPrevRows] = useState(rows);
  const [prevCols, setPrevCols] = useState(cols);
  if (prevRows !== rows) {
    setPrevRows(rows);
    setRowText(String(rows));
  }
  if (prevCols !== cols) {
    setPrevCols(cols);
    setColText(String(cols));
  }

  const clampBoard = (v) => Math.max(1, Math.min(80, v));
  const commitRow = () => {
    onInitBoard(clampBoard(parseInt(rowText, 10) || 1), cols);
  };
  const commitCol = () => {
    onInitBoard(rows, clampBoard(parseInt(colText, 10) || 1));
  };
  const stepRow = (delta) => {
    const base = parseInt(rowText, 10);
    onInitBoard(clampBoard((Number.isNaN(base) ? rows : base) + delta), cols);
  };
  const stepCol = (delta) => {
    const base = parseInt(colText, 10);
    onInitBoard(rows, clampBoard((Number.isNaN(base) ? cols : base) + delta));
  };

  /** tab 显示控制：手机端只显示当前 tab，桌面端全部显示 */
  const tabCls = (tab) =>
    `${activeTab === tab ? 'flex flex-col gap-4' : 'hidden md:flex md:flex-col md:gap-4'}`;

  const formatTime = (total) => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const p = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  };

  /** 按尺寸统计已完成题目 */
  const sizeStats = useMemo(() => {
    const m = new Map();
    for (const p of userProgress) {
      if (p && p.rows && p.cols) {
        const dim = `${p.cols}x${p.rows}`;
        m.set(dim, (m.get(dim) || 0) + 1);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [userProgress]);

  /** 已完成/未完成 + 导入时间排序 */
  const sortedCollection = useMemo(() => {
    const list = [...puzzleCollection];
    const sortTime = (item) =>
      user
        ? Date.parse(String(item.date || '').replace(' ', 'T') + 'Z') || 0
        : Number(item.id) || 0;
    switch (collectionSort) {
      case 'oldest':
        list.sort((a, b) => sortTime(a) - sortTime(b));
        break;
      case 'uncompleted':
        list.sort(
          (a, b) =>
            (isItemCompleted(a) ? 1 : 0) - (isItemCompleted(b) ? 1 : 0) ||
            sortTime(b) - sortTime(a),
        );
        break;
      case 'completed':
        list.sort(
          (a, b) =>
            (isItemCompleted(b) ? 1 : 0) - (isItemCompleted(a) ? 1 : 0) ||
            sortTime(b) - sortTime(a),
        );
        break;
      default:
        list.sort((a, b) => sortTime(b) - sortTime(a));
    }
    return list;
  }, [puzzleCollection, collectionSort, user, isItemCompleted]);

  return (
    <>
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

    {/* 移动端抽屉遮罩：点遮罩关闭，棋盘保持可见 */}
    {showLeftPanel && (
      <div
        className="md:hidden fixed inset-0 top-[65px] bg-black/30 z-30"
        onClick={() => setShowLeftPanel(false)}
      />
    )}

    <div
      onMouseLeave={() => {
        if (!isPanelPinned) setIsPanelHovered(false);
      }}
      className={`
        flex flex-col bg-white border-r border-slate-200 shadow-2xl
        fixed top-[65px] bottom-0 left-0 z-40 w-full md:w-[var(--panel-w)]
        transition-transform duration-300 ease-in-out
        ${showLeftPanel ? 'translate-x-0' : '-translate-x-full'}
        md:top-0 md:bottom-auto md:w-[var(--panel-w)]
        ${isPanelPinned
          ? 'md:relative md:h-screen md:z-10 md:shrink-0 md:translate-x-0'
          : `md:fixed md:h-screen md:z-40 ${
              isPanelHovered ? 'md:translate-x-0' : 'md:-translate-x-full'
            }`}
      `}
      style={{ '--panel-w': `${panelWidth}px` }}
    >
      <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
        {/* 用户卡片：登录 / 已解统计 */}
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 p-3 flex flex-col gap-2 shrink-0">
          {user ? (
            <>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                {String(user.username || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-800 truncate">{user.username}</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  已解 {userProgress.length} 题 · 云端收藏 {puzzleCollection.length} 个
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            {sizeStats.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-indigo-100 pt-2">
                {sizeStats.slice(0, 5).map(([dim, n]) => (
                  <span
                    key={dim}
                    className="px-2 py-0.5 bg-white/80 border border-indigo-100 rounded-full text-[10px] font-bold text-indigo-700"
                  >
                    {dim} × {n}
                  </span>
                ))}
                {sizeStats.length > 5 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold text-slate-400">
                    +{sizeStats.length - 5} 种尺寸
                  </span>
                )}
              </div>
            )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
                <UserRound className="w-3.5 h-3.5" /> 登录后可同步收藏与解题进度
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="用户名"
                  className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && authUsername.trim() && authPassword) {
                      onLogin(authUsername, authPassword);
                    }
                  }}
                  placeholder="密码"
                  className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onLogin(authUsername, authPassword)}
                  disabled={authBusy || !authUsername.trim() || !authPassword}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed flex justify-center items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" /> 登录
                </button>
                <button
                  onClick={() => onRegister(authUsername, authPassword)}
                  disabled={authBusy || !authUsername.trim() || !authPassword}
                  className="flex-1 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  注册
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 模式头部：游玩 = 主界面；自定义题目 = 独立编辑视图 */}
        {mode === 'play' ? (
          <div className="hidden md:flex pb-2 border-b border-slate-100 justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-indigo-900">
                <Dices className="w-7 h-7 text-indigo-500" /> 数织解谜
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5">游玩模式</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onModeChange('edit')}
                className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-orange-200 transition-colors"
                title="创建或修改自己的题目"
              >
                <PencilLine className="w-3.5 h-3.5" /> 自定义题目
              </button>
              <button
                onClick={() => {
                  setIsPanelPinned(!isPanelPinned);
                  setIsPanelHovered(true);
                }}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  !isPanelPinned
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                }`}
                title={isPanelPinned ? '取消固定 (自动隐藏)' : '固定侧边栏'}
              >
                {isPanelPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-3 flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600 shrink-0">
                  <PencilLine className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-orange-900">自定义题目</div>
                  <div className="text-[9px] text-orange-600/70 truncate">画好图案后自动生成线索</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={onCancelEditing}
                  className="px-2 py-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition-colors"
                  title="放弃本次修改，回到游玩"
                >
                  <X className="w-3.5 h-3.5" /> 取消
                </button>
                <button
                  onClick={onFinishEditing}
                  className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> 完成
                </button>
              </div>
            </div>

            {/* 输入方式：画盘面 / 手动输入 */}
            <div className="flex bg-white/80 p-1 rounded-lg">
              <button
                onClick={() => setEditInputMode('pattern')}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold flex justify-center items-center gap-1.5 transition-all ${
                  editInputMode === 'pattern'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <MousePointerClick className="w-3.5 h-3.5" /> 画盘面
              </button>
              <button
                onClick={() => setEditInputMode('manual')}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold flex justify-center items-center gap-1.5 transition-all ${
                  editInputMode === 'manual'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Braces className="w-3.5 h-3.5" /> 手动输入
              </button>
            </div>

            {/* 画笔工具（画盘面模式） */}
            {editInputMode === 'pattern' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setInteractionMode('toggle')}
                    className={`flex-1 py-1.5 text-[11px] rounded-lg border font-medium flex items-center justify-center gap-1 transition-all ${
                      interactionMode === 'toggle'
                        ? 'bg-white text-orange-700 border-orange-300 shadow-sm'
                        : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <MousePointerClick className="w-3.5 h-3.5" /> 轮切
                  </button>
                  <button
                    onClick={() => setInteractionMode('paint')}
                    className={`flex-1 py-1.5 text-[11px] rounded-lg border font-medium flex items-center justify-center gap-1 transition-all ${
                      interactionMode === 'paint'
                        ? 'bg-white text-orange-700 border-orange-300 shadow-sm'
                        : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <PaintRoller className="w-3.5 h-3.5" /> 放置
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentBrush(1)}
                    className={`flex-1 py-1.5 rounded-lg flex justify-center items-center gap-1 text-[11px] font-medium transition-all ${
                      currentBrush === 1
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-white/60 text-slate-400 hover:bg-white border border-slate-200'
                    }`}
                  >
                    <Square fill="currentColor" className="w-3.5 h-3.5" /> 填充
                  </button>
                  <button
                    onClick={() => setCurrentBrush(2)}
                    className={`flex-1 py-1.5 rounded-lg flex justify-center items-center gap-1 text-[11px] font-medium transition-all ${
                      currentBrush === 2
                        ? 'bg-red-50 text-red-500 shadow-sm border border-red-200'
                        : 'bg-white/60 text-slate-400 hover:bg-white border border-slate-200'
                    }`}
                  >
                    <XSquare className="w-3.5 h-3.5" /> 打叉
                  </button>
                  <button
                    onClick={() => setCurrentBrush(0)}
                    className={`flex-1 py-1.5 rounded-lg flex justify-center items-center gap-1 text-[11px] font-medium transition-all ${
                      currentBrush === 0
                        ? 'bg-white text-slate-700 shadow-sm border border-slate-200'
                        : 'bg-white/60 text-slate-400 hover:bg-white border border-slate-200'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" /> 擦除
                  </button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-orange-800/80 leading-relaxed">
              {editInputMode === 'pattern'
                ? '在盘面上点击或拖拽：左键依次 填充 → 打叉 → 清空，右键直接打叉；两侧线索会实时预览。'
                : '在棋盘左/上边缘的文本框输入数字，空格、逗号或换行分隔均可。'}
            </p>
          </div>
        )}

        {hintInfo && mode === 'play' && (
          <div
            className={`p-3 rounded-lg border text-sm shadow-sm leading-relaxed flex gap-2 shrink-0 animate-in fade-in slide-in-from-top-2 ${
              hintInfo.isError
                ? 'bg-red-50 border-red-200 text-red-800'
                : hintInfo.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {hintInfo.isError ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : hintInfo.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Lightbulb className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <p className="text-xs">{hintInfo.text}</p>
          </div>
        )}

        {alertMsg && (
          <div className="p-2 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200 font-medium text-center shrink-0">
            {alertMsg}
          </div>
        )}

        {/* === 1. 推演与操作区 === */}
        <div className={tabCls('game')}>

        {/* 计时器 + 复盘 GIF */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span className="font-mono text-lg font-bold text-slate-800 tabular-nums">{formatTime(timerSeconds)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isSolvedStatus && (
              <button
                onClick={generateReplayGif}
                disabled={isGeneratingGif}
                className="px-2.5 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-violet-200 disabled:opacity-50 transition-colors"
                title="生成这盘的复盘 GIF"
              >
                <Film className="w-3.5 h-3.5" /> {isGeneratingGif ? '生成中...' : '复盘GIF'}
              </button>
            )}
            <button
              onClick={togglePauseTimer}
              className={`p-2 rounded-lg border transition-colors ${
                timerRunning
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
              title={timerRunning ? '暂停计时' : '继续计时'}
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </div>

{mode === 'play' && (
          <Accordion title="推演与操作" icon={MousePointerClick} defaultOpen>
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                {deductionLevel < 3 && (
                  <button
                    onClick={onStartDeduction}
                    className={`col-span-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm border
                      ${deductionLevel === 0 ? 'bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 border-fuchsia-200' : ''}
                      ${deductionLevel === 1 ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200' : ''}
                      ${deductionLevel === 2 ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200' : ''}
                    `}
                  >
                    <GitBranch className="w-4 h-4" />
                    {deductionLevel === 0 ? '开始推演 (1级)' : `深入推演 (${deductionLevel + 1}级)`}
                  </button>
                )}
                {deductionLevel > 0 && (
                  <>
                    <button
                      onClick={onApplyDeduction}
                      className="py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm border border-emerald-200"
                    >
                      <Check className="w-4 h-4" /> 应用({deductionLevel})
                    </button>
                    <button
                      onClick={onCancelDeduction}
                      className="py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm border border-rose-200"
                    >
                      <X className="w-4 h-4" /> 放弃({deductionLevel})
                    </button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={onValidate}
                  className="py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-blue-200"
                >
                  <SearchCheck className="w-4 h-4" /> 检查错误
                </button>
                <button
                  onClick={onRestore}
                  disabled={!lastCorrectSnapshot}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-slate-200"
                  title="回退到上一次检查没有报错的状态"
                >
                  <Undo2 className="w-4 h-4" /> 恢复检查点
                </button>
              </div>

              <button
                onClick={onProvideHint}
                className="py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-amber-200"
              >
                <Lightbulb className="w-4 h-4" /> 给我提示
              </button>
            </div>

            <div className="flex gap-1.5 mt-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setInteractionMode('toggle')}
                className={`flex-1 py-1.5 text-xs rounded-md font-bold flex items-center justify-center gap-1.5 transition-all ${
                  interactionMode === 'toggle'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <MousePointerClick className="w-3.5 h-3.5" /> 轮切
              </button>
              <button
                onClick={() => setInteractionMode('paint')}
                className={`flex-1 py-1.5 text-xs rounded-md font-bold flex items-center justify-center gap-1.5 transition-all ${
                  interactionMode === 'paint'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <PaintRoller className="w-3.5 h-3.5" /> 放置
              </button>
            </div>

            {interactionMode === 'paint' && (
              <div className="flex gap-2 p-1 bg-slate-50 rounded-lg border border-slate-200">
                <button
                  onClick={() => setCurrentBrush(1)}
                  className={`flex-1 py-2 rounded flex justify-center ${
                    currentBrush === 1 ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <Square fill="currentColor" className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentBrush(2)}
                  className={`flex-1 py-2 rounded flex justify-center ${
                    currentBrush === 2 ? 'bg-red-50 text-red-500 shadow-sm border border-red-200' : 'text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <XSquare className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentBrush(0)}
                  className={`flex-1 py-2 rounded flex justify-center ${
                    currentBrush === 0 ? 'bg-white text-slate-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <Eraser className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* 辅助设置（原“游戏辅助”，已合并） */}
            <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400">辅助设置</span>
              <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={gameSettings.completeLineStyle === 'highlight'}
                  onChange={(e) =>
                    setGameSettings((p) => ({
                      ...p,
                      completeLineStyle: e.target.checked ? 'highlight' : 'fade',
                    }))
                  }
                  className="accent-indigo-600 w-3 h-3"
                />{' '}
                完成的行列高亮
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={gameSettings.autoMarkNumbers}
                  onChange={(e) => setGameSettings((p) => ({ ...p, autoMarkNumbers: e.target.checked }))}
                  className="accent-indigo-600 w-3 h-3"
                />{' '}
                自动高亮已完成线索
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={gameSettings.autoFillCross}
                  onChange={(e) => setGameSettings((p) => ({ ...p, autoFillCross: e.target.checked }))}
                  className="accent-indigo-600 w-3 h-3"
                />{' '}
                自动补全确定叉格
              </label>
              <div className="border-t border-slate-100 pt-2 mt-1 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-slate-400">悬浮提示</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={gameSettings.hoverRowClues}
                      onChange={(e) => setGameSettings((p) => ({ ...p, hoverRowClues: e.target.checked }))}
                      className="accent-indigo-600 w-3 h-3"
                    />
                    行跟随
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={gameSettings.hoverColClues}
                      onChange={(e) => setGameSettings((p) => ({ ...p, hoverColClues: e.target.checked }))}
                      className="accent-indigo-600 w-3 h-3"
                    />
                    列跟随
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={gameSettings.showClueSums}
                      onChange={(e) => setGameSettings((p) => ({ ...p, showClueSums: e.target.checked }))}
                      className="accent-indigo-600 w-3 h-3"
                    />
                    线索和
                  </label>
                </div>
              </div>
            </div>
          </Accordion>
        )}

        {/* === 2. 视图与棋盘设置 === */}
        <Accordion title="视图与棋盘设置" icon={ZoomIn} defaultOpen={mode === 'edit'}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-500">行</label>
              <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => stepRow(-1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                  title="减小行数"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={rowText}
                  onChange={(e) => setRowText(e.target.value)}
                  onBlur={commitRow}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitRow();
                      e.currentTarget.blur();
                    }
                  }}
                  onWheel={(e) => (e.deltaY < 0 ? stepRow(1) : stepRow(-1))}
                  className="w-11 px-0.5 py-1 text-xs outline-none focus:bg-indigo-50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => stepRow(1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                  title="增大行数"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <span className="text-slate-300 text-xs">×</span>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-500">列</label>
              <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => stepCol(-1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                  title="减小列数"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={colText}
                  onChange={(e) => setColText(e.target.value)}
                  onBlur={commitCol}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitCol();
                      e.currentTarget.blur();
                    }
                  }}
                  onWheel={(e) => (e.deltaY < 0 ? stepCol(1) : stepCol(-1))}
                  className="w-11 px-0.5 py-1 text-xs outline-none focus:bg-indigo-50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => stepCol(1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                  title="增大列数"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex ml-auto gap-1">
              <button
                onClick={onGenerateRandom}
                className="p-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded transition-colors"
                title="随机生成"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              {mode === 'edit' && (
                <button
                  onClick={onClearClues}
                  className="p-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                  title="清空线索"
                >
                  <FileMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <span className="text-xs font-semibold text-slate-500">缩放</span>
            <div className="flex items-center gap-2 flex-1 ml-2">
              <input
                type="range"
                min="12"
                max="80"
                value={cellSize}
                onChange={(e) => setCellSize(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-ew-resize"
              />
              <button
                onClick={onFitToWidth}
                className="p-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors border border-indigo-100"
                title="自适应宽度"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Accordion>

        {/* === 4. 收藏夹（本地 / 云端） === */}
        </div>

        <div className={tabCls('collection')}>
<Accordion title="收藏夹" icon={FolderHeart} defaultOpen={false}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-1 px-0.5 text-[10px] text-slate-500">
              <span className="truncate">
                {user ? '云端已同步' : '登录后收藏将同步到云端'} · {puzzleCollection.length} 个
              </span>
              <select
                value={collectionSort}
                onChange={(e) => setCollectionSort(e.target.value)}
                className="shrink-0 text-[10px] rounded border border-slate-200 bg-white text-slate-600 px-1 py-0.5 outline-none focus:border-indigo-400"
                title="排序方式"
              >
                <option value="newest">最新导入</option>
                <option value="oldest">最早导入</option>
                <option value="uncompleted">未完成优先</option>
                <option value="completed">已完成优先</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSaveToCollection}
                className="flex-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold transition-colors border border-indigo-200 flex items-center justify-center gap-1"
                title="把当前题目存入收藏夹"
              >
                <BookmarkPlus className="w-3 h-3" /> 存入当前
              </button>
              <button
                onClick={() => batchImportInputRef.current?.click()}
                className="flex-1 px-2 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-[10px] font-bold transition-colors border border-sky-200 flex items-center justify-center gap-1 cursor-pointer"
                title="支持多选 JSON 文件或 ZIP 压缩包"
              >
                <FolderInput className="w-3 h-3" /> 批量导入
              </button>
              <input
                ref={batchImportInputRef}
                type="file"
                multiple
                accept=".json,.zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={(e) => {
                  onImportCollectionFiles(e.target.files);
                  e.target.value = null;
                }}
              />
              <button
                onClick={() => onExportCollection(false)}
                className="flex-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold transition-colors border border-emerald-200 flex items-center justify-center gap-1"
                title="把全部收藏导出为一个 JSON 文件"
              >
                <Download className="w-3 h-3" /> 导出全部
              </button>
            </div>
            {collectionSelectMode ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 shrink-0">
                  已选 {selectedCollectionIds.length}/{puzzleCollection.length}
                </span>
                <button
                  onClick={onSelectAll}
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[10px] font-medium"
                >
                  全选
                </button>
                <button
                  onClick={onClearSelection}
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[10px] font-medium"
                >
                  清空
                </button>
                <button
                  onClick={() => onExportCollection(true)}
                  disabled={!selectedCollectionIds.length}
                  className="px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold disabled:opacity-50 flex items-center gap-0.5"
                  title="导出选中的收藏（逐个 JSON 文件）"
                >
                  <Download className="w-3 h-3" /> 导出选中
                </button>
                <button
                  onClick={onDeleteSelected}
                  disabled={!selectedCollectionIds.length}
                  className="px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-bold disabled:opacity-50 flex items-center gap-0.5"
                  title="删除选中的收藏"
                >
                  <Trash2 className="w-3 h-3" /> 删除
                </button>
                <button
                  onClick={() => setCollectionSelectMode(false)}
                  className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-medium"
                >
                  完成
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCollectionSelectMode(true)}
                className="self-start px-2 py-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-[10px] font-medium flex items-center gap-1"
                title="多选管理：选中后可批量导出或删除"
              >
                <ListChecks className="w-3 h-3" /> 选择
              </button>
            )}
          </div>
          <div
            className="grid gap-2 max-h-52 overflow-y-auto bg-slate-50 rounded p-2 border border-slate-100"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}
          >
            {sortedCollection.length === 0 ? (
              <p className="col-span-full text-[10px] text-slate-400 text-center py-2">
                暂无收藏的题目
              </p>
            ) : (
              sortedCollection.map((item) => {
                const isSelected = selectedCollectionIds.includes(item.id);
                const done = isItemCompleted(item);
                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      collectionSelectMode
                        ? onToggleSelection(item.id)
                        : onLoadFromCollection(item)
                    }
                    className={`relative flex flex-col gap-1 p-2 rounded-lg border shadow-sm cursor-pointer transition-colors group min-h-[104px] ${
                      done
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    } ${
                      collectionSelectMode && isSelected
                        ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                        : ''
                    }`}
                  >
                    {collectionSelectMode && (
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded border flex items-center justify-center z-10 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </span>
                    )}
                    {done && (
                      <span className="absolute top-1 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-bold z-10">
                        <Check className="w-2.5 h-2.5" /> 已完成
                      </span>
                    )}
                    <div className="flex items-start gap-1 pr-9 min-w-0">
                      <span className="text-[11px] font-bold text-slate-700 leading-snug line-clamp-2 break-all">
                        {item.name}
                      </span>
                    </div>
                    {item.puzzle_id && (
                      <span className="self-start px-1 rounded bg-emerald-100 text-emerald-700 text-[8px] font-bold">
                        题库
                      </span>
                    )}
                    <div className="mt-auto flex flex-col gap-0.5 min-w-0">
                      <span className="text-[9px] text-slate-400">
                        {item.cols}×{item.rows}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate">{item.date}</span>
                    </div>
                    <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRenameCollection(item.id);
                        }}
                        className="p-1 rounded bg-white text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 shadow-sm border border-slate-200"
                        title="改名"
                      >
                        <PencilLine className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFromCollection(item.id);
                        }}
                        className="p-1 rounded bg-white text-red-500 hover:bg-red-100 shadow-sm border border-slate-200"
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Accordion>

        {/* === 5. 导入与导出 === */}
        </div>

        <div className={tabCls('import')}>
<Accordion title="导入与导出" icon={FileSymlink} defaultOpen={false}>
          {/* 导入 / 导出 Tab 切换 */}
          <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setIoTab('import')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold flex justify-center items-center gap-1.5 transition-all ${
                ioTab === 'import'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" /> 导入
            </button>
            <button
              onClick={() => setIoTab('export')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold flex justify-center items-center gap-1.5 transition-all ${
                ioTab === 'export'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardCopy className="w-3.5 h-3.5" /> 导出
            </button>
          </div>

          {ioTab === 'import' ? (
            <>
              {/* 网页解析 */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-700">从网页解析题目</div>
                    <div className="text-[9px] text-slate-400 truncate">粘贴外部网站源码即可自动提取</div>
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="粘贴目标网站源码..."
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-indigo-500 font-mono bg-white"
                />
                <button
                  onClick={onImport}
                  disabled={isImporting || !importData.trim()}
                  className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 shadow-sm"
                >
                  <Wand2 className="w-3.5 h-3.5" /> 解析提取
                </button>
              </div>

              {/* 存档恢复 */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <UploadCloud className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-700">恢复存档</div>
                    <div className="text-[9px] text-slate-400 truncate">代码一键导入，或拖拽 JSON 文件</div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={localImportData}
                    onChange={(e) => setLocalImportData(e.target.value)}
                    placeholder="粘贴存档代码..."
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-emerald-500 font-mono bg-white"
                  />
                  <button
                    onClick={onLocalImport}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    title="输入框为空时，自动读取剪贴板中的存档代码并导入"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" /> 导入
                  </button>
                </div>
                <FileDropZone
                  onFiles={(files) => onImportFile(files[0])}
                  icon={FileUp}
                  buttonText="点击选择或拖拽 JSON 文件到此处"
                  hint="支持 .json 格式存档，松手即导入"
                />
              </div>
            </>
          ) : (
            <>
              {/* 存档导出 */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <FileJson className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-700">导出存档</div>
                    <div className="text-[9px] text-slate-400 truncate">复制代码或下载 JSON 文件</div>
                  </div>
                </div>
                <input
                  type="text"
                  value={exportFilename}
                  onChange={(e) => setExportFilename(e.target.value)}
                  placeholder="导出文件名 (选填)"
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-emerald-500 bg-white"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={onExportCode}
                    className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex justify-center items-center gap-1.5 transition-colors"
                  >
                    <ClipboardCopy className="w-3.5 h-3.5" /> 复制代码
                  </button>
                  <button
                    onClick={onExportJSON}
                    className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex justify-center items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> JSON
                  </button>
                </div>
              </div>

              {/* 图片导出 */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-700">导出图片</div>
                    <div className="text-[9px] text-slate-400 truncate">可在图片底部附加留言（选填）</div>
                  </div>
                </div>
                <input
                  type="text"
                  value={exportRemark}
                  onChange={(e) => setExportRemark(e.target.value)}
                  placeholder="图片底部留言 (选填)"
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-blue-500 bg-white"
                />
                <div className="grid grid-cols-3 gap-1.5">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-500">清晰度</span>
                    <select
                      name="img-scale"
                      value={imgScale}
                      onChange={(e) => setImgScale(e.target.value)}
                      className="text-[10px] rounded border border-slate-200 bg-white text-slate-600 px-1 py-1 outline-none"
                    >
                      <option value="1">标准 1x</option>
                      <option value="2">高清 2x</option>
                      <option value="3">超清 3x</option>
                      <option value="4">4K 4x</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-500">JPG 质量</span>
                    <select
                      name="img-jpeg-quality"
                      value={imgJpegQuality}
                      onChange={(e) => setImgJpegQuality(e.target.value)}
                      className="text-[10px] rounded border border-slate-200 bg-white text-slate-600 px-1 py-1 outline-none"
                    >
                      <option value="0.95">高</option>
                      <option value="0.9">标准</option>
                      <option value="0.7">低</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-500">DPI</span>
                    <select
                      name="img-dpi"
                      value={imgDpi}
                      onChange={(e) => setImgDpi(e.target.value)}
                      className="text-[10px] rounded border border-slate-200 bg-white text-slate-600 px-1 py-1 outline-none"
                    >
                      <option value="72">72</option>
                      <option value="96">96</option>
                      <option value="150">150</option>
                      <option value="300">300</option>
                    </select>
                  </label>
                </div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  清晰度 = 每格像素放大倍数；DPI 为打印元数据（屏幕显示无差别）。
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() =>
                      onExportImage('png', { scale: Number(imgScale), dpi: Number(imgDpi) })
                    }
                    className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex justify-center items-center gap-1.5 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> PNG
                  </button>
                  <button
                    onClick={() =>
                      onExportImage('jpeg', {
                        scale: Number(imgScale),
                        jpegQuality: Number(imgJpegQuality),
                        dpi: Number(imgDpi),
                      })
                    }
                    className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex justify-center items-center gap-1.5 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> JPG
                  </button>
                </div>
              </div>
            </>
          )}
        </Accordion>

        <div className="mt-auto pt-2 flex flex-col gap-2 shrink-0">
          <button
            onClick={onClearBoard}
            className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Eraser className="w-4 h-4" /> {mode === 'edit' ? '清空画板 / 图案' : '清空画板'}
          </button>
          {mode === 'edit' ? (
            <button
              onClick={onFinishEditing}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Check className="w-4 h-4" /> 完成编辑并游玩
            </button>
          ) : (
            <button
              onClick={onAutoSolve}
              className="w-full py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Check className="w-4 h-4" /> 一键解题
            </button>
          )}
        </div>
      </div>

        </div>

        {/* 移动端底部导航 */}
        <div className="md:hidden flex border-t border-slate-200 bg-white shrink-0 sticky bottom-0">
          {[
            { key: 'game', label: '游戏', Icon: MousePointerClick },
            { key: 'collection', label: '收藏', Icon: FolderHeart },
            { key: 'import', label: '导入', Icon: FileSymlink },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors ${
                activeTab === key ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        {/* 桌面端：拖拽调整侧边栏宽度 */}
        <div
          onPointerDown={startResize}
          className="hidden md:block absolute top-0 right-0 h-full w-1.5 cursor-col-resize z-50 bg-transparent hover:bg-indigo-300/60 active:bg-indigo-400/60 transition-colors"
          title="拖动调整面板宽度"
        />
    </div>
    </>
  );
};

export default SidePanel;
