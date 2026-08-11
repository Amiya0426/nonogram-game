import { useEffect, useRef, useState } from 'react';
import { Clock, Pause, Play, Film } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

const formatTime = (total) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

/** 游玩界面上的计时 + 复盘 GIF 悬浮窗，可拖动，默认在棋盘右上角 */
const FloatingTimer = ({
  timerSeconds,
  timerRunning,
  togglePauseTimer,
  isSolvedStatus,
  generateReplayGif,
  isGeneratingGif,
}) => {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem('nonogram_timer_pos') || 'null');
      return v && typeof v.left === 'number' ? v : null;
    } catch {
      return null;
    }
  });
  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  // 默认位置：棋盘右上角
  useEffect(() => {
    if (pos) return;
    const c = containerRef.current;
    const w = widgetRef.current;
    if (c && w) setPos({ left: c.clientWidth - w.offsetWidth - 12, top: 12 });
  }, [pos]);

  // 位置约束：widget 或棋盘容器尺寸变化（复盘按钮出现、固定/取消固定侧边栏、窗口缩放）时，
  // 自动把位置拉回棋盘可视区域内，防止被顶出屏幕
  useEffect(() => {
    const container = containerRef.current;
    const widget = widgetRef.current;
    if (!container || !widget) return undefined;
    const clamp = () => {
      setPos((p) => {
        if (!p) return p;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const ww = widget.offsetWidth;
        const wh = widget.offsetHeight;
        const left = Math.min(Math.max(0, p.left), Math.max(0, cw - ww - 12));
        const top = Math.min(Math.max(0, p.top), Math.max(0, ch - wh - 12));
        if (left === p.left && top === p.top) return p;
        return { left, top };
      });
    };
    const ro = new ResizeObserver(clamp);
    ro.observe(widget);
    ro.observe(container);
    window.addEventListener('resize', clamp);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', clamp);
    };
  }, []);

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return;
    const p = posRef.current;
    if (!p) return;
    dragRef.current = { dx: e.clientX - p.left, dy: e.clientY - p.top };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const c = containerRef.current;
    const w = widgetRef.current;
    if (!c || !w) return;
    const left = Math.min(
      Math.max(0, e.clientX - dragRef.current.dx),
      c.clientWidth - w.offsetWidth,
    );
    const top = Math.min(
      Math.max(0, e.clientY - dragRef.current.dy),
      c.clientHeight - w.offsetHeight,
    );
    setPos({ left, top });
  };
  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      localStorage.setItem('nonogram_timer_pos', JSON.stringify(posRef.current));
    } catch {
      // 忽略存储失败
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <div
        ref={widgetRef}
        data-testid="floating-timer"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={pos ? { left: pos.left, top: pos.top } : { top: 12, right: 12 }}
        className="absolute z-20 pointer-events-auto flex flex-col gap-1.5 bg-white border border-slate-200 rounded-xl shadow-md px-3 py-2 cursor-move select-none"
        title={t('timer.drag')}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
          <span
            data-testid="timer-text"
            className="font-mono text-base font-bold text-slate-800 tabular-nums"
          >
            {formatTime(timerSeconds)}
          </span>
          <button
            data-testid="timer-pause-btn"
            onClick={togglePauseTimer}
            className={`p-1.5 rounded-lg border transition-colors ${
              timerRunning
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}
            title={timerRunning ? t('timer.pause') : t('timer.resume')}
          >
            {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
        {isSolvedStatus && (
          <button
            data-testid="replay-gif-btn"
            onClick={generateReplayGif}
            disabled={isGeneratingGif}
            className="w-full px-2.5 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-violet-200 disabled:opacity-50 transition-colors"
            title={t('timer.gifTitle')}
          >
            <Film className="w-3.5 h-3.5" />{' '}
            {isGeneratingGif ? t('timer.generating') : t('timer.replayGif')}
          </button>
        )}
      </div>
    </div>
  );
};

export default FloatingTimer;
