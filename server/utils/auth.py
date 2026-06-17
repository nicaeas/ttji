# server/utils/auth.py
import uuid
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, Request
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS


async def require_user(request: Request) -> str:
    """从 Authorization header 提取用户 ID"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "未登录")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(401, "登录过期")


def create_token(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )


def gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:16]}"
