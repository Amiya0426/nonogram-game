---
name: nonogram-puzzle
description: Nonogram 题库数据采集、转换、合并与唯一解构建。用于修改 tools/**、tools/puzzle-data/**（fetch/convert/merge/build/fix 脚本与 JSONL 数据），生成稳定 ID 的 import.jsonl。不直接操作生产数据库。
---

# Nonogram Puzzle

## 职责范围

- 采集：`tools/fetch-puzzles.py`（puzzle-nonograms）、`tools/fetch-webpbn.py`（webpbn）。
- 转换：`tools/convert-puzzlekit.py`、`tools/convert-old-exports.mjs`。
- 清洗/补丁：`tools/fix-webpbn-zero-clues.py`、`tools/fix-gif-tdz.mjs`、`tools/patch-sidepanel.mjs`（一次性补丁脚本，历史用途，不要当作常规流程）。
- 合并/去重：`tools/merge-puzzle-data.py` → `puzzle-data/merged/<W>x<H>.jsonl`。
- 构建：`tools/build-puzzle-db.mjs` 校验合法性与唯一解，输出 `tools/puzzle-data/import.jsonl`。
- 性能：`tools/find-slow-puzzles.mjs` 扫描慢题。
- 数据：`tools/puzzle-data/**`（puzzle-nonograms / puzzlekit / webpbn / merged / import.jsonl）。

## 流水线与规则

1. fetch → 统一为收藏条目标准（name、rows、cols、rowCluesStr、colCluesStr、grid）。
2. merge 按 `WxH` 文件名归类，多来源合并。
3. build：normalize → validate（线索和不超过边长）→ `countSolutions`（timeout + nodeLimit）→ 只有唯一解（count=1）才保留；无解/多解/超时丢弃并统计。
4. 生成稳定 ID：`contentHash(rows|cols|行列线索顺序)` → SHA-256 → `puzzleIdFromHash`（前 8 字节十进制）。ID 方案改动 = 数据迁移，禁止随意改。
5. `import.jsonl` 字段：id、rows、cols、row_clues、col_clues、grid、source、density、content_hash。

## 关键约束

- 确定性：同样输入必须产生同样输出；不要引入随机顺序/时间戳污染 ID 与排序。
- 唯一解是硬门槛：不得放行多解题；超时题记录并跳过（find-slow-puzzles）。
- 大数据集性能：按尺寸分文件、批量处理、限制候选枚举（generateLineCandidates limit）、避免全量 O(n²) 扫描。
- 不要直接写生产数据库：build 只产出 JSONL；入库由 `server/import-puzzles.mjs`（nonogram-backend）执行，且必须先备份。
- 脚本默认路径避免机器相关硬编码（convert-puzzlekit.py 的默认输入路径仅作示例，实际用参数传入）。

## 验证

- 跑一次 `node tools/build-puzzle-db.mjs`，检查统计（invalid/noSolution/multi/timeout/unique）与 import.jsonl 行数。
- 抽查已知题（如 webpbn#304，tests 使用）确认 ID/线索稳定。
- 对未变更的题重新构建，确认 ID 与 import.jsonl 内容 diff 为空（除新增行）。
