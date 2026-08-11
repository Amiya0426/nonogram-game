import { useCallback, useEffect, useRef } from 'react';
import { api } from '../api.js';

/** 完成服务器题库题目时记录进度（黑格=1，叉/空=0 提交服务器校验） */
export default function useProgressReporting({
  isSolvedStatus,
  user,
  currentPuzzleId,
  grid,
  rows,
  cols,
  setUserProgress,
}) {
  const completedRef = useRef(null);

  useEffect(() => {
    if (isSolvedStatus && user && currentPuzzleId) {
      if (completedRef.current === currentPuzzleId) return;
      completedRef.current = currentPuzzleId;
      const binaryGrid = grid.map((row) =>
        row.map((v) => (typeof v === 'number' && v % 2 === 1 ? 1 : 0)),
      );
      api
        .completePuzzle(currentPuzzleId, binaryGrid)
        .then(() => {
          setUserProgress((prev) =>
            prev.some((p) => (typeof p === 'string' ? p : p.id) === currentPuzzleId)
              ? prev
              : [...prev, { id: currentPuzzleId, rows, cols }],
          );
        })
        .catch(() => {
          completedRef.current = null;
        });
    } else if (!isSolvedStatus) {
      completedRef.current = null;
    }
  }, [isSolvedStatus, user, currentPuzzleId, grid, rows, cols, setUserProgress]);

  /** 一键解题等场景标记该题已处理，避免触发服务器上报 */
  const markHandled = useCallback((id) => {
    completedRef.current = id;
  }, []);

  return { markHandled };
}
