#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 cn.puzzle-nonograms.com 采集数织题目，输出为项目收藏条目格式的 JSONL。

用法（在本机执行，服务器无法访问该站点）：
    python tools/fetch-puzzles.py --per-size 500 --workers 3 --sizes 1,2,3,4

参数：
    --per-size   每个尺寸目标题数（默认 500）
    --sizes      尺寸列表：0=5x5 1=10x10 2=15x15 3=20x20 4=25x25（默认 1,2,3,4）
    --workers    并发数（默认 3，站点有 Cloudflare 风控，请勿调太高）
    --out        输出目录（默认 tools/puzzle-data）

数据来源：
    1. print.php  POST goprint=1&size=N   -> 每次返回 6 个随机题号（5x5~20x20）
    2. specific.php POST specific=1&size=N&specid=ID -> 返回单题完整数据（25x25 用随机 ID 探测）

输出格式（与收藏条目一致，可直接导入游戏）：
    {"name": ..., "rows": H, "cols": W, "rowCluesStr": [...], "colCluesStr": [...], "grid": null, ...}

断点续爬：重启脚本会读取输出目录已有 JSONL，跳过已抓取的 ID。
"""

import argparse
import json
import os
import random
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

BASE = "https://cn.puzzle-nonograms.com/"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
SIZE_NAMES = {0: "5x5", 1: "10x10", 2: "15x15", 3: "20x20", 4: "25x25"}
MAX_RETRY = 3

_CTX = ssl.create_default_context()
_CTX.check_hostname = False
_CTX.verify_mode = ssl.CERT_NONE


def http_post(params, timeout=15):
    """POST 表单并返回响应文本（关闭证书校验以绕过本机 CA 问题）。"""
    body = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(
        BASE, data=body,
        headers={
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": BASE,
        },
    )
    with urllib.request.urlopen(req, timeout=timeout, context=_CTX) as resp:
        return resp.read().decode("utf-8", "ignore")


def fetch_with_retry(params, max_retry=MAX_RETRY):
    last_err = None
    for _ in range(max_retry):
        try:
            return http_post(params)
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(1.0 + random.random())
    raise last_err


def parse_puzzle_html(html, specid, size):
    """从 specific.php 返回的游戏页解析题目，返回收藏条目 dict 或 None。"""
    task_m = re.search(r"task = '([^']+)'", html)
    w_m = re.search(r"puzzleWidth:\s*(\d+)", html)
    h_m = re.search(r"puzzleHeight:\s*(\d+)", html)
    if not (task_m and w_m and h_m):
        return None
    width, height = int(w_m.group(1)), int(h_m.group(1))
    clues = task_m.group(1).split("/")
    if len(clues) < width + height:
        return None
    # 站点格式：前 width 段为列线索，后 height 段为行线索（与 importer.js 一致）
    col_clues = clues[:width]
    row_clues = clues[width : width + height]

    def to_str(clue):
        nums = [n for n in clue.split(".") if n.isdigit()]
        return ".".join(nums) if nums else "0"

    # 合法性自检：行/列线索的和不能超过棋盘边长，且线索数匹配
    def clue_valid(clues, max_sum):
        for c in clues:
            nums = [n for n in c.split(".") if n.isdigit()]
            if not nums:
                return False
            if sum(int(n) for n in nums) > max_sum:
                return False
        return True

    if not clue_valid(col_clues, height) or not clue_valid(row_clues, width):
        return None

    now = datetime.now()
    return {
        "name": f"puzzle-nonograms {SIZE_NAMES.get(size, '?')} #{specid}",
        "date": f"{now.year}/{now.month}/{now.day} {now.hour:02d}:{now.minute:02d}:{now.second:02d}",
        "rows": height,
        "cols": width,
        "rowCluesStr": [to_str(c) for c in row_clues],
        "colCluesStr": [to_str(c) for c in col_clues],
        "grid": None,
        "markedRowClues": {},
        "markedColClues": {},
        "isSolvedStatus": False,
        "deductionLevel": 0,
        "backupGrids": [],
        "source": f"puzzle-nonograms.cn#{specid}",
    }


def sample_ids_from_print(size, seen):
    """调 print.php 拿 6 个随机题号，过滤已见。"""
    html = fetch_with_retry({"goprint": "1", "size": str(size)})
    ids = [int(m.replace(",", "")) for m in re.findall(r"题号:&nbsp;?([0-9,]+)", html)]
    return [i for i in ids if i not in seen]


def sample_ids_random(seen):
    """25x25 用随机 ID 探测（ID 空间密度极高）。"""
    for _ in range(20):
        i = random.randint(1000, 9999999)
        if i not in seen:
            return [i]
    return []


def sample_ids_random_many(count, seen):
    """批量生成随机 ID（ID 空间密度极高，可替代 print.php 采样）。"""
    out = []
    attempts = 0
    while len(out) < count and attempts < count * 20:
        i = random.randint(1000, 9999999)
        attempts += 1
        if i not in seen and i not in out:
            out.append(i)
    return out


def load_existing(out_file):
    """断点续爬：读取已有 JSONL，返回 {id: row} 与已见 ID 集合。"""
    existing = {}
    if os.path.exists(out_file):
        with open(out_file, encoding="utf-8") as f:
            for line in f:
                try:
                    row = json.loads(line)
                    src = row.get("source", "")
                    m = re.search(r"#(\d+)$", src)
                    if m:
                        existing[int(m.group(1))] = row
                except json.JSONDecodeError:
                    continue
    return existing


def crawl_size(size, target, workers, out_file, progress):
    existing = load_existing(out_file)
    seen = set(existing.keys())
    print(f"[size={size} {SIZE_NAMES[size]}] 已有 {len(existing)} 题，目标 {target} 题")

    pending_ids = []
    fetched = 0
    failed = 0
    consecutive_bad = 0
    BAD_LIMIT = 8  # 连续 8 条解析失败视为风控/站点异常，熔断停止

    def fetch_one(specid):
        html = fetch_with_retry(
            {"specific": "1", "size": str(size), "specid": str(specid)}
        )
        item = parse_puzzle_html(html, specid, size)
        return specid, item

    with ThreadPoolExecutor(max_workers=workers) as pool:
        while len(existing) < target:
            # 补充候选 ID：print.php 采样优先，25x25 或 print 失效时用随机
            if not pending_ids:
                pending_ids = sample_ids_random_many(workers * 3, seen)
                if not pending_ids:
                    print(f"[size={size}] 无法获取新题号，停止。")
                    break

            batch = pending_ids[: workers * 2]
            pending_ids = pending_ids[workers * 2 :]
            futures = {pool.submit(fetch_one, i): i for i in batch}
            for fut in as_completed(futures):
                specid = futures[fut]
                try:
                    got, item = fut.result()
                    seen.add(got)
                    if item:
                        existing[got] = item
                        fetched += 1
                        consecutive_bad = 0
                    else:
                        failed += 1
                        consecutive_bad += 1
                except Exception as e:  # noqa: BLE001
                    failed += 1
                    consecutive_bad += 1
                    print(f"  [{size}] id={specid} 失败: {e}")

            if consecutive_bad >= BAD_LIMIT:
                print(f"[size={size}] 连续 {consecutive_bad} 条解析失败，疑似站点风控，熔断停止。")
                # 保存进度后退出
                with open(out_file, "w", encoding="utf-8") as f:
                    for row in existing.values():
                        f.write(json.dumps(row, ensure_ascii=False) + "\n")
                break

            # 增量落盘，保证断点续爬
            with open(out_file, "w", encoding="utf-8") as f:
                for row in existing.values():
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
            progress[out_file] = len(existing)
            print(
                f"[size={size} {SIZE_NAMES[size]}] 进度 {len(existing)}/{target}"
                f"（失败 {failed}）"
            )
            time.sleep(0.4)

    return existing


def main():
    ap = argparse.ArgumentParser(description="爬取 puzzle-nonograms 题目")
    ap.add_argument("--per-size", type=int, default=500, help="每个尺寸目标题数")
    ap.add_argument("--sizes", default="1,2,3,4", help="尺寸列表 0=5x5 1=10x10 2=15x15 3=20x20 4=25x25")
    ap.add_argument("--workers", type=int, default=3, help="并发请求数")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "puzzle-data"))
    args = ap.parse_args()

    sizes = [int(s) for s in args.sizes.split(",") if s.strip().isdigit() and int(s) in SIZE_NAMES]
    if not sizes:
        print("无效的 --sizes，示例：--sizes 1,2,3,4")
        sys.exit(1)
    os.makedirs(args.out, exist_ok=True)

    progress = {}
    for size in sizes:
        out_file = os.path.join(args.out, f"puzzles_{size}_{SIZE_NAMES[size]}.jsonl")
        crawl_size(size, args.per_size, args.workers, out_file, progress)

    total = sum(len(load_existing(os.path.join(args.out, f)))
                for f in os.listdir(args.out) if f.endswith(".jsonl"))
    print(f"\n完成！共 {total} 题，输出目录：{args.out}")


if __name__ == "__main__":
    main()
