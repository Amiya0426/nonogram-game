import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const SIZE_PRESETS = [
  { v: 'all', label: '全部尺寸' },
  { v: '5x5', label: '5×5' },
  { v: '10x10', label: '10×10' },
  { v: '15x15', label: '15×15' },
  { v: '20x20', label: '20×20' },
  { v: '25x25', label: '25×25' },
  { v: '30x30', label: '30×30' },
];

/** 题目显示名：来源即名称，用户导入题显示“用户导入” */
const displayName = (item) =>
  item.source && item.source !== 'user-import'
    ? item.source
    : `用户导入 ${item.cols}×${item.rows}`;

/** 题库浏览悬浮窗：盖在主界面上方，分页浏览题库并显示完成状态 */
const PuzzleBrowser = ({
  open,
  onClose,
  browse,
  onLoadPuzzles,
  onOpenPuzzle,
  userProgress,
}) => {
  const [preset, setPreset] = useState('all');
  const [rowsInput, setRowsInput] = useState('');
  const [colsInput, setColsInput] = useState('');
  const [mine, setMine] = useState(false);
  const [done, setDone] = useState(false);
  const totalPages = Math.max(1, Math.ceil((browse.total || 0) / (browse.perPage || 30)));

  // 首次打开时加载第一页
  useEffect(() => {
    if (open && !browse.loading && browse.items.length === 0 && browse.total === 0) {
      onLoadPuzzles(1, null, null, false, false);
    }
  }, [open, browse.loading, browse.items.length, browse.total, onLoadPuzzles]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const clamp = (v) => Math.max(1, Math.min(80, parseInt(v, 10) || 0));
  const load = (page) => onLoadPuzzles(page, browse.rows, browse.cols, mine, done);

  const changePreset = (v) => {
    setPreset(v);
    if (v === 'all') {
      setRowsInput('');
      setColsInput('');
      onLoadPuzzles(1, null, null, mine, done);
    } else {
      const [rw, cl] = v.split('x').map(Number);
      setRowsInput(String(rw));
      setColsInput(String(cl));
      onLoadPuzzles(1, rw, cl, mine, done);
    }
  };

  const applyCustom = () => {
    const rw = clamp(rowsInput);
    const cl = clamp(colsInput);
    if (!rw || !cl) return;
    setPreset('custom');
    onLoadPuzzles(1, rw, cl, mine, done);
  };

  const toggleMine = () => {
    const n = !mine;
    setMine(n);
    onLoadPuzzles(1, browse.rows, browse.cols, n, done);
  };

  const toggleDone = () => {
    const n = !done;
    setDone(n);
    onLoadPuzzles(1, browse.rows, browse.cols, mine, n);
  };

  const filterText = [
    browse.rows && browse.cols ? `${browse.cols}×${browse.rows}` : '全部尺寸',
    mine ? '我导入的' : '',
    done ? '已完成' : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[86vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="min-w-0">
            <div className="text-base font-bold text-slate-800">题库浏览</div>
            <div className="text-[10px] text-slate-400 truncate">
              共 {browse.total} 题 · 当前：{filterText}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 shrink-0"
            title="关闭 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-slate-100 bg-white">
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
            {preset === 'custom' && <option value="custom">自定义</option>}
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="80"
              value={rowsInput}
              onChange={(e) => setRowsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyCustom();
              }}
              placeholder="行"
              className="w-14 px-1.5 py-1 text-xs rounded-lg border border-slate-200 outline-none focus:border-indigo-400"
            />
            <span className="text-xs text-slate-400">×</span>
            <input
              type="number"
              min="1"
              max="80"
              value={colsInput}
              onChange={(e) => setColsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyCustom();
              }}
              placeholder="列"
              className="w-14 px-1.5 py-1 text-xs rounded-lg border border-slate-200 outline-none focus:border-indigo-400"
            />
            <button
              onClick={applyCustom}
              className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200"
            >
              筛选
            </button>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={toggleMine}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                mine
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              我导入的
            </button>
            <button
              onClick={toggleDone}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                done
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              已完成
            </button>
          </div>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-slate-100 bg-white">
          <button
            onClick={() => load(browse.page - 1)}
            disabled={browse.page <= 1 || browse.loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> 上一页
          </button>
          <span className="text-xs text-slate-500">
            第 {browse.page} / {totalPages} 页
          </span>
          <button
            onClick={() => load(browse.page + 1)}
            disabled={browse.page >= totalPages || browse.loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40"
          >
            下一页 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {browse.loading ? (
            <p className="text-center text-sm text-slate-400 py-10">加载中...</p>
          ) : browse.items.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-10">暂无题目</p>
          ) : (
            <div
              className="grid gap-2.5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
            >
              {browse.items.map((item) => {
                const doneFlag =
                  item.completed ||
                  userProgress.some((p) => String(p.id) === String(item.id));
                return (
                  <button
                    key={item.id}
                    onClick={() => onOpenPuzzle(item)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors ${
                      doneFlag
                        ? 'border-emerald-300 bg-emerald-50/60'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300'
                    }`}
                    title={`${displayName(item)} · ${item.cols}×${item.rows}${
                      item.contributor ? ` · ${item.contributor}` : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-1">
                      <span className="text-sm font-bold text-slate-800 truncate">
                        {displayName(item)}
                      </span>
                      {doneFlag && (
                        <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                          <Check className="w-3 h-3" /> 已完成
                        </span>
                      )}
                    </div>
                    <span className="w-full text-[10px] text-slate-400 truncate">
                      {item.cols}×{item.rows}
                      {item.contributor ? ` · ${item.contributor}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PuzzleBrowser;
