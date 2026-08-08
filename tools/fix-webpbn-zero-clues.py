#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 webpbn 数据中 count=0（空线索）被误存为 "5.0" 的问题。

webpbn 的 XML 里 count 为 0 表示该行/列没有黑色格（空线索），
正确的 rowCluesStr/colCluesStr 应存 "0"。本脚本去掉线索串里多余的 "0" 段，
并剔除修复后仍与答案不匹配的题目。
"""

import glob
import json
import os
import sys

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "puzzle-data", "webpbn")
if len(sys.argv) > 1:
    OUT_DIR = sys.argv[1]


def fix_clue(clue):
    """'5.0' -> '5'；'0' -> '0'；'0.3' -> '3'。"""
    nums = [n for n in clue.split(".") if n.isdigit() and int(n) > 0]
    return ".".join(nums) if nums else "0"


def line_clues(line):
    runs, r = [], 0
    for v in line:
        if v:
            r += 1
        elif r:
            runs.append(r)
            r = 0
    if r:
        runs.append(r)
    return [0] if not runs else runs


def item_valid(it):
    rows, cols = it["rows"], it["cols"]
    if len(it["rowCluesStr"]) != rows or len(it["colCluesStr"]) != cols:
        return False
    for r in range(rows):
        nums = [int(x) for x in it["rowCluesStr"][r].split(".") if x.isdigit()]
        if not nums or sum(nums) > cols:
            return False
    for c in range(cols):
        nums = [int(x) for x in it["colCluesStr"][c].split(".") if x.isdigit()]
        if not nums or sum(nums) > rows:
            return False
    if it["grid"] is not None:
        for r_i, row in enumerate(it["grid"]):
            exp = [int(x) for x in it["rowCluesStr"][r_i].split(".")] if it["rowCluesStr"][r_i] != "0" else [0]
            if line_clues(row) != exp:
                return False
        for c_i in range(cols):
            col = [it["grid"][r][c_i] for r in range(rows)]
            exp = [int(x) for x in it["colCluesStr"][c_i].split(".")] if it["colCluesStr"][c_i] != "0" else [0]
            if line_clues(col) != exp:
                return False
    return True


def main():
    fixed, removed, total = 0, 0, 0
    for path in glob.glob(os.path.join(OUT_DIR, "*.jsonl")):
        kept = []
        for line in open(path, encoding="utf-8"):
            it = json.loads(line)
            total += 1
            it["rowCluesStr"] = [fix_clue(c) for c in it["rowCluesStr"]]
            it["colCluesStr"] = [fix_clue(c) for c in it["colCluesStr"]]
            if item_valid(it):
                kept.append(it)
                fixed += 1
            else:
                removed += 1
        with open(path, "w", encoding="utf-8") as f:
            for it in kept:
                f.write(json.dumps(it, ensure_ascii=False) + "\n")
    print(f"处理 {total} 条：保留 {fixed}，剔除 {removed}")


if __name__ == "__main__":
    main()
