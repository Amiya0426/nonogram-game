// 从外部网页源码中提取数织题目

const parseTaskClue = (str) => {
  if (!str || str === '0') return [0];
  return str
    .split('.')
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
};

const extractNumbers = (element) => {
  const numbers = element.innerHTML.replace(/<[^>]+>/g, ' ').match(/\d+/g);
  return numbers ? numbers.map(Number) : [0];
};

/**
 * 解析网页源码为谜题。依次尝试：
 * 1. task 变量 / puzzleWidth / puzzleHeight
 * 2. task-row-N / task-col-N 分组
 * 3. .nmtl / .nmtt 或表格布局
 * 全部失败时抛出带提示信息的错误。
 */
export const extractPuzzleFromHtml = (html) => {
  let parsedRowClues = [];
  let parsedColClues = [];
  let r = 0;
  let c = 0;
  const safeHtml = html.trim();

  // 1) 变量形式：task='...'  puzzleWidth/H puzzleHeight
  try {
    const taskMatch = safeHtml.match(/(?:var\s+task\s*=\s*|task:\s*)['"](.*?)['"]/i);
    const wMatch = safeHtml.match(/puzzleWidth:\s*(\d+)/i);
    const hMatch = safeHtml.match(/puzzleHeight:\s*(\d+)/i);
    if (taskMatch && wMatch && hMatch) {
      const width = parseInt(wMatch[1], 10);
      const height = parseInt(hMatch[1], 10);
      const clues = taskMatch[1].split('/');
      if (clues.length >= width + height) {
        parsedColClues = clues
          .slice(0, width)
          .map(parseTaskClue)
          .map((arr) => (arr.length ? arr : [0]));
        parsedRowClues = clues
          .slice(width, width + height)
          .map(parseTaskClue)
          .map((arr) => (arr.length ? arr : [0]));
        r = height;
        c = width;
      }
    }
  } catch {
    console.warn('Failed to parse task clue fallback block.');
  }

  // 2) task-row-N / task-col-N 分组
  if (parsedRowClues.length === 0 || parsedColClues.length === 0) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(safeHtml, 'text/html');
      const rowGroups = Array.from(doc.querySelectorAll('[class*="task-row-"]')).sort(
        (a, b) =>
          (parseInt(a.className.match(/task-row-(\d+)/)?.[1] || 0, 10) -
            parseInt(b.className.match(/task-row-(\d+)/)?.[1] || 0, 10)),
      );
      const colGroups = Array.from(doc.querySelectorAll('[class*="task-col-"]')).sort(
        (a, b) =>
          (parseInt(a.className.match(/task-col-(\d+)/)?.[1] || 0, 10) -
            parseInt(b.className.match(/task-col-(\d+)/)?.[1] || 0, 10)),
      );
      if (rowGroups.length > 0 && colGroups.length > 0) {
        parsedRowClues = rowGroups.map(extractNumbers);
        parsedColClues = colGroups.map(extractNumbers);
        r = parsedRowClues.length;
        c = parsedColClues.length;
      }
    } catch {
      console.warn('Failed to parse DOM task groups.');
    }
  }

  // 3) .nmtl / .nmtt 或表格布局
  if (parsedRowClues.length === 0 || parsedColClues.length === 0) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(safeHtml, 'text/html');
      const leftContainer =
        doc.querySelector('.nmtl') ||
        doc.querySelector('#taskLeft') ||
        doc.querySelector('table tbody tr td:first-child');
      const topContainer =
        doc.querySelector('.nmtt') ||
        doc.querySelector('#taskTop') ||
        doc.querySelector('table tbody tr:first-child');
      if (leftContainer && topContainer) {
        let leftChildren = Array.from(leftContainer.children);
        if (
          leftChildren.length === 1 &&
          ['TBODY', 'TABLE'].includes(leftChildren[0].tagName)
        ) {
          leftChildren = Array.from(leftChildren[0].children);
        }
        if (leftChildren.length === 0) {
          leftChildren = Array.from(leftContainer.querySelectorAll('tr, div.task-group'));
        }

        let topChildren = Array.from(topContainer.children);
        if (
          topChildren.length === 1 &&
          ['TBODY', 'TABLE'].includes(topChildren[0].tagName)
        ) {
          topChildren = Array.from(topChildren[0].children);
        }
        if (topChildren.length > 0 && topChildren[0].tagName === 'TR') {
          topChildren = Array.from(topChildren[0].children);
        }
        if (topChildren.length === 0) {
          topChildren = Array.from(topContainer.querySelectorAll('td, div.task-group'));
        }

        const tempRow = leftChildren.map(extractNumbers).filter((arr) => arr.length > 0);
        const tempCol = topChildren.map(extractNumbers).filter((arr) => arr.length > 0);
        if (tempRow.length > 0 && tempCol.length > 0) {
          parsedRowClues = tempRow;
          parsedColClues = tempCol;
          r = parsedRowClues.length;
          c = parsedColClues.length;
        }
      }
    } catch {
      console.warn('Failed to parse table-based task layout.');
    }
  }

  if (parsedRowClues.length === 0 || parsedColClues.length === 0) {
    throw new Error('解析失败。未能找到任何题目数据。请确保您完整复制了目标区域的代码。');
  }
  return { rows: r, cols: c, rowClues: parsedRowClues, colClues: parsedColClues };
};

/**
 * 解析单个收藏 JSON（用于批量导入）。
 * 合法结构：rows/cols/rowCluesStr/colCluesStr/grid。
 * 缺少 name 时用文件名兜底。
 */
export const parseCollectionItem = (text, fallbackName = '') => {
  const data = JSON.parse(text);
  if (!data.rows || !data.cols || !data.rowCluesStr || !data.colCluesStr || !data.grid) {
    throw new Error('格式不完整');
  }
  const baseName =
    typeof data.name === 'string' && data.name.trim()
      ? data.name.trim()
      : fallbackName.replace(/\.json$/i, '').trim() || '导入题目';
  return {
    name: baseName,
    rows: data.rows,
    cols: data.cols,
    rowCluesStr: data.rowCluesStr,
    colCluesStr: data.colCluesStr,
    grid: data.grid,
    markedRowClues: data.markedRowClues || {},
    markedColClues: data.markedColClues || {},
    isSolvedStatus: data.isSolvedStatus || false,
    deductionLevel: data.deductionLevel || 0,
    backupGrids: data.backupGrids || [],
  };
};
