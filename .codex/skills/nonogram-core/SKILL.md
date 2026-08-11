---
name: nonogram-core
description: Nonogram 核心领域逻辑与游戏状态。用于修改 src/logic/**（board、clues、solver、importer、exporter、gifReplay、storage、theme）以及 src/hooks/useGameState.js 中的棋盘状态、操作记录、撤销/还原、提示、自动求解与 GIF 复盘语义。不用于 UI 样式、API 路由或数据库操作。
---

# Nonogram Core

## 职责范围

- `src/logic/**`：棋盘数据、线索解析/完成判定/自动标记、求解器、导入/导出、GIF 复盘、localStorage、推导模式样式。
- `src/hooks/useGameState.js`：游戏状态编排（唯一状态源），连接 `logic` ↔ UI ↔ `src/api.js`。
- `src/constants.js`：共享常量（MAX_BOARD、MIN/MAX_CELL_SIZE、DEDUCTION_VALUES、PRESETS、DEFAULT_SETTINGS、DEFAULT_THEME）。UI 与 core 都会读取，修改时两边都要验证。

## 不可违背的边界

- `src/logic/` 不得 import React，不得调用 `src/api.js`，不得读写数据库。
- 纯逻辑文件（board.js、clues.js、solver.js、storage.js）保持无 DOM 依赖；浏览器能力（canvas 导出、GIF、剪贴板）只允许存在于 `exporter.js` / `gifReplay.js` 的隔离函数中。
- 棋盘值编码是全局约定，不要单独改动：0=空、1=填、2=叉；推导 1 级=3/4、2 级=5/6、3 级=7/8；`getLineClue` 把奇数视为填充。改动编码必须同步 theme.js、GridCell、exporter、gifReplay、server/puzzle-lib 的判定。

## 关键语义

- 求解器：`solveLineFast`/`solveBoardLogic`（前端提示/自动求解用）与 server 的 `countSolutions`（唯一解用）是两套实现，行为必须一致；修改时关注正确性、唯一解、性能与迭代上限（200）。
- 操作记录：`moveHistory` 是 GIF 复盘数据源；同格重复操作要合并，切换模式打叉只记录最终态；autosolve 不得计入 moveHistory，也不得触发进度上报。
- 计时：首次落子才开始，完成/切模式自动暂停。
- 导入/导出：v2 压缩编码（lz-string）与旧版 base64/URI 编码都要兼容；`decodeExportCode` 不得破坏已有存档。
- 存储：localStorage 键 `nonogram_master_save`（500ms 防抖）、`nonogram_lang`、`nonogram_intro_seen`；损坏数据应回退默认值而不是抛错。

## 验证

- 改动后必须：`npm run lint`、`npm run build`、`npm run test:e2e`。
- 涉及 solver/唯一解：先用已知题验证（tests 使用 webpbn#304），再用 `tools/build-puzzle-db.mjs` 或 server `countSolutions` 交叉验证。
- 涉及存储/导入导出：e2e-gif / e2e-turn 覆盖存档与合并语义，必须跑完整 e2e。
