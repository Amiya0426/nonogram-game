import { useCallback, useState } from 'react';
import { DEFAULT_THEME } from '../constants.js';
import { parseClue, getAutoMarked } from '../logic/clues.js';
import {
  downloadJSON,
  buildExportData,
  buildExportCode,
  decodeExportCode,
  copyToClipboard,
  exportBoardAsImage,
  buildPuzzleExportName,
} from '../logic/exporter.js';
import { extractPuzzleFromHtml, normalizePuzzleData } from '../logic/importer.js';
import { api } from '../api.js';
import { translate as tr } from '../i18n/index.js';

/** 导入/导出：存档代码、JSON、图片、网页解析 */
export default function useImportExport({
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
  onApplyPuzzle,
  onSubmitToLibrary,
  onInitBoard,
}) {
  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [localImportData, setLocalImportData] = useState('');
  const [exportFilename, setExportFilename] = useState('');
  const [exportRemark, setExportRemark] = useState('');

  const handleExportCode = useCallback(async () => {
    const finalFilename =
      exportFilename.trim() || buildPuzzleExportName({ rows, cols, progressPercent });
    const code = await buildExportCode(
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
      setAlertMsg(tr('msg.codeCopied', { name: finalFilename }));
    } catch {
      setAlertMsg(tr('msg.codeManualCopy'));
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
    setAlertMsg,
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
    setAlertMsg(tr('msg.jsonDownloaded', { name: finalFilename }));
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
    setAlertMsg,
  ]);

  const exportAsImage = useCallback(
    async (format = 'png', options = {}) => {
      try {
        setAlertMsg(tr('msg.imageGenerating'));
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
        const scaleText =
          options.scale && options.scale > 1 ? tr('msg.hdScale', { scale: options.scale }) : '';
        setAlertMsg(
          tr('msg.imageDone', { format: format.toUpperCase(), scale: scaleText }),
        );
      } catch (err) {
        setAlertMsg(tr('msg.imageFailed', { msg: err.message }));
      }
    },
    [
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
      gameSettings,
      setAlertMsg,
    ],
  );

  /** 从存档代码导入（base64 → JSON → 应用到盘面） */
  const importFromCode = useCallback(
    async (code) => {
      const data = await decodeExportCode(code);
      onApplyPuzzle(data);
      onSubmitToLibrary(data);
    },
    [onApplyPuzzle, onSubmitToLibrary],
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
          setAlertMsg(tr('msg.clipboardEmpty'));
          return;
        }
        setLocalImportData(code);
      } catch {
        setAlertMsg(tr('msg.clipboardUnavailable'));
        return;
      }
    }
    try {
      await importFromCode(code);
      setLocalImportData('');
    } catch {
      setAlertMsg(tr('msg.codeImportFailed'));
    }
  }, [localImportData, importFromCode, setAlertMsg, setLocalImportData]);

  /** 文件导入：直接接收 File 对象（文件选择与拖拽共用） */
  const handleImportFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = normalizePuzzleData(JSON.parse(event.target.result));
          onApplyPuzzle(data);
          onSubmitToLibrary(data);
        } catch {
          setAlertMsg(tr('msg.fileImportFailed'));
        }
      };
      reader.readAsText(file);
    },
    [onApplyPuzzle, onSubmitToLibrary, setAlertMsg],
  );

  /** 网页源码 / URL 导入 */
  const handleImport = useCallback(async () => {
    const data = importData.trim();
    if (!data) return;
    setIsImporting(true);
    setHintInfo(null);
    setAlertMsg('');
    try {
      let html = null;
      if (data.startsWith('http://') || data.startsWith('https://')) {
        setAlertMsg(tr('msg.proxying'));
        // 生产环境由后端 /api/fetch-url 代理（CSP connect-src 保持 'self'）
        try {
          const r = await api.fetchUrl(data);
          html = r.html;
        } catch (e) {
          // 后端明确拒绝（如非法/受限地址）时直接报错；仅在后端不可达时回退第三方代理
          if (e.status) throw e;
        }
        if (!html) {
          const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(data)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(data)}`,
          ];
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
        }
      } else {
        html = data;
      }
      if (!html || !html.includes('<html')) {
        throw new Error('import.proxyFailed');
      }
      const puzzle = extractPuzzleFromHtml(html);
      onInitBoard(puzzle.rows, puzzle.cols, puzzle.rowClues, puzzle.colClues);
      const importedData = {
        rows: puzzle.rows,
        cols: puzzle.cols,
        rowCluesStr: puzzle.rowClues.map((arr) => arr.join('.')),
        colCluesStr: puzzle.colClues.map((arr) => arr.join('.')),
        grid: null,
      };
      onSubmitToLibrary(importedData);
      setAlertMsg(tr('msg.extracted', { rows: puzzle.rows, cols: puzzle.cols }));
      setImportData('');
      setMode('play');
    } catch (e) {
      setAlertMsg(tr('msg.extractFailed', { msg: tr(e.message) }));
    } finally {
      setIsImporting(false);
    }
  }, [
    importData,
    setIsImporting,
    setHintInfo,
    setAlertMsg,
    setImportData,
    setMode,
    onInitBoard,
    onSubmitToLibrary,
  ]);

  return {
    importData,
    isImporting,
    localImportData,
    exportFilename,
    exportRemark,
    setImportData,
    setIsImporting,
    setLocalImportData,
    setExportFilename,
    setExportRemark,
    handleExportCode,
    handleExportJSON,
    exportAsImage,
    handleLocalImportCode,
    handleImportFile,
    handleImport,
  };
}
