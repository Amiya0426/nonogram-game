---
name: nonogram-core
description: Nonogram 核心领域逻辑与游戏状态。用于修改 src/logic/**（board、clues、solver、moveHistory、password、importer、exporter、gifReplay、storage、theme）、src/hooks/** 的状态与操作语义，以及 shared/puzzle-core.mjs（前后端唯一真源）。不用于 UI 样式、API 路由或数据库操作。
---

# Nonogram Core

## 职责范围

- `src/logic/**`：棋盘数据、线索解析/完成判定/自动标记、求解器、操作记录合并、密码强度、导入/导出、GIF 复盘、localStorage、推导模式样式。
- `shared/puzzle-core.mjs`：前后端**唯一真源**——`canFit` / `solveLineFast` / `propagateBoard` / `getLineClue` / `generateLineCandidates` / `solveBoard`。`src/logic` 与 `server` 一律从这里导入，禁止任一侧复制实现。
- `src/hooks/useGameState.js`：组合根（装配领域 hook，对外 API 稳定）；其余 `use*`（useBoardState / useBoardSetup / useGameChecks / useAuth / useTimer / ...）为单领域 hook。
- `src/constants.js`：共享常量（MAX_BOARD、MIN/MAX_CELL_SIZE、DEDUCTION_VALUES、PRESETS、DEFAULT_SETTINGS、DEFAULT_THEME）。UI 与 core 都会读取，修改时两边都要验证。

## 不可违背的边界

- `src/logic/` 不得 import React，不得调用 `src/api.js`，不得读写数据库。
- 求解/线索等前后端共用逻辑只允许存在于 `shared/puzzle-core.mjs`；改动必须同时验证前端与 server（见 tests/unit 的 uniqueness.test.js / solveBoard.test.js）。
- 纯逻辑文件保持无 DOM 依赖；浏览器能力（canvas 导出、GIF、剪贴板）只允许存在于 `exporter.js` / `gifReplay.js` 的隔离函数中。
- 棋盘值编码是全局约定，不要单独改动：0=空、1=填、2=叉；推导 1 级=3/4、2 级=5/6、3 级=7/8；`getLineClue` 把奇数视为填充。改动编码必须同步 theme.js、GridCell、exporter、gifReplay、shared 与 server 的判定。

## 关键语义

- 求解器（唯一真源在 shared/puzzle-core.mjs）：
  - 逻辑传播：`propagateBoard(rClues, cClues, rows, cols, maxIterations)`——前端 200、server 300。
  - 单行推导：`canFit` / `solveLineFast`。
  - 完整求解：`solveBoard`（逻辑传播 + DFS 回溯，行候选少者优先 + 列约束剪枝，带 timeoutMs/nodeLimit）；“一键解题”使用它，超时/超节点时返回逻辑传播部分并提示“部分求解”。
  - 唯一解判定：server `countSolutions` 复用共享核心（generateLineCandidates / canFit / propagateBoard），用于题库入库与审计。
- 操作记录：`moveHistory` 是 GIF 复盘数据源；合并语义在 `src/logic/moveHistory.js`（`dedupeCells` / `appendMove`：同格连续 fill 合并为最终态）；autosolve 不得计入 moveHistory，也不得触发进度上报。
- 计时：首次落子才开始，完成/切模式自动暂停。
- 导入/导出：v2 压缩编码（lz-string）与旧版 base64/URI 编码都要兼容；`decodeExportCode` 不得破坏已有存档。
- 存储：localStorage 键 `nonogram_master_save`（500ms 防抖）、`nonogram_lang`、`nonogram_intro_seen`；损坏数据应回退默认值而不是抛错。

## 验证

- 改动后必须：`npm run lint`、`npm run build`、`npm run test:unit`；涉及交互再跑 `npm run test:e2e`。
- 涉及 solver/唯一解：先跑 tests/unit（solver、solveBoard、uniqueness、moveHistory、password），再用 `tools/build-puzzle-db.mjs` 或 server `countSolutions` 交叉验证。
- 涉及存储/导入导出：e2e-gif / e2e-turn 覆盖存档与 UI 行为，必须跑完整 e2e。
