import { useCallback, useEffect, useRef, useState } from 'react';

/** hover 节流、测量工具与全局键盘/鼠标事件 */
export default function useHoverMeasure({ onLeave }) {
  const [hoverPos, setHoverPos] = useState({ r: -1, c: -1 });
  const hoverPosRef = useRef({ r: -1, c: -1 });
  const measureStartRef = useRef(null);
  const [measureStart, setMeasureStart] = useState(null);

  // hover 的 rAF 节流：避免鼠标快速扫过时每格触发一次重渲染
  const hoverRafRef = useRef(0);
  const pendingHoverRef = useRef(null);

  useEffect(() => {
    hoverPosRef.current = hoverPos;
  }, [hoverPos]);

  const scheduleHover = useCallback((r, c) => {
    pendingHoverRef.current = { r, c };
    if (hoverRafRef.current) return;
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = 0;
      const p = pendingHoverRef.current;
      pendingHoverRef.current = null;
      if (p) setHoverPos(p);
    });
  }, []);

  // 全局键盘 / 鼠标事件（测量工具）
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control' && !measureStartRef.current && hoverPosRef.current.r !== -1) {
        measureStartRef.current = hoverPosRef.current;
        setMeasureStart(hoverPosRef.current);
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Control') {
        measureStartRef.current = null;
        setMeasureStart(null);
      }
    };
    const handleMouseMove = (e) => {
      const tooltip = document.getElementById('measure-tooltip-container');
      if (tooltip) tooltip.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`;
    };
    const handleBlur = () => {
      measureStartRef.current = null;
      setMeasureStart(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleGlobalLeave = useCallback(() => {
    setHoverPos({ r: -1, c: -1 });
    measureStartRef.current = null;
    setMeasureStart(null);
    onLeave?.();
  }, [onLeave]);

  return {
    hoverPos,
    setHoverPos,
    measureStart,
    setMeasureStart,
    scheduleHover,
    handleGlobalLeave,
  };
}
