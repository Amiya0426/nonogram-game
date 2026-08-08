#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 puzzlekit-dataset 的 Nonogram_dataset.json 转换为项目收藏条目 JSONL，按尺寸分类。

用法：
    python tools/convert-puzzlekit.py <Nonogram_dataset.json 路径> [输出目录]

输出：<输出目录>/puzzlekit/<W>x<H>.jsonl
每条格式与游戏收藏条目一致（rowCluesStr/colCluesStr/grid）。
"""

import json
import os
import re
import sys
from datetime import datetime

INPUT = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\hy\AppData\Local\Temp\puzzlekit-dataset\assets\data\Nonogram\Nonogram_dataset.json"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "puzzle-data", "puzzlekit")


def parse_clue_text(text):
    """把 '2 1 1 3 1' 转成 '2.1.1.3.1'；空/0 返回 '0'。"""
    nums = [n for n in text.split() if n.isdigit() and int(n) > 0]
    return ".".join(nums) if nums else "0"


def parse_solution(text):
    """解析 solution 文本为网格（True=黑）。"""
    lines = text.strip().splitlines()
    header = lines[0].split()
    if len(header) < 2 or not header[0].isdigit():
        return None, None
    width, height = int(header[0]), int(header[1])
    grid = []
    for row in lines[1 : 1 + height]:
        chars = [ch for ch in row if ch in "xX.-"]
        if len(chars) != width:
            return None, None
        grid.append([ch in "xX" for ch in chars])
    return grid, (width, height)


def line_clue(grid_line):
    """从一行布尔网格计算线索列表。"""
    runs, run = [], 0
    for v in grid_line:
        if v:
            run += 1
        elif run:
            runs.append(run)
            run = 0
    if run:
        runs.append(run)
    return runs or [0]


def build_item(key, problem, solution_text, now):
    """解析一条 puzzlekit 数据，返回收藏条目或 None。"""
    lines = problem.strip().splitlines()
    header = lines[0].split()
    if len(header) < 2 or not header[0].isdigit():
        return None
    width, height = int(header[0]), int(header[1])
    clue_lines = lines[1:]
    if len(clue_lines) != width + height:
        return None

    # 候选方向：前 W 行为列、后 H 行为行（webpbn 惯例）
    cols_cand = [parse_clue_text(l) for l in clue_lines[:width]]
    rows_cand = [parse_clue_text(l) for l in clue_lines[width : width + height]]

    grid = None
    if solution_text:
        sol_grid, dim = parse_solution(solution_text)
        if sol_grid and dim == (width, height):
            grid = [[1 if v else 0 for v in row] for row in sol_grid]
            # 校验方向：用答案反推行线索，匹配 rows_cand 则方向正确，否则交换
            calc_rows = [line_clue(r) for r in sol_grid]
            calc_cols = [line_clue([r[c] for r in sol_grid]) for c in range(width)]
            rows_ok = [parse_clue_text(" ".join(map(str, r))) == rows_cand[i] for i, r in enumerate(calc_rows)]
            cols_ok = [parse_clue_text(" ".join(map(str, c))) == cols_cand[i] for i, c in enumerate(calc_cols)]
            if not (all(rows_ok) and all(cols_ok)):
                # 尝试交换（前 W 行为行）
                rows_cand, cols_cand = cols_cand, rows_cand
                calc_rows2 = [line_clue(r) for r in sol_grid]
                calc_cols2 = [line_clue([r[c] for r in sol_grid]) for c in range(width)]
                rows_ok2 = [parse_clue_text(" ".join(map(str, r))) == rows_cand[i] for i, r in enumerate(calc_rows2)]
                cols_ok2 = [parse_clue_text(" ".join(map(str, c))) == cols_cand[i] for i, c in enumerate(calc_cols2)]
                if not (all(rows_ok2) and all(cols_ok2)):
                    return None  # 数据异常，跳过

    return {
        "name": f"puzzlekit {width}x{height} #{key}",
        "date": now.strftime("%Y/%m/%d %H:%M:%S"),
        "rows": height,
        "cols": width,
        "rowCluesStr": rows_cand,
        "colCluesStr": cols_cand,
        "grid": grid,
        "markedRowClues": {},
        "markedColClues": {},
        "isSolvedStatus": False,
        "deductionLevel": 0,
        "backupGrids": [],
        "source": f"puzzlekit#{key}",
    }


def main():
    with open(INPUT, encoding="utf-8") as f:
        data = json.load(f)
    os.makedirs(OUT_DIR, exist_ok=True)

    now = datetime.now()
    buckets = {}
    skipped = 0
    for key, entry in data["data"].items():
        item = build_item(key, entry.get("problem", ""), entry.get("solution", ""), now)
        if item is None:
            skipped += 1
            continue
        dim = f"{item['cols']}x{item['rows']}"
        buckets.setdefault(dim, []).append(item)

    total = 0
    for dim, items in sorted(buckets.items()):
        out = os.path.join(OUT_DIR, f"{dim}.jsonl")
        with open(out, "w", encoding="utf-8") as f:
            for it in items:
                f.write(json.dumps(it, ensure_ascii=False) + "\n")
        total += len(items)
        print(f"{dim}: {len(items)} 题 -> {out}")
    print(f"\n完成：{total} 题，跳过 {skipped} 条，输出目录 {OUT_DIR}")


if __name__ == "__main__":
    main()
