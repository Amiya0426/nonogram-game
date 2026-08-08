// 一次性机械修改：SidePanel 加 tab 分组 + 计时器 + 底部导航
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'src', 'components', 'SidePanel.jsx');
let src = fs.readFileSync(FILE, 'utf8');

const retIdx = src.indexOf('return (');
if (retIdx < 0) throw new Error('return 未找到');
const body = src.slice(retIdx);

// 4 个 Accordion 位置
const accIdx = [...body.matchAll(/<Accordion title=/g)].map((m) => m.index);
if (accIdx.length !== 4) throw new Error(`预期 4 个 Accordion，实际 ${accIdx.length}`);

const timerBlock = `
        {/* 计时器 + 复盘 GIF */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span className="font-mono text-lg font-bold text-slate-800 tabular-nums">{formatTime(timerSeconds)}</span>
          </div>
          <div className="flex items-center gap-1.5">
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
            <button
              onClick={togglePauseTimer}
              className={\`p-2 rounded-lg border transition-colors \${
                timerRunning
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
              }\`}
              title={timerRunning ? '暂停计时' : '继续计时'}
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </div>
`;

const bottomNav = `
        {/* 移动端底部导航 */}
        <div className="md:hidden flex border-t border-slate-200 bg-white shrink-0 sticky bottom-0">
          {[
            { key: 'game', label: '游戏', Icon: MousePointerClick },
            { key: 'collection', label: '收藏', Icon: FolderHeart },
            { key: 'import', label: '导入', Icon: FileSymlink },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={\`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors \${
                activeTab === key ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }\`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
`;

// 插入顺序从后往前，保证索引不失效
const insertAt = (pos, text) => {
  const abs = retIdx + pos;
  src = src.slice(0, abs) + text + src.slice(abs);
};

// 4) 文件尾部：在 return 的外层容器闭合 </div> 前，关闭 import tab 并加底部导航
const fragEnd = src.lastIndexOf('</>');
const beforeEnd = src.slice(0, fragEnd);
const outerClose = beforeEnd.lastIndexOf('    </div>');
insertAt(outerClose - retIdx, '\n        </div>\n' + bottomNav);

// 重新计算 body 索引（因为插入了内容）
const body2 = src.slice(retIdx);
const accIdx2 = [...body2.matchAll(/<Accordion title=/g)].map((m) => m.index);

// 3) 导入 Accordion 前：关闭 collection tab + 打开 import tab
insertAt(accIdx2[3], '</div>\n\n        <div className={tabCls(\'import\')}>\n');
// 2) 收藏 Accordion 前：关闭 game tab + 打开 collection tab
insertAt(accIdx2[2], '</div>\n\n        <div className={tabCls(\'collection\')}>\n');
// 1) 在 `{mode === 'play' && (` 之前：打开 game tab + 计时器（容器在条件表达式外）
const playCond = body2.indexOf("{mode === 'play' && (");
if (playCond < 0) throw new Error('mode === play 条件未找到');
insertAt(playCond, '<div className={tabCls(\'game\')}>\n' + timerBlock + '\n');

fs.writeFileSync(FILE, src);
console.log('SidePanel.jsx 已重构');
