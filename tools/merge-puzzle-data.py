#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
合并所有题库来源（puzzle-nonograms / puzzlekit / webpbn）到统一目录，按尺寸分类。

用法：
    python tools/merge-puzzle-data.py [数据根目录]

默认数据根目录：tools/puzzle-data
输出：tools/puzzle-data/merged/<W>x<H>.jsonl（按列x行命名）
"""

import glob
import json
import os
import re
import sys

DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "puzzle-data")
OUT = os.path.join(DATA_ROOT, "merged")


def find_jsonl_files(root):
    files = []
    for sub in ("puzzle-nonograms", "puzzlekit", "webpbn"):
        d = os.path.join(root, sub)
        if os.path.isdir(d):
            files.extend(glob.glob(os.path.join(d, "*.jsonl")))
    # 根目录下的爬虫输出（puzzles_N_WxH.jsonl）
    files.extend(glob.glob(os.path.join(root, "puzzles_*.jsonl")))
    return files


def dim_from_filename(name):
    """从文件名提取 WxH：puzzles_1_10x10.jsonl / 10x10.jsonl / 30x40.jsonl"""
    m = re.search(r"(\d+)x(\d+)", name)
    if m:
        return f"{int(m.group(1))}x{int(m.group(2))}"
    return None


def main():
    os.makedirs(OUT, exist_ok=True)
    buckets = {}
    stats = {}
    total = 0
    for path in find_jsonl_files(DATA_ROOT):
        dim = dim_from_filename(os.path.basename(path))
        if dim is None:
            print(f"跳过无法识别尺寸的文件: {path}")
            continue
        count = 0
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    continue
                # 以条目自身尺寸为准
                d2 = f"{item.get('cols', 0)}x{item.get('rows', 0)}"
                buckets.setdefault(d2, []).append(item)
                count += 1
        stats[os.path.relpath(path, DATA_ROOT)] = count
        total += count

    for dim, items in sorted(buckets.items(), key=lambda kv: (int(kv[0].split("x")[0]), int(kv[0].split("x")[1]))):
        out = os.path.join(OUT, f"{dim}.jsonl")
        with open(out, "w", encoding="utf-8") as f:
            for it in items:
                f.write(json.dumps(it, ensure_ascii=False) + "\n")

    print("=== 来源统计 ===")
    for src, n in sorted(stats.items()):
        print(f"  {src}: {n} 题")
    print(f"\n=== 合并后按尺寸分布（前 30）===")
    for dim, items in sorted(buckets.items(), key=lambda kv: -len(kv[1]))[:30]:
        print(f"  {dim}: {len(items)} 题")
    print(f"\n总计 {total} 题，输出目录 {OUT}")


if __name__ == "__main__":
    main()
