import { useCallback } from 'react';
import { cloneGrid } from '../logic/board.js';
import { translate as tr } from '../i18n/index.js';

/** 推演模式：分级涂色、应用/取消 */
export default function useDeduction({
  deductionLevel,
  backupGrids,
  grid,
  mode,
  isSolvedStatus,
  setDeductionLevel,
  setBackupGrids,
  setGrid,
  setAlertMsg,
  recordMove,
}) {
  const startDeduction = useCallback(() => {
    if (deductionLevel < 3) {
      setBackupGrids((prev) => [...prev, cloneGrid(grid)]);
      setDeductionLevel((prev) => prev + 1);
      setAlertMsg(tr('msg.deductionEnter', { n: deductionLevel + 1 }));
    }
  }, [deductionLevel, grid, setBackupGrids, setDeductionLevel, setAlertMsg]);

  const applyDeduction = useCallback(() => {
    if (deductionLevel > 0) {
      const currentCF = deductionLevel * 2 + 1;
      const currentCX = deductionLevel * 2 + 2;
      const targetCF = (deductionLevel - 1) * 2 + 1;
      const targetCX = (deductionLevel - 1) * 2 + 2;
      const cells = [];
      grid.forEach((row, rr) =>
        row.forEach((v, cc) => {
          if (v === currentCF) cells.push({ r: rr, c: cc, val: targetCF });
          else if (v === currentCX) cells.push({ r: rr, c: cc, val: targetCX });
        }),
      );
      setGrid((g) =>
        g.map((row) =>
          row.map((v) => (v === currentCF ? targetCF : v === currentCX ? targetCX : v)),
        ),
      );
      if (mode === 'play' && !isSolvedStatus && cells.length) {
        recordMove('deduct', cells);
      }
      setBackupGrids((prev) => prev.slice(0, -1));
      setDeductionLevel((prev) => prev - 1);
      setAlertMsg(tr('msg.deductionApply', { n: deductionLevel }));
    }
  }, [
    deductionLevel,
    grid,
    mode,
    isSolvedStatus,
    setGrid,
    setBackupGrids,
    setDeductionLevel,
    setAlertMsg,
    recordMove,
  ]);

  const cancelDeduction = useCallback(() => {
    if (deductionLevel > 0) {
      setGrid(backupGrids[backupGrids.length - 1].map((r) => [...r]));
      setBackupGrids((prev) => prev.slice(0, -1));
      setDeductionLevel((prev) => prev - 1);
      setAlertMsg(tr('msg.deductionCancel', { n: deductionLevel }));
    }
  }, [deductionLevel, backupGrids, setGrid, setBackupGrids, setDeductionLevel, setAlertMsg]);

  return { startDeduction, applyDeduction, cancelDeduction };
}
