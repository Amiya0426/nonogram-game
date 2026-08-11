import { useCallback, useState } from 'react';
import { generateReplayGif as buildReplayGif, downloadGif } from '../logic/gifReplay.js';
import { buildPuzzleExportName } from '../logic/exporter.js';
import { translate as tr } from '../i18n/index.js';

/** 复盘 GIF 生成 */
export default function useReplay({
  moveHistory,
  rows,
  cols,
  rowCluesStr,
  colCluesStr,
  progressPercent,
  setAlertMsg,
}) {
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);

  const generateReplayGif = useCallback(async () => {
    if (!moveHistory.length) {
      setAlertMsg(tr('msg.gifNoMoves'));
      return;
    }
    setIsGeneratingGif(true);
    setAlertMsg(tr('msg.gifGenerating'));
    try {
      const { bytes, frames } = await buildReplayGif({
        rows,
        cols,
        rowCluesStr,
        colCluesStr,
        moveHistory,
      });
      downloadGif(bytes, `${buildPuzzleExportName({ rows, cols, progressPercent })}_replay`);
      setAlertMsg(tr('msg.gifDone', { frames }));
    } catch (e) {
      setAlertMsg(tr('msg.gifFailed', { msg: e.message }));
    } finally {
      setIsGeneratingGif(false);
    }
  }, [moveHistory, rows, cols, rowCluesStr, colCluesStr, progressPercent, setAlertMsg]);

  return { isGeneratingGif, generateReplayGif };
}
