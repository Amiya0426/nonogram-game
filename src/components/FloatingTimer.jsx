import { useEffect, useRef, useState } from 'react';
import { Clock, Pause, Play, Film } from 'lucide-react';

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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={pos ? { left: pos.left, top: pos.top } : { top: 12, right: 12 }}
        className="absolute z-20 pointer-events-auto flex items-center gap-2 bg-white border border-slate-200 rounded-xl shadow-md px-3 py-2 cursor-move select-none"
        title="拖动可移动"
      >
        <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="font-mono text-base font-bold text-slate-800 tabular-nums">
          {formatTime(timerSeconds)}
        </span>
        <button
          onClick={togglePauseTimer}
          className={`p-1.5 rounded-lg border transition-colors ${
            timerRunning
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
          }`}
          title={timerRunning ? '暂停计时' : '继续计时'}
        >
          {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
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
      </div>
    </div>
  );
};

export default FloatingTimer;
