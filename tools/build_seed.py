# -*- coding: utf-8 -*-
"""
把「贴贴密笺」导出的 JSON 转换为天天记小程序的内置种子数据（data/seed-diary.js）。

用法：
    python tools/build_seed.py "C:/path/贴贴密笺_xxx.json"

字段映射：
    id         -> id            （保留原 UUID，便于重复导入时幂等去重）
    title      -> title
    content    -> content       （markdown 原文，完整保留）
    category   -> tags          （分类名作为标签，如 生活/重要/工作）
    color      -> color         （便签底色，页面暂未使用，先留存）
    is_pinned  -> pinned
    created_at -> createdAt     （ISO 本地时间 -> 毫秒时间戳）
    updated_at -> updatedAt
    is_deleted/deleted_at -> deletedAt
"""
import io
import json
import os
import re
import sys

SRC_DEFAULT = r"C:\Users\hh757\Desktop\贴贴密笺_2026-10-14_补全.json"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "seed-diary.js")


def to_ts(s):
    """'2026-06-14T03:13:08' -> 毫秒时间戳（按本机本地时区解释）"""
    if not s:
        return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})", s)
    if not m:
        return None
    import datetime
    dt = datetime.datetime(*[int(x) for x in m.groups()])
    return int(dt.timestamp() * 1000)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else SRC_DEFAULT
    with io.open(src, encoding="utf-8") as f:
        data = json.load(f)

    cats = {c["id"]: c["name"] for c in data.get("categories", [])}
    notes = []

    for n in data.get("notes", []):
        content = n.get("content") or ""
        # 分类名作为标签，与正文内 #标签 一并由 store.normalizeTags 归一
        tags = []
        cat = cats.get(n.get("category_id"))
        if cat:
            tags.append(cat)

        created = to_ts(n.get("created_at"))
        updated = to_ts(n.get("updated_at")) or created

        deleted = None
        if n.get("is_deleted") or n.get("deleted_at"):
            deleted = to_ts(n.get("deleted_at")) or updated

        note = {
            "id": n["id"],
            "title": (n.get("title") or "").strip(),
            "content": content,
            "tags": tags,
            "images": [],
            "audio": [],
            "color": n.get("color") or "",
            "pinned": bool(n.get("is_pinned")),
            "createdAt": created,
            "updatedAt": updated,
            "deletedAt": deleted,
        }
        notes.append(note)

    notes.sort(key=lambda x: x["createdAt"])

    payload = {
        "version": data.get("version", "1.0"),
        "exportedAt": data.get("exported_at", ""),
        "categories": [
            {"id": c["id"], "name": c["name"], "color": c.get("color", "")}
            for c in data.get("categories", [])
        ],
        "notes": notes,
    }

    body = json.dumps(payload, ensure_ascii=False, indent=1)
    out_js = (
        "/**\n"
        " * 内置种子日记：由 tools/build_seed.py 从「贴贴密笺」导出文件生成，请勿手改。\n"
        " * 首次启动时若本地无数据，会自动播种到 wx.storage（见 utils/store.js importSeed）。\n"
        " */\n"
        "module.exports = " + body + "\n"
    )

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(out_js)

    print("源文件 :", src)
    print("输出   :", OUT)
    print("日记数 :", len(notes))
    print("总字符 :", sum(len(x["content"]) for x in notes))
    print("文件大小: %.1f KB" % (os.path.getsize(OUT) / 1024.0))


if __name__ == "__main__":
    main()