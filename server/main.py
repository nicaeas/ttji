# server/main.py — 天天记 API 服务
import os
import json
import httpx
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from config import (
    UPLOAD_IMAGES_DIR, UPLOAD_MOODS_DIR, WECHAT_APPID, WECHAT_SECRET,
    SHARE_EXPIRE_SECONDS, CLOUD_SYNC_EXPIRE_SECONDS
)
from models.database import get_db, init_db
from utils.auth import require_user, create_token, gen_id
from utils.image_utils import compress_image

app = FastAPI(title="天天记 API", version="1.1.0")

# 静态文件：图片访问
app.mount("/static/images", StaticFiles(directory=UPLOAD_IMAGES_DIR), name="images")
app.mount("/static/moods", StaticFiles(directory=UPLOAD_MOODS_DIR), name="moods")


# ── 启动时初始化数据库 ──
@app.on_event("startup")
async def startup():
    await init_db()


# ═══════════════════════════════════════════
#  认证
# ═══════════════════════════════════════════

@app.post("/api/v1/auth/login")
async def login(code: str = Form(...)):
    """微信登录：code → openid → 注册/登录 → 返回 JWT"""
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://api.weixin.qq.com/sns/jscode2session", params={
            "appid": WECHAT_APPID,
            "secret": WECHAT_SECRET,
            "js_code": code,
            "grant_type": "authorization_code",
        })
        data = resp.json()

    openid = data.get("openid")
    if not openid:
        raise HTTPException(400, f"登录失败: {data.get('errmsg', 'unknown')}")

    db = await get_db()
    try:
        row = await db.execute_fetchall("SELECT id FROM users WHERE openid = ?", (openid,))
        if row:
            user_id = row[0]["id"]
        else:
            user_id = gen_id("u")
            await db.execute("INSERT INTO users (id, openid) VALUES (?, ?)", (user_id, openid))
            await db.commit()
    finally:
        await db.close()

    token = create_token(user_id)
    return {"access_token": token, "user_id": user_id}


# ═══════════════════════════════════════════
#  图片上传
# ═══════════════════════════════════════════

@app.post("/api/v1/upload/image")
async def upload_image(file: UploadFile = File(...)):
    """上传图片 → 压缩 WebP → 返回 thumbUrl + fullUrl（无需登录）"""
    file_id = gen_id("img")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "jpg"
    tmp_path = os.path.join(UPLOAD_IMAGES_DIR, f"tmp_{file_id}.{ext}")
    with open(tmp_path, "wb") as f:
        f.write(await file.read())

    try:
        result = compress_image(tmp_path, file_id)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    base = "/static/images"
    return {
        "thumbUrl": f"{base}/{result['thumb']}",
        "fullUrl": f"{base}/{result['full']}",
    }


@app.post("/api/v1/upload/mood-icon")
async def upload_mood_icon(file: UploadFile = File(...), request: Request = None):
    """上传心情图标（不限制格式）"""
    user_id = await require_user(request)
    file_id = gen_id("mood")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "png"
    filename = f"{file_id}.{ext}"
    path = os.path.join(UPLOAD_MOODS_DIR, filename)
    with open(path, "wb") as f:
        f.write(await file.read())
    return {"iconUrl": f"/static/moods/{filename}"}


# ═══════════════════════════════════════════
#  心情管理（内置10 + 自定义）
# ═══════════════════════════════════════════

BUILTIN_MOODS = [
    {"id":"happy","emoji":"😊","label":"开心","color":"#F0C060","isCustom":False},
    {"id":"calm","emoji":"😌","label":"平静","color":"#7BA0A0","isCustom":False},
    {"id":"grateful","emoji":"🥰","label":"感恩","color":"#8BA07B","isCustom":False},
    {"id":"excited","emoji":"🤩","label":"激动","color":"#C47B6A","isCustom":False},
    {"id":"thoughtful","emoji":"🤔","label":"思考","color":"#7B8BA0","isCustom":False},
    {"id":"sad","emoji":"😢","label":"难过","color":"#8B7BA0","isCustom":False},
    {"id":"anxious","emoji":"😰","label":"焦虑","color":"#A08B7B","isCustom":False},
    {"id":"tired","emoji":"😴","label":"疲惫","color":"#9B9B8B","isCustom":False},
    {"id":"inspired","emoji":"💡","label":"灵感","color":"#A0A07B","isCustom":False},
    {"id":"love","emoji":"💕","label":"爱意","color":"#C48B9B","isCustom":False},
]


@app.get("/api/v1/moods")
async def get_moods(request: Request):
    """获取心情列表 = 内置 10 种 + 用户自定义"""
    user_id = await require_user(request)
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT id, emoji, label, color, icon_url, is_custom FROM moods WHERE user_id = ? ORDER BY created_at",
            (user_id,)
        )
        customs = [dict(r) for r in rows]
    finally:
        await db.close()
    return {"moods": BUILTIN_MOODS + customs}


@app.post("/api/v1/moods")
async def create_mood(request: Request):
    """创建自定义心情"""
    user_id = await require_user(request)
    body = await request.json()
    label = body.get("label", "").strip()
    if not label:
        raise HTTPException(400, "请输入心情名称")
    db = await get_db()
    try:
        mood_id = gen_id("m")
        await db.execute(
            "INSERT INTO moods (id, user_id, emoji, label, color, icon_url, is_custom) VALUES (?,?,?,?,?,?,1)",
            (mood_id, user_id, body.get("emoji", "❤️"), label, body.get("color", "#8B7355"), body.get("iconUrl", ""))
        )
        await db.commit()
    finally:
        await db.close()
    return {"id": mood_id, "label": label}


@app.delete("/api/v1/moods/{mood_id}")
async def delete_mood(mood_id: str, request: Request):
    user_id = await require_user(request)
    db = await get_db()
    try:
        await db.execute("DELETE FROM moods WHERE id = ? AND user_id = ?", (mood_id, user_id))
        await db.commit()
    finally:
        await db.close()
    return {"ok": True}


# ═══════════════════════════════════════════
#  日记云同步（增量）
# ═══════════════════════════════════════════

@app.post("/api/v1/diaries/sync")
async def sync_diaries_upload(request: Request):
    """上传本地日记到云端（合并）"""
    user_id = await require_user(request)
    body = await request.json()
    diaries = body.get("diaries", [])
    db = await get_db()
    try:
        for d in diaries:
            await db.execute(
                """INSERT INTO diaries (id, user_id, local_id, title, content, mood, category_id, created_at, updated_at, is_deleted)
                   VALUES (?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content,
                   mood=excluded.mood, category_id=excluded.category_id, updated_at=excluded.updated_at,
                   is_deleted=excluded.is_deleted""",
                (gen_id("d"), user_id, d.get("id",""), d.get("title",""), d.get("content",""),
                 d.get("mood",""), d.get("categoryId",""),
                 d.get("createdAt", datetime.utcnow().isoformat()),
                 d.get("updatedAt", datetime.utcnow().isoformat()),
                 d.get("isDeleted", 0))
            )
        await db.commit()
    finally:
        await db.close()
    return {"synced": len(diaries)}


@app.get("/api/v1/diaries/sync")
async def sync_diaries_download(request: Request, since: str = ""):
    """下载云端日记（since 之后更新的）"""
    user_id = await require_user(request)
    db = await get_db()
    try:
        if since:
            rows = await db.execute_fetchall(
                "SELECT * FROM diaries WHERE user_id = ? AND updated_at > ? ORDER BY updated_at",
                (user_id, since)
            )
        else:
            rows = await db.execute_fetchall(
                "SELECT * FROM diaries WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at",
                (user_id,)
            )
        diaries = []
        for r in rows:
            diaries.append({
                "id": r["local_id"] or r["id"],
                "title": r["title"], "content": r["content"],
                "mood": r["mood"], "categoryId": r["category_id"],
                "createdAt": r["created_at"], "updatedAt": r["updated_at"],
                "isDeleted": bool(r["is_deleted"])
            })
    finally:
        await db.close()
    return {"diaries": diaries}


# ═══════════════════════════════════════════
#  分享（单篇 + 批量）
# ═══════════════════════════════════════════

@app.post("/api/v1/diaries/share")
async def create_share(request: Request):
    """创建分享链接（支持单篇或批量：diaryIds[] 或 diaryId）"""
    user_id = await require_user(request)
    body = await request.json()
    diary_ids = body.get("diaryIds") or [body.get("diaryId")]
    if not diary_ids:
        raise HTTPException(400, "请选择要分享的日记")

    db = await get_db()
    try:
        shares = []
        for did in diary_ids:
            # 查本地存储的日记（优先本地，其次云端）
            row = await db.execute_fetchall(
                "SELECT * FROM diaries WHERE (local_id = ? OR id = ?) AND user_id = ? AND is_deleted = 0",
                (did, did, user_id)
            )
            diary = row[0] if row else None
            title = diary["title"] if diary else "分享的日记"
            content = diary["content"][:2000] if diary else ""
            mood = diary["mood"] if diary else ""

            share_id = gen_id("sh")
            expires = (datetime.utcnow() + timedelta(seconds=SHARE_EXPIRE_SECONDS)).isoformat()
            await db.execute(
                "INSERT INTO shares (id, diary_id, user_id, title, content, mood, expires_at) VALUES (?,?,?,?,?,?,?)",
                (share_id, diary["local_id"] or diary["id"] if diary else did,
                 user_id, title, content, mood, expires)
            )
            shares.append({"shareId": share_id, "title": title, "expiresAt": expires})
        await db.commit()
    finally:
        await db.close()
    return {"shares": shares}


@app.get("/api/v1/share/{share_id}")
async def get_share(share_id: str):
    """获取分享内容（公开，无需登录）"""
    db = await get_db()
    try:
        row = await db.execute_fetchall("SELECT * FROM shares WHERE id = ?", (share_id,))
        if not row:
            raise HTTPException(404, "分享不存在或已过期")
        share = dict(row[0])
        if datetime.fromisoformat(share["expires_at"]) < datetime.utcnow():
            raise HTTPException(404, "分享已过期")

        return {
            "title": share["title"],
            "content": share["content"],
            "mood": share["mood"],
            "createdAt": share["created_at"],
        }
    finally:
        await db.close()


# ═══════════════════════════════════════════
#  云同步权益
# ═══════════════════════════════════════════

@app.get("/api/v1/user/cloud-status")
async def cloud_status(request: Request):
    """查询云同步权益状态"""
    user_id = await require_user(request)
    db = await get_db()
    try:
        row = await db.execute_fetchall("SELECT cloud_sync_expires FROM users WHERE id = ?", (user_id,))
        expires = row[0]["cloud_sync_expires"] if row else None
        active = False
        if expires:
            active = datetime.fromisoformat(expires) > datetime.utcnow()
    finally:
        await db.close()
    return {"active": active, "expiresAt": expires}


@app.post("/api/v1/user/activate-cloud")
async def activate_cloud(request: Request):
    """激活/续期云同步（广告回调验证后调用）"""
    user_id = await require_user(request)
    expires = (datetime.utcnow() + timedelta(seconds=CLOUD_SYNC_EXPIRE_SECONDS)).isoformat()
    db = await get_db()
    try:
        await db.execute("UPDATE users SET cloud_sync_expires = ? WHERE id = ?", (expires, user_id))
        await db.commit()
    finally:
        await db.close()
    return {"active": True, "expiresAt": expires}


# ── 清理过期分享（定时任务，每天执行一次即可） ──
@app.post("/api/v1/cron/cleanup")
async def cleanup_shares():
    db = await get_db()
    try:
        await db.execute("DELETE FROM shares WHERE expires_at < datetime('now')")
        await db.commit()
    finally:
        await db.close()
    return {"ok": True}
