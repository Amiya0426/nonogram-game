#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 webpbn.com 批量下载题目（仅黑白单色），转换为项目收藏条目 JSONL，按尺寸分类。

用法：
    python tools/fetch-webpbn.py [--max-id 35800] [--workers 5] [--out puzzle-data/webpbn]

说明：
    - 遍历 ID 1..max-id，POST export.cgi 导出 XML（含线索与答案）
    - 无效/删除/多色题目自动跳过
    - 断点续爬：进度记录在 <out>/.progress.json，重启时继续
    - 请勿提高 workers 过多，尊重站点负载
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
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

BASE = "https://www.webpbn.com/export.cgi"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
MAX_RETRY = 3

_CTX = ssl.create_default_context()
_CTX.check_hostname = False
_CTX.verify_mode = ssl.CERT_NONE


def http_post(params, timeout=20):
    body = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(
        BASE, data=body,
        headers={
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": "https://www.webpbn.com/export.cgi",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout, context=_CTX) as resp:
        return resp.read().decode("utf-8", "ignore")


def fetch_with_retry(id_, max_retry=MAX_RETRY):
    last_err = None
    for _ in range(max_retry):
        try:
            return http_post({"id": str(id_), "fmt": "xml", "go": "1", "xml_clue": "1", "xml_soln": "1"})
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(1.0 + random.random())
    raise last_err


def parse_webpbn_xml(xml_text, pid, now):
    """解析 webpbn XML，返回收藏条目；无效/多色返回 None。"""
    if "<puzzle type=" not in xml_text:
        return None
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return None
    puzzle = root.find("puzzle")
    if puzzle is None:
        return None

    # 多色题跳过：统计 <color> 中除黑/白外的颜色
    colors = puzzle.findall("color")
    non_bw = [c for c in colors if (c.get("name") or "").lower() not in ("black", "white")]
    if non_bw:
        return None

    def parse_clues(clues_el):
        result = []
        for line in clues_el.findall("line"):
            counts = [int(c.text) for c in line.findall("count") if c.text and c.text.isdigit()]
            result.append(".".join(map(str, counts)) if counts else "0")
        return result

    col_el = next((c for c in puzzle.findall("clues") if c.get("type") == "columns"), None)
    row_el = next((c for c in puzzle.findall("clues") if c.get("type") == "rows"), None)
    if col_el is None or row_el is None:
        return None
    col_clues = parse_clues(col_el)
    row_clues = parse_clues(row_el)
    width, height = len(col_clues), len(row_clues)
    if width < 3 or height < 3 or width > 80 or height > 80:
        return None

    # 答案网格
    grid = None
    sol_el = puzzle.find("solution")
    if sol_el is not None:
        image = sol_el.findtext("image", "")
        rows_text = [r for r in image.strip().splitlines() if r.strip()]
        if len(rows_text) == height:
            parsed = []
            ok = True
            for row_text in rows_text:
                chars = [ch for ch in row_text if ch in "xX.-O0"]
                if len(chars) != width:
                    ok = False
                    break
                parsed.append([1 if ch in "xXO0" else 0 for ch in chars])
            if ok:
                grid = parsed

    title = puzzle.findtext("title") or f"webpbn #{pid}"
    return {
        "name": f"webpbn #{pid} {title}",
        "date": now.strftime("%Y/%m/%d %H:%M:%S"),
        "rows": height,
        "cols": width,
        "rowCluesStr": row_clues,
        "colCluesStr": col_clues,
        "grid": grid,
        "markedRowClues": {},
        "markedColClues": {},
        "isSolvedStatus": False,
        "deductionLevel": 0,
        "backupGrids": [],
        "source": f"webpbn#{pid}",
    }


def load_progress(out_dir):
    prog_file = os.path.join(out_dir, ".progress.json")
    if os.path.exists(prog_file):
        with open(prog_file, encoding="utf-8") as f:
            return json.load(f)
    return {"done_ids": [], "counts": {}}


def save_progress(out_dir, done_ids, counts):
    prog_file = os.path.join(out_dir, ".progress.json")
    with open(prog_file, "w", encoding="utf-8") as f:
        json.dump({"done_ids": done_ids, "counts": counts}, f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-id", type=int, default=35800)
    ap.add_argument("--workers", type=int, default=5)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "puzzle-data", "webpbn"))
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    prog = load_progress(args.out)
    done = set(prog["done_ids"])
    counts = dict(prog["counts"])
    pending = [i for i in range(1, args.max_id + 1) if i not in done]
    print(f"待处理 {len(pending)} 个 ID，已处理 {len(done)} 个，已入库 {sum(counts.values())} 题")

    now = datetime.now()
    fetch_fail = 0

    def work(pid):
        try:
            xml_text = fetch_with_retry(pid)
            item = parse_webpbn_xml(xml_text, pid, now)
            return pid, item
        except Exception as e:  # noqa: BLE001
            return pid, f"ERR {e}"

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        batch_size = args.workers * 4
        for start in range(0, len(pending), batch_size):
            batch = pending[start : start + batch_size]
            results = list(pool.map(work, batch))
            for pid, item in results:
                done.add(pid)
                if isinstance(item, dict):
                    dim = f"{item['cols']}x{item['rows']}"
                    counts[dim] = counts.get(dim, 0) + 1
                    out = os.path.join(args.out, f"{dim}.jsonl")
                    with open(out, "a", encoding="utf-8") as f:
                        f.write(json.dumps(item, ensure_ascii=False) + "\n")
                elif isinstance(item, str):
                    fetch_fail += 1

            save_progress(args.out, sorted(done), counts)
            if (start // batch_size) % 10 == 0:
                total = sum(counts.values())
                print(f"进度 {len(done)}/{args.max_id}  已入库 {total} 题  分布: "
                      + " ".join(f"{k}:{v}" for k, v in sorted(counts.items(), key=lambda x: -x[1])[:6]))
            time.sleep(0.3)

    total = sum(counts.values())
    print(f"\n完成！共处理 {len(done)} 个 ID，入库 {total} 题，失败 {fetch_fail}，输出目录 {args.out}")


if __name__ == "__main__":
    main()
