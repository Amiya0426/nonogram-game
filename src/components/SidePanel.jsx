import { useRef, useState } from 'react';
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
  SlidersHorizontal,
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
  FileArchive,
  ClipboardPaste,
  ListChecks,
} from 'lucide-react';
import Accordion from './Accordion.jsx';
import FileDropZone from './FileDropZone.jsx';

/** 左侧控制面板：所有折叠区与按钮 */
const SidePanel = ({
  showLeftPanel,
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
  randomDifficulty,
  setRandomDifficulty,
  onGenerateRandom,
  onClearClues,
  cellSize,
  setCellSize,
  onFitToWidth,
  puzzleCollection,
  selectedCollectionIds,
  onSaveToCollection,
  onLoadFromCollection,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onDeleteFromCollection,
  onDeleteSelected,
  onExportCollection,
  onExportCollectionZip,
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
}) => {
  const [ioTab, setIoTab] = useState('import');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [collectionSelectMode, setCollectionSelectMode] = useState(false);
  const batchImportInputRef = useRef(null);
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

    <div
      onMouseLeave={() => {
        if (!isPanelPinned) setIsPanelHovered(false);
      }}
      className={`${showLeftPanel ? 'flex' : 'hidden'} md:flex flex-col bg-white border-r border-slate-200 shadow-2xl w-full md:w-80 lg:w-96 ${
        isPanelPinned
          ? 'relative h-[calc(100vh-65px)] md:h-screen z-10 shrink-0'
          : `fixed top-0 left-0 h-screen z-40 transition-transform duration-300 ease-in-out ${
              isPanelHovered ? 'translate-x-0' : '-translate-x-full'
            }`
      }`}
    >
      <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
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
        {mode === 'play' && (
          <Accordion title="推演与操作" icon={MousePointerClick} defaultOpen>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {deductionLevel < 3 && (
                  <button
                    onClick={onStartDeduction}
                    className={`px-2 py-2 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-sm border flex-1 justify-center
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
                      className="px-2 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-sm border border-emerald-200 flex-1 justify-center"
                    >
                      <Check className="w-4 h-4" /> 应用({deductionLevel})
                    </button>
                    <button
                      onClick={onCancelDeduction}
                      className="px-2 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-sm border border-rose-200 flex-1 justify-center"
                    >
                      <X className="w-4 h-4" /> 放弃({deductionLevel})
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={onValidate}
                className="py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm border border-blue-200"
              >
                <SearchCheck className="w-4 h-4" /> 检查错误
              </button>
              <button
                onClick={onRestore}
                disabled={!lastCorrectSnapshot}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm border border-slate-200"
                title="回退到上一次检查没有报错的状态"
              >
                <Undo2 className="w-4 h-4" /> 恢复检查点
              </button>
            </div>

            <div className="mt-1">
              <button
                onClick={onProvideHint}
                className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm border border-amber-200"
              >
                <Lightbulb className="w-4 h-4" /> 给我提示
              </button>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setInteractionMode('toggle')}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${
                  interactionMode === 'toggle'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MousePointerClick className="w-4 h-4" /> 轮切
              </button>
              <button
                onClick={() => setInteractionMode('paint')}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${
                  interactionMode === 'paint'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <PaintRoller className="w-4 h-4" /> 放置
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
          </Accordion>
        )}

        {/* === 2. 视图与棋盘设置 === */}
        <Accordion title="视图与棋盘设置" icon={ZoomIn} defaultOpen={mode === 'edit'}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">行</label>
              <input
                type="number"
                min="1"
                max="80"
                value={rows}
                onChange={(e) => onInitBoard(parseInt(e.target.value, 10) || 5, cols)}
                className="w-12 px-1 py-1 text-xs rounded border border-slate-300 outline-none focus:border-indigo-500 text-center"
              />
            </div>
            <span className="text-slate-300 text-xs">×</span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">列</label>
              <input
                type="number"
                min="1"
                max="80"
                value={cols}
                onChange={(e) => onInitBoard(rows, parseInt(e.target.value, 10) || 5)}
                className="w-12 px-1 py-1 text-xs rounded border border-slate-300 outline-none focus:border-indigo-500 text-center"
              />
            </div>
            <div className="flex ml-auto gap-1">
              <select
                value={randomDifficulty}
                onChange={(e) => setRandomDifficulty(e.target.value)}
                className="px-1 py-1 text-xs rounded border border-slate-300 outline-none focus:border-emerald-500 bg-white"
              >
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
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

        {/* === 3. 辅助设置（仅游玩） === */}
        {mode === 'play' && (
        <Accordion title="游戏辅助" icon={SlidersHorizontal} defaultOpen={false}>
          <div className="flex flex-col gap-2">
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
              行列完成后高亮背景 (取代变淡)
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={gameSettings.autoMarkNumbers}
                onChange={(e) => setGameSettings((p) => ({ ...p, autoMarkNumbers: e.target.checked }))}
                className="accent-indigo-600 w-3 h-3"
              />{' '}
              自动高亮已达成的线索数字
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={gameSettings.autoFillCross}
                onChange={(e) => setGameSettings((p) => ({ ...p, autoFillCross: e.target.checked }))}
                className="accent-indigo-600 w-3 h-3"
              />{' '}
              智能自动打叉 (填充满足线索及确定区域间的空白格)
            </label>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-1">
            <span className="text-[10px] font-bold text-slate-400 mb-2 block">界面悬浮外挂显示</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={gameSettings.hoverRowClues}
                  onChange={(e) => setGameSettings((p) => ({ ...p, hoverRowClues: e.target.checked }))}
                  className="accent-indigo-600 w-3 h-3"
                />
                行线索跟随
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={gameSettings.hoverColClues}
                  onChange={(e) => setGameSettings((p) => ({ ...p, hoverColClues: e.target.checked }))}
                  className="accent-indigo-600 w-3 h-3"
                />
                列线索跟随
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={gameSettings.showClueSums}
                  onChange={(e) => setGameSettings((p) => ({ ...p, showClueSums: e.target.checked }))}
                  className="accent-indigo-600 w-3 h-3"
                />
                未高亮线索和
              </label>
            </div>
          </div>
        </Accordion>
        )}

        {/* === 4. 收藏夹（本地 / 云端） === */}
        <Accordion title={user ? '云端收藏夹' : '本地收藏夹'} icon={FolderHeart} defaultOpen={false}>
          {!user ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
                <UserRound className="w-3.5 h-3.5" /> 登录后云端保存收藏
              </div>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="用户名 (2-32 位)"
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-indigo-500 bg-white"
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
                placeholder="密码 (至少 6 位)"
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-indigo-500 bg-white"
              />
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
              <p className="text-[9px] text-indigo-500/70 leading-relaxed">
                登录后，本地收藏会自动合并到云端（按名称+尺寸去重）。
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                  <UserRound className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-800 truncate">{user.username}</div>
                  <div className="text-[9px] text-emerald-600/70">
                    云端收藏 {puzzleCollection.length} 个
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="px-2 py-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg text-[11px] font-bold border border-slate-200 transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> 退出
              </button>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSaveToCollection}
                className="flex-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold transition-colors border border-indigo-200 flex items-center justify-center gap-1"
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
                onClick={onDeleteSelected}
                disabled={!selectedCollectionIds.length}
                className="flex-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[10px] font-bold transition-colors border border-red-200 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title="删除所有已选中的收藏"
              >
                <Trash2 className="w-3 h-3" /> 删除选中
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onExportCollection(false)}
                className="flex-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold transition-colors border border-emerald-200 flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" /> 下载全部
              </button>
              <button
                onClick={() => onExportCollection(true)}
                disabled={!selectedCollectionIds.length}
                className="flex-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold transition-colors border border-emerald-200 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title="多选时逐个下载为独立 JSON 文件"
              >
                <Download className="w-3 h-3" /> 下载选中
              </button>
              <button
                onClick={() => onExportCollectionZip(true)}
                disabled={!selectedCollectionIds.length}
                className="flex-1 px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] font-bold transition-colors border border-amber-200 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title="将选中的收藏打包为一个 ZIP 文件"
              >
                <FileArchive className="w-3 h-3" /> 选中 ZIP
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500">
              {user ? '数据保存在云端' : '本地保存，登录后可同步'}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
            <span>
              {selectedCollectionIds.length}/{puzzleCollection.length} 已选
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCollectionSelectMode(!collectionSelectMode)}
                className={`px-1.5 py-0.5 rounded border font-medium transition-colors flex items-center gap-1 ${
                  collectionSelectMode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title={
                  collectionSelectMode
                    ? '关闭选择模式（点击题目即游玩）'
                    : '开启选择模式（点击题目即选中/取消）'
                }
              >
                <ListChecks className="w-3 h-3" /> 选择
              </button>
              <button
                onClick={onSelectAll}
                className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                全选
              </button>
              <button
                onClick={onClearSelection}
                className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                清空
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto bg-slate-50 rounded p-2 border border-slate-100">
            {puzzleCollection.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-2">暂无收藏的题目</p>
            ) : (
              puzzleCollection.map((item) => {
                const isSelected = selectedCollectionIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      collectionSelectMode
                        ? onToggleSelection(item.id)
                        : onLoadFromCollection(item)
                    }
                    className={`flex items-center gap-2 bg-white p-1.5 rounded border shadow-sm cursor-pointer transition-colors group ${
                      collectionSelectMode && isSelected
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {collectionSelectMode && (
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </span>
                    )}
                    <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
                      <span className="text-[9px] text-slate-400">
                        {item.cols}×{item.rows} - {item.date}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] shrink-0 transition-opacity ${
                        collectionSelectMode
                          ? isSelected
                            ? 'text-indigo-500 font-bold'
                            : 'text-indigo-400'
                          : 'text-slate-300 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {collectionSelectMode ? (isSelected ? '已选中' : '点击选中') : '点击游玩'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFromCollection(item.id);
                      }}
                      className="p-1 bg-red-50 text-red-500 hover:bg-red-100 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Accordion>

        {/* === 5. 导入与导出 === */}
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
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onExportImage('png')}
                    className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex justify-center items-center gap-1.5 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> PNG
                  </button>
                  <button
                    onClick={() => onExportImage('jpeg')}
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
    </>
  );
};

export default SidePanel;
