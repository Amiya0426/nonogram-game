/**
 * 操作记录（GIF 复盘数据源）的纯函数逻辑。
 * 与 UI/React 解耦，便于单元测试。
 */

/** 压缩一次记录中同一格子的重复操作（拖拽/画笔划过同格时取最后值） */
export const dedupeCells = (cells) => {
  const dedup = [];
  for (const cell of cells) {
    const idx = dedup.findIndex((x) => x.r === cell.r && x.c === cell.c);
    if (idx >= 0) dedup[idx] = cell;
    else dedup.push(cell);
  }
  return dedup;
};

/**
 * 追加一条操作记录到历史。
 * 轮换模式合并：上一条是单格 fill 且与本次同格时，合并为一条（取本次最终值）。
 * 例如打叉的 空→黑→叉 路径只记录"叉"，复盘时一步到位，不出现中间黑块。
 * 无有效格子时原样返回 prev。
 */
export const appendMove = (prev, type, cells) => {
  const dedup = dedupeCells(cells);
  if (dedup.length === 0) return prev;

  const last = prev[prev.length - 1];
  if (
    type === 'fill' &&
    last &&
    last.type === 'fill' &&
    last.cells.length === 1 &&
    dedup.length === 1 &&
    last.cells[0].r === dedup[0].r &&
    last.cells[0].c === dedup[0].c
  ) {
    const merged = [...prev];
    merged[merged.length - 1] = { ...last, cells: [{ ...dedup[0] }] };
    return merged;
  }
  return [...prev, { type, at: Date.now(), cells: dedup }];
};
