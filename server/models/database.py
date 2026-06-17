# server/models/database.py
import aiosqlite
from config import DATABASE_PATH

async def get_db():
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db

async def init_db():
    db = await get_db()
    try:
        await db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            openid TEXT UNIQUE NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            cloud_sync_expires TEXT
        );

        CREATE TABLE IF NOT EXISTS moods (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '',
            label TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#8B7355',
            icon_url TEXT,
            is_custom INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- 心情排序（内置 0-9, 自定义自增）
        CREATE TABLE IF NOT EXISTS mood_orders (
            user_id TEXT NOT NULL,
            mood_id TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, mood_id)
        );

        CREATE TABLE IF NOT EXISTS diaries (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            local_id TEXT,
            title TEXT DEFAULT '',
            content TEXT DEFAULT '',
            mood TEXT DEFAULT '',
            category_id TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            is_deleted INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS shares (
            id TEXT PRIMARY KEY,
            diary_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            title TEXT DEFAULT '',
            content TEXT DEFAULT '',
            mood TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL,
            FOREIGN KEY (diary_id) REFERENCES diaries(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_diaries_user ON diaries(user_id, updated_at);
        CREATE INDEX IF NOT EXISTS idx_moods_user ON moods(user_id);
        CREATE INDEX IF NOT EXISTS idx_shares_expires ON shares(expires_at);
        """)
        await db.commit()
    finally:
        await db.close()
