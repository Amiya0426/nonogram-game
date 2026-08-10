import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

/** 题库浏览悬浮窗：盖在主界面上方，分页浏览题库并显示完成状态 */
const PuzzleBrowser = ({
  open,
  onClose,
  browse,
  onLoadPuzzles,
  onOpenPuzzle,
  userProgress,
}) => {
  const [size, setSize] = useState('all');
  const totalPages = Math.max(1, Math.ceil((browse.total || 0) / (browse.perPage || 30)));

  // 首次打开时加载第一页
  useEffect(() => {
    if (open && !browse.loading && browse.items.length === 0 && browse.total === 0) {
      onLoadPuzzles(1, null, null);
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

  const changeSize = (v) => {
    setSize(v);
    const [rw, cl] = v === 'all' ? [null, null] : v.split('x').map(Number);
    onLoadPuzzles(1, rw, cl);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[82vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="min-w-0">
            <div className="text-base font-bold text-slate-800">题库浏览</div>
            <div className="text-[10px] text-slate-400">共 {browse.total} 题 · 点击卡片载入游玩</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={size}
              onChange={(e) => changeSize(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 bg-white text-slate-600 px-2 py-1.5 outline-none focus:border-indigo-400"
            >
              <option value="all">全部尺寸</option>
              <option value="5x5">5×5</option>
              <option value="10x10">10×10</option>
              <option value="15x15">15×15</option>
              <option value="20x20">20×20</option>
              <option value="25x25">25×25</option>
              <option value="30x30">30×30</option>
            </select>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-slate-100 bg-white">
          <button
            onClick={() => onLoadPuzzles(browse.page - 1, browse.rows, browse.cols)}
            disabled={browse.page <= 1 || browse.loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> 上一页
          </button>
          <span className="text-xs text-slate-500">
            第 {browse.page} / {totalPages} 页
          </span>
          <button
            onClick={() => onLoadPuzzles(browse.page + 1, browse.rows, browse.cols)}
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
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
            >
              {browse.items.map((item) => {
                const done =
                  item.completed ||
                  userProgress.some((p) => String(p.id) === String(item.id));
                return (
                  <button
                    key={item.id}
                    onClick={() => onOpenPuzzle(item)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors ${
                      done
                        ? 'border-emerald-300 bg-emerald-50/60'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300'
                    }`}
                    title={`${item.cols}×${item.rows} · ${item.source || ''}${
                      item.contributor ? ` · 贡献者 ${item.contributor}` : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-1">
                      <span className="text-sm font-bold text-slate-800">
                        {item.cols}×{item.rows}
                      </span>
                      {done && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                          <Check className="w-3 h-3" /> 已完成
                        </span>
                      )}
                    </div>
                    <span className="w-full text-[10px] text-slate-400 truncate">
                      {item.source}
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
