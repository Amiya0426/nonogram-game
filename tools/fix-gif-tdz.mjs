// 修复 GIF 复盘 TDZ：generateReplayGif 移到 progressPercent 之后，并解决函数名遮蔽
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'src', 'hooks', 'useGameState.js');
let src = fs.readFileSync(FILE, 'utf8');

// 1) import 别名，避免函数名遮蔽
src = src.replace(
  "import { generateReplayGif, downloadGif } from '../logic/gifReplay.js';",
  "import { generateReplayGif as buildReplayGif, downloadGif } from '../logic/gifReplay.js';",
);

// 2) 提取 403-426 块（isGeneratingGif + generateReplayGif useCallback）
const blockStart = src.indexOf('  const [isGeneratingGif, setIsGeneratingGif] = useState(false);');
const blockEnd = src.indexOf('  // ==========================================\n  // 操作记录（GIF 复盘数据源）');
if (blockStart < 0 || blockEnd < 0) throw new Error('找不到目标块');
const block = src.slice(blockStart, blockEnd);
src = src.slice(0, blockStart) + src.slice(blockEnd);

// 函数内调用改别名
const fixedBlock = block.replaceAll('await generateReplayGif({', 'await buildReplayGif({');

// 3) 插入到 progressPercent useMemo 结束之后（用 getClueTextSize 前作唯一锚点）
const anchor = '  }, [mode, rows, cols, lineAnalysis]);\n\n  const getClueTextSize';
const idx = src.indexOf(anchor);
if (idx < 0) throw new Error('找不到 progressPercent 锚点');
const insertAt = idx + anchor.length;
src = src.slice(0, insertAt) + '\n\n' + fixedBlock + src.slice(insertAt);

fs.writeFileSync(FILE, src);
console.log('修复完成：generateReplayGif 已移到 progressPercent 之后，import 已改别名');
