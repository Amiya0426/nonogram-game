import { useCallback, useEffect, useState } from 'react';

/** 单盘计时：首击启动、可暂停、完成/切换模式时停止 */
export default function useTimer({ initialSeconds = 0, initialRunning = false } = {}) {
  const [timerSeconds, setTimerSeconds] = useState(initialSeconds);
  const [timerRunning, setTimerRunning] = useState(initialRunning);

  useEffect(() => {
    if (!timerRunning) return;
    const iv = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [timerRunning]);

  /** 新盘重置计时：清零但不启动，等待玩家第一次点击格子 */
  const resetTimer = useCallback(() => {
    setTimerSeconds(0);
    setTimerRunning(false);
  }, []);

  const togglePauseTimer = useCallback(() => {
    setTimerRunning((r) => !r);
  }, []);

  /** 玩家首次点击格子时启动：仅当归零且未运行时生效 */
  const startIfNotRunning = useCallback(() => {
    setTimerRunning((r) => (r ? r : timerSeconds === 0));
  }, [timerSeconds]);

  const stopTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  return {
    timerSeconds,
    timerRunning,
    setTimerSeconds,
    resetTimer,
    togglePauseTimer,
    startIfNotRunning,
    stopTimer,
  };
}
