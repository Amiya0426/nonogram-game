import { useState } from 'react';
import {
  FileSymlink,
  Download,
  Upload,
  Globe,
  Wand2,
  UploadCloud,
  ClipboardPaste,
  FileUp,
  FileJson,
  ClipboardCopy,
  Image as ImageIcon,
} from 'lucide-react';
import Accordion from './Accordion.jsx';
import FileDropZone from './FileDropZone.jsx';
import { useI18n } from '../i18n/index.js';

/** 导入导出区：网页解析 / 存档恢复 / 代码与图片导出 */
const SidePanelImportExport = ({
  importData,
  setImportData,
  onImport,
  isImporting,
  localImportData,
  setLocalImportData,
  onLocalImport,
  onImportFile,
  exportFilename,
  setExportFilename,
  exportRemark,
  setExportRemark,
  onExportCode,
  onExportJSON,
  onExportImage,
}) => {
  const { t } = useI18n();
  const [ioTab, setIoTab] = useState('import');
  const [imgScale, setImgScale] = useState('2');
  const [imgJpegQuality, setImgJpegQuality] = useState('0.9');
  const [imgDpi, setImgDpi] = useState('96');

  return (
    <Accordion title={t('panel.importExportTitle')} icon={FileSymlink} defaultOpen={false}>
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
          <Download className="w-3.5 h-3.5" /> {t('panel.importTab')}
        </button>
        <button
          onClick={() => setIoTab('export')}
          className={`flex-1 py-1.5 rounded-md text-xs font-bold flex justify-center items-center gap-1.5 transition-all ${
            ioTab === 'export'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Upload className="w-3.5 h-3.5" /> {t('panel.exportTab')}
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
                <div className="text-xs font-bold text-slate-700">{t('panel.webParseTitle')}</div>
                <div className="text-[9px] text-slate-400 truncate">{t('panel.webParseHint')}</div>
              </div>
            </div>
            <textarea
              rows={2}
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={t('panel.webParsePlaceholder')}
              className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-indigo-500 font-mono bg-white"
            />
            <button
              onClick={onImport}
              disabled={isImporting || !importData.trim()}
              className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 shadow-sm"
            >
              <Wand2 className="w-3.5 h-3.5" /> {t('panel.extract')}
            </button>
          </div>

          {/* 存档恢复 */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <UploadCloud className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-700">{t('panel.restoreTitle')}</div>
                <div className="text-[9px] text-slate-400 truncate">{t('panel.restoreHint')}</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={localImportData}
                onChange={(e) => setLocalImportData(e.target.value)}
                placeholder={t('panel.codePlaceholder')}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-emerald-500 font-mono bg-white"
              />
              <button
                onClick={onLocalImport}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                title={t('panel.importCodeTitle')}
              >
                <ClipboardPaste className="w-3.5 h-3.5" /> {t('panel.import')}
              </button>
            </div>
            <FileDropZone
              onFiles={(files) => onImportFile(files[0])}
              icon={FileUp}
              buttonText={t('dropzone.choose')}
              hint={t('dropzone.jsonHint')}
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
                <div className="text-xs font-bold text-slate-700">{t('panel.exportTitle')}</div>
                <div className="text-[9px] text-slate-400 truncate">{t('panel.exportHint')}</div>
              </div>
            </div>
            <input
              type="text"
              value={exportFilename}
              onChange={(e) => setExportFilename(e.target.value)}
              placeholder={t('panel.filenamePlaceholder')}
              className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-emerald-500 bg-white"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={onExportCode}
                className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex justify-center items-center gap-1.5 transition-colors"
              >
                <ClipboardCopy className="w-3.5 h-3.5" /> {t('panel.copyCode')}
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
                <div className="text-xs font-bold text-slate-700">{t('panel.imageExportTitle')}</div>
                <div className="text-[9px] text-slate-400 truncate">{t('panel.imageExportHint')}</div>
              </div>
            </div>
            <input
              type="text"
              value={exportRemark}
              onChange={(e) => setExportRemark(e.target.value)}
              placeholder={t('panel.remarkPlaceholder')}
              className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 outline-none focus:border-blue-500 bg-white"
            />
            <div className="grid grid-cols-3 gap-1.5">
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-500">{t('panel.quality')}</span>
                <select
                  name="img-scale"
                  value={imgScale}
                  onChange={(e) => setImgScale(e.target.value)}
                  className="text-[10px] rounded border border-slate-200 bg-white text-slate-600 px-1 py-1 outline-none"
                >
                  <option value="1">{t('panel.std')} 1x</option>
                  <option value="2">{t('panel.hd')}</option>
                  <option value="3">{t('panel.ultra')}</option>
                  <option value="4">{t('panel.k4')}</option>
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-500">{t('panel.jpegQuality')}</span>
                <select
                  name="img-jpeg-quality"
                  value={imgJpegQuality}
                  onChange={(e) => setImgJpegQuality(e.target.value)}
                  className="text-[10px] rounded border border-slate-200 bg-white text-slate-600 px-1 py-1 outline-none"
                >
                  <option value="0.95">{t('panel.high')}</option>
                  <option value="0.9">{t('panel.std')}</option>
                  <option value="0.7">{t('panel.low')}</option>
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-500">{t('panel.dpiLabel')}</span>
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
              {t('panel.dpiHint')}
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
  );
};

export default SidePanelImportExport;
