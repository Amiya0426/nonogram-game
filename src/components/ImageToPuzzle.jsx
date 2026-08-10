import { useEffect, useRef, useState } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

const SIZE_PRESETS = [
  { v: '10x10', label: '10×10' },
  { v: '15x15', label: '15×15' },
  { v: '20x20', label: '20×20' },
  { v: '25x25', label: '25×25' },
  { v: '30x30', label: '30×30' },
  { v: '40x40', label: '40×40' },
  { v: '50x50', label: '50×50' },
];
const MAX = 80;

/** Otsu 自动阈值：最大化类间方差，自动找出“最优”黑白分界 */
const otsuThreshold = (hist, total) => {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let best = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      best = t;
    }
  }
  return best;
};

/** 图片转数织：上传图片（可彩色）→ 缩放 → 灰度 → 阈值二值化 → 生成 0/1 图案 */
const ImageToPuzzle = ({ open, onClose, onApply }) => {
  const { t } = useI18n();
  const [preset, setPreset] = useState('20x20');
  const [rowsInput, setRowsInput] = useState('20');
  const [colsInput, setColsInput] = useState('20');
  const [autoTh, setAutoTh] = useState(true);
  const [threshold, setThreshold] = useState(128);
  const [invert, setInvert] = useState(false);
  const [img, setImg] = useState(null);
  const [result, setResult] = useState(null); // { grid, rows, cols, usedThreshold }
  const fileRef = useRef(null);
  const previewRef = useRef(null);

  const clamp = (v) => Math.max(1, Math.min(MAX, parseInt(v, 10) || 1));

  const loadFile = (file) => {
    if (!file || !String(file.type || '').startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => setImg(image);
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const changePreset = (v) => {
    setPreset(v);
    const [rw, cl] = v.split('x').map(Number);
    setRowsInput(String(rw));
    setColsInput(String(cl));
  };

  // 图像处理：图片/尺寸/阈值/反色任一变化时重新生成预览
  useEffect(() => {
    if (!img) return;
    const timer = setTimeout(() => {
      const r = clamp(rowsInput);
      const c = clamp(colsInput);
      const canvas = document.createElement('canvas');
      canvas.width = c;
      canvas.height = r;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, c, r);
      const data = ctx.getImageData(0, 0, c, r).data;
      const lum = new Uint8Array(r * c);
      const hist = new Uint32Array(256);
      for (let i = 0; i < r * c; i++) {
        const v = Math.round(
          0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2],
        );
        lum[i] = v;
        hist[v]++;
      }
      const usedThreshold = autoTh ? otsuThreshold(hist, r * c) : threshold;
      const grid = [];
      for (let y = 0; y < r; y++) {
        const row = new Array(c).fill(0);
        for (let x = 0; x < c; x++) {
          const black = lum[y * c + x] < usedThreshold;
          row[x] = black !== invert ? 1 : 0;
        }
        grid.push(row);
      }
      setResult({ grid, rows: r, cols: c, usedThreshold });

      if (previewRef.current) {
        const pv = previewRef.current;
        const cell = 16;
        pv.width = c * cell;
        pv.height = r * cell;
        const pctx = pv.getContext('2d');
        pctx.fillStyle = '#ffffff';
        pctx.fillRect(0, 0, pv.width, pv.height);
        pctx.fillStyle = '#1e293b';
        for (let y = 0; y < r; y++) {
          for (let x = 0; x < c; x++) {
            if (grid[y][x]) pctx.fillRect(x * cell, y * cell, cell, cell);
          }
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [img, rowsInput, colsInput, autoTh, threshold, invert]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div>
            <div className="text-base font-bold text-slate-800">{t('image.title')}</div>
            <div className="text-[10px] text-slate-400">{t('image.subtitle')}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"
            title={t('image.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4 overflow-y-auto">
          {/* 上传 */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-pink-400 hover:bg-pink-50/40 text-slate-500 hover:text-pink-600 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors"
          >
            <ImagePlus className="w-6 h-6" />
            {t('image.upload')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              loadFile(e.target.files?.[0]);
              e.target.value = null;
            }}
          />

          {/* 预览 */}
          <div className="flex items-center justify-center min-h-[80px] bg-slate-50 rounded-xl border border-slate-100 p-2">
            {result ? (
              <canvas ref={previewRef} className="max-h-[220px] rounded border border-slate-200" />
            ) : (
              <span className="text-[11px] text-slate-400">{t('image.previewEmpty')}</span>
            )}
          </div>

          {/* 尺寸 */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={preset}
              onChange={(e) => changePreset(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 bg-white text-slate-600 px-2 py-1.5 outline-none"
            >
              {SIZE_PRESETS.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max={MAX}
                value={rowsInput}
                onChange={(e) => setRowsInput(e.target.value)}
                placeholder={t('browse.rowsPh')}
                className="w-14 px-1.5 py-1 text-xs rounded-lg border border-slate-200 outline-none focus:border-pink-400"
              />
              <span className="text-xs text-slate-400">×</span>
              <input
                type="number"
                min="1"
                max={MAX}
                value={colsInput}
                onChange={(e) => setColsInput(e.target.value)}
                placeholder={t('browse.colsPh')}
                className="w-14 px-1.5 py-1 text-xs rounded-lg border border-slate-200 outline-none focus:border-pink-400"
              />
            </div>
          </div>

          {/* 阈值 / 反色 */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={autoTh}
                onChange={(e) => setAutoTh(e.target.checked)}
                className="accent-pink-600 w-3 h-3"
              />
              {t('image.autoThreshold')}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-12">
                {t('image.thresholdLabel', { n: result?.usedThreshold ?? threshold })}
              </span>
              <input
                type="range"
                min="0"
                max="255"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                disabled={autoTh}
                className="flex-1 accent-pink-500 disabled:opacity-40"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={invert}
                onChange={(e) => setInvert(e.target.checked)}
                className="accent-pink-600 w-3 h-3"
              />
              {t('image.invert')}
            </label>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200"
          >
            {t('image.cancel')}
          </button>
          <button
            onClick={() => result && onApply(result.grid, result.rows, result.cols)}
            disabled={!result}
            className="flex-1 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold disabled:bg-pink-300"
          >
            {t('image.generate')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageToPuzzle;
