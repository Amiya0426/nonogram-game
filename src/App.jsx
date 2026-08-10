import { useState } from 'react';
import { Menu, Dices, Check, PencilLine } from 'lucide-react';
import useGameState from './hooks/useGameState.js';
import Board from './components/Board.jsx';
import SidePanel from './components/SidePanel.jsx';
import PuzzleBrowser from './components/PuzzleBrowser.jsx';
import FloatingTimer from './components/FloatingTimer.jsx';
import ImageToPuzzle from './components/ImageToPuzzle.jsx';
import MeasureTooltip from './components/MeasureTooltip.jsx';
import './App.css';

export default function NonogramApp() {
  const g = useGameState();
  const [browseOpen, setBrowseOpen] = useState(false);
  const [imageImportOpen, setImageImportOpen] = useState(false);

  const showTooltip = g.showMeasure || g.showHoverRow || g.showHoverCol;
  const hoverOnlyRow = g.showHoverRow && !g.showHoverCol;
  const hoverOnlyCol = !g.showHoverRow && g.showHoverCol;

  return (
    <div
      className="h-screen w-full flex flex-col md:flex-row font-sans overflow-hidden text-slate-800 select-none relative bg-slate-50"
      onMouseLeave={g.handleGlobalLeave}
    >
      {/* 测量与悬浮线索提示框 */}
      <MeasureTooltip
        showTooltip={showTooltip}
        showMeasure={g.showMeasure}
        measureStart={g.measureStart}
        hoverPos={g.hoverPos}
        showHoverRow={g.showHoverRow}
        showHoverCol={g.showHoverCol}
        hoverOnlyRow={hoverOnlyRow}
        hoverOnlyCol={hoverOnlyCol}
        row={g.hoverTooltipData.row}
        col={g.hoverTooltipData.col}
        markedRowClues={g.markedRowClues}
        markedColClues={g.markedColClues}
      />

      {/* 移动端顶栏 */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-20 shadow-sm shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-900">
          <Dices className="w-6 h-6 text-indigo-500" /> Nonogram
        </h1>
        <div className="flex items-center gap-2">
          {g.mode === 'edit' ? (
            <button
              onClick={g.finishEditing}
              className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" /> 完成
            </button>
          ) : (
            <button
              onClick={() => g.handleModeChange('edit')}
              className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-bold flex items-center gap-1.5 border border-orange-200"
            >
              <PencilLine className="w-4 h-4" /> 自定义
            </button>
          )}
          <button
            onClick={() => g.setShowLeftPanel(!g.showLeftPanel)}
            className="p-2 bg-slate-100 rounded-md"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 左侧控制面板 */}
      <SidePanel
        showLeftPanel={g.showLeftPanel}
        setShowLeftPanel={g.setShowLeftPanel}
        isPanelPinned={g.isPanelPinned}
        setIsPanelPinned={g.setIsPanelPinned}
        isPanelHovered={g.isPanelHovered}
        setIsPanelHovered={g.setIsPanelHovered}
        mode={g.mode}
        onModeChange={g.handleModeChange}
        editInputMode={g.editInputMode}
        setEditInputMode={g.setEditInputMode}
        onCancelEditing={g.cancelEditing}
        onFinishEditing={g.finishEditing}
        onOpenImageImport={() => setImageImportOpen(true)}
        user={g.user}
        authBusy={g.authBusy}
        onLogin={g.login}
        onRegister={g.register}
        onLogout={g.logout}
        hintInfo={g.hintInfo}
        alertMsg={g.alertMsg}
        deductionLevel={g.deductionLevel}
        onStartDeduction={g.startDeduction}
        onApplyDeduction={g.applyDeduction}
        onCancelDeduction={g.cancelDeduction}
        onValidate={g.validateGrid}
        onRestore={g.restoreLastCorrect}
        lastCorrectSnapshot={g.lastCorrectSnapshot}
        onProvideHint={g.provideHint}
        interactionMode={g.interactionMode}
        setInteractionMode={g.setInteractionMode}
        currentBrush={g.currentBrush}
        setCurrentBrush={g.setCurrentBrush}
        gameSettings={g.gameSettings}
        setGameSettings={g.setGameSettings}
        rows={g.rows}
        cols={g.cols}
        onInitBoard={g.initBoard}
        onGenerateRandom={g.generateRandom}
        onClearClues={g.clearClues}
        cellSize={g.cellSize}
        setCellSize={g.setCellSize}
        onFitToWidth={g.fitToWidth}
        onOpenBrowse={() => setBrowseOpen(true)}
        onExportCode={g.handleExportCode}
        onExportJSON={g.handleExportJSON}
        onExportImage={g.exportAsImage}
        exportFilename={g.exportFilename}
        setExportFilename={g.setExportFilename}
        exportRemark={g.exportRemark}
        setExportRemark={g.setExportRemark}
        importData={g.importData}
        setImportData={g.setImportData}
        onImport={g.handleImport}
        isImporting={g.isImporting}
        localImportData={g.localImportData}
        setLocalImportData={g.setLocalImportData}
        onLocalImport={g.handleLocalImportCode}
        onImportFile={g.handleImportFile}
        onClearBoard={g.clearBoard}
        onAutoSolve={g.autoSolve}
        isSolvedStatus={g.isSolvedStatus}
        userProgress={g.userProgress}
      />

      {/* 题库浏览悬浮窗 */}
      <PuzzleBrowser
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        browse={g.browse}
        onLoadPuzzles={g.loadPuzzles}
        onOpenPuzzle={(item) => {
          g.openPuzzleFromBrowse(item);
          setBrowseOpen(false);
        }}
        userProgress={g.userProgress}
        user={g.user}
        onRenamePuzzle={g.renamePuzzle}
      />

      {/* 图片转题目弹窗 */}
      <ImageToPuzzle
        open={imageImportOpen}
        onClose={() => setImageImportOpen(false)}
        onApply={(grid, rows, cols) => {
          g.applyPatternImage(grid, rows, cols);
          setImageImportOpen(false);
        }}
      />

      {/* 棋盘区域 */}
      <div
        className="flex-1 relative bg-slate-200/50 flex flex-col h-[calc(100vh-65px)] md:h-screen transition-all"
        onMouseLeave={g.handleGlobalLeave}
      >
        {/* 计时 + 复盘 GIF 悬浮窗（仅游玩模式） */}
        {g.mode === 'play' && (
          <FloatingTimer
            timerSeconds={g.timerSeconds}
            timerRunning={g.timerRunning}
            togglePauseTimer={g.togglePauseTimer}
            isSolvedStatus={g.isSolvedStatus}
            generateReplayGif={g.generateReplayGif}
            isGeneratingGif={g.isGeneratingGif}
          />
        )}

        {g.isSolvedStatus && g.mode === 'play' && (
          <div className="absolute bottom-6 left-6 z-30 pointer-events-none">
            <div className="bg-emerald-500 text-white px-5 py-3 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(16,185,129,0.3)] flex items-center gap-2 animate-bounce border-2 border-white">
              <Check className="w-6 h-6" /> 解谜成功！
            </div>
          </div>
        )}

        <Board
          grid={g.grid}
          rows={g.rows}
          cols={g.cols}
          cellSize={g.cellSize}
          mode={g.mode}
          editInputMode={g.editInputMode}
          deductionLevel={g.deductionLevel}
          rowCluesStr={g.rowCluesStr}
          colCluesStr={g.colCluesStr}
          lineAnalysis={g.lineAnalysis}
          derivedClues={g.derivedClues}
          hoverPos={g.hoverPos}
          measureStart={g.measureStart}
          hintInfo={g.hintInfo}
          gameSettings={g.gameSettings}
          clueTextSize={g.clueTextSize}
          onCellMouseDown={g.handleCellMouseDown}
          onCellMouseEnter={g.handleCellMouseEnter}
          startTouchPaint={g.startTouchPaint}
          continueTouchPaint={g.continueTouchPaint}
          endTouchPaint={g.endTouchPaint}
          onToggleMarkedRow={g.toggleMarkedRow}
          onToggleMarkedCol={g.toggleMarkedCol}
          onEditRowClue={g.editRowClue}
          onEditColClue={g.editColClue}
          onMouseLeave={g.handleGlobalLeave}
          onZoom={g.zoomBoard}
        />
      </div>
    </div>
  );
}
