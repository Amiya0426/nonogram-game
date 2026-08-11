import { useRef, useState } from 'react';
import {
  Dices,
  Check,
  PencilLine,
  Pin,
  PinOff,
  ChevronRight,
  HelpCircle,
  AlertCircle,
  Lightbulb,
  Eraser,
  X,
  MousePointerClick,
  FileSymlink,
  Braces,
  ImagePlus,
  PaintRoller,
  Square,
  XSquare,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import SidePanelUserArea from './SidePanelUserArea.jsx';
import SidePanelGameControls from './SidePanelGameControls.jsx';
import SidePanelViewSettings from './SidePanelViewSettings.jsx';
import SidePanelImportExport from './SidePanelImportExport.jsx';
import { useI18n } from '../i18n/index.js';

/** GitHub 图标（lucide 已移除品牌图标，内联 SVG） */
const GithubIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12v3.14c0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

/**
 * 左侧控制面板容器：持有面板级状态（固定/悬停/宽度/移动端 Tab），
 * 并把内容按职责分发给四个子组件：
 * - SidePanelUserArea     用户区
 * - SidePanelGameControls 游戏控制
 * - SidePanelViewSettings 视图设置
 * - SidePanelImportExport 导入导出
 */
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
  onOpenImageImport,
  onOpenIntro,
  user,
  onOpenAuth,
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
  onOpenBrowse,
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
  userProgress,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('game');
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

  /** 左下角快捷按钮（可扩展） */
  const footerActions = [
    {
      key: 'help',
      Icon: HelpCircle,
      title: t('panel.help'),
      onClick: onOpenIntro,
    },
    {
      key: 'github',
      Icon: GithubIcon,
      title: t('panel.github'),
      onClick: () => window.open('https://github.com/Amiya0426/nonogram-game', '_blank', 'noopener'),
    },
  ];

  /** tab 显示控制：手机端只显示当前 tab，桌面端全部显示 */
  const tabCls = (tab) =>
    `${activeTab === tab ? 'flex flex-col gap-4' : 'hidden md:flex md:flex-col md:gap-4'}`;

  return (
    <>
    {!isPanelPinned && !isPanelHovered && (
      <div
        data-testid="panel-edge-tab"
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
        {/* 模式头部：游玩 = 主界面；自定义题目 = 独立编辑视图 */}
        {mode === 'play' ? (
          <div className="hidden md:flex pb-2 border-b border-slate-100 justify-between items-center">
            <div>
              <h1
                data-testid="panel-title"
                className="text-2xl font-bold flex items-center gap-2 text-indigo-900"
              >
                <Dices className="w-7 h-7 text-indigo-500" /> {t('app.title')}
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('app.playMode')}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <LanguageSwitcher />
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
                title={isPanelPinned ? t('panel.unpinPanel') : t('panel.pinPanel')}
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
                  <div className="text-sm font-bold text-orange-900">{t('panel.customTitle')}</div>
                  <div className="text-[9px] text-orange-600/70 truncate">
                    {t('panel.customSubtitle')}
                  </div>
                </div>
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
                <MousePointerClick className="w-3.5 h-3.5" /> {t('panel.pattern')}
              </button>
              <button
                onClick={() => setEditInputMode('manual')}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold flex justify-center items-center gap-1.5 transition-all ${
                  editInputMode === 'manual'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Braces className="w-3.5 h-3.5" /> {t('panel.manual')}
              </button>
            </div>

            <button
              onClick={onOpenImageImport}
              className="w-full py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-orange-200"
            >
              <ImagePlus className="w-4 h-4" /> {t('panel.fromImage')}
            </button>

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
                    <MousePointerClick className="w-3.5 h-3.5" /> {t('panel.rotate')}
                  </button>
                  <button
                    onClick={() => setInteractionMode('paint')}
                    className={`flex-1 py-1.5 text-[11px] rounded-lg border font-medium flex items-center justify-center gap-1 transition-all ${
                      interactionMode === 'paint'
                        ? 'bg-white text-orange-700 border-orange-300 shadow-sm'
                        : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <PaintRoller className="w-3.5 h-3.5" /> {t('panel.place')}
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
                    <Square fill="currentColor" className="w-3.5 h-3.5" /> {t('panel.fill')}
                  </button>
                  <button
                    onClick={() => setCurrentBrush(2)}
                    className={`flex-1 py-1.5 rounded-lg flex justify-center items-center gap-1 text-[11px] font-medium transition-all ${
                      currentBrush === 2
                        ? 'bg-red-50 text-red-500 shadow-sm border border-red-200'
                        : 'bg-white/60 text-slate-400 hover:bg-white border border-slate-200'
                    }`}
                  >
                    <XSquare className="w-3.5 h-3.5" /> {t('panel.cross')}
                  </button>
                  <button
                    onClick={() => setCurrentBrush(0)}
                    className={`flex-1 py-1.5 rounded-lg flex justify-center items-center gap-1 text-[11px] font-medium transition-all ${
                      currentBrush === 0
                        ? 'bg-white text-slate-700 shadow-sm border border-slate-200'
                        : 'bg-white/60 text-slate-400 hover:bg-white border border-slate-200'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" /> {t('panel.erase')}
                  </button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-orange-800/80 leading-relaxed">
              {editInputMode === 'pattern'
                ? t('panel.patternHint')
                : t('panel.manualHint')}
            </p>
          </div>
        )}

        {mode === 'play' && (
          <SidePanelUserArea
            user={user}
            userProgress={userProgress}
            onLogout={onLogout}
            onOpenAuth={onOpenAuth}
            onOpenBrowse={onOpenBrowse}
          />
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
          <div
            data-testid="alert-msg"
            className="p-2 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200 font-medium text-center shrink-0"
          >
            {alertMsg}
          </div>
        )}

        {/* === 游戏控制 + 视图设置（game tab） === */}
        <div className={tabCls('game')}>
          <SidePanelGameControls
            mode={mode}
            deductionLevel={deductionLevel}
            onStartDeduction={onStartDeduction}
            onApplyDeduction={onApplyDeduction}
            onCancelDeduction={onCancelDeduction}
            onValidate={onValidate}
            onRestore={onRestore}
            lastCorrectSnapshot={lastCorrectSnapshot}
            onProvideHint={onProvideHint}
            interactionMode={interactionMode}
            setInteractionMode={setInteractionMode}
            currentBrush={currentBrush}
            setCurrentBrush={setCurrentBrush}
            gameSettings={gameSettings}
            setGameSettings={setGameSettings}
          />
          <SidePanelViewSettings
            mode={mode}
            rows={rows}
            cols={cols}
            onInitBoard={onInitBoard}
            onGenerateRandom={onGenerateRandom}
            onClearClues={onClearClues}
            cellSize={cellSize}
            setCellSize={setCellSize}
            onFitToWidth={onFitToWidth}
            onModeChange={onModeChange}
          />
        </div>

        {/* === 导入导出（import tab） === */}
        <div className={tabCls('import')}>
          <SidePanelImportExport
            importData={importData}
            setImportData={setImportData}
            onImport={onImport}
            isImporting={isImporting}
            localImportData={localImportData}
            setLocalImportData={setLocalImportData}
            onLocalImport={onLocalImport}
            onImportFile={onImportFile}
            exportFilename={exportFilename}
            setExportFilename={setExportFilename}
            exportRemark={exportRemark}
            setExportRemark={setExportRemark}
            onExportCode={onExportCode}
            onExportJSON={onExportJSON}
            onExportImage={onExportImage}
          />

          <div className="mt-auto pt-2 flex flex-col gap-2 shrink-0">
            <button
              onClick={onClearBoard}
              className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Eraser className="w-4 h-4" />{' '}
              {mode === 'edit' ? t('panel.clearBoardPattern') : t('panel.clearBoard')}
            </button>
            {mode === 'edit' ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={onCancelEditing}
                  className="py-2.5 bg-white hover:bg-slate-100 text-slate-600 font-bold rounded-lg border border-slate-200 flex items-center justify-center gap-2 transition-colors text-sm"
                  title={t('panel.cancelEditTitle')}
                >
                  <X className="w-4 h-4" /> {t('panel.cancelEdit')}
                </button>
                <button
                  onClick={onFinishEditing}
                  className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Check className="w-4 h-4" /> {t('panel.finishPlay')}
                </button>
              </div>
            ) : (
              <button
                data-testid="autosolve-btn"
                onClick={onAutoSolve}
                className="w-full py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Check className="w-4 h-4" /> {t('panel.autoSolve')}
              </button>
            )}
            <div className="flex items-center gap-1 pt-1.5 mt-1 border-t border-slate-100">
              {footerActions.map(({ key, Icon, title, onClick }) => (
                <button
                  key={key}
                  onClick={onClick}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title={title}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 移动端底部导航 */}
      <div className="md:hidden flex border-t border-slate-200 bg-white shrink-0 sticky bottom-0">
        {[
          { key: 'game', label: t('panel.tabs.game'), Icon: MousePointerClick },
          { key: 'import', label: t('panel.tabs.import'), Icon: FileSymlink },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            data-testid={`nav-${key}`}
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
        title={t('panel.dragPanel')}
      />
    </div>
    </>
  );
};

export default SidePanel;
