# server/config.py
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATABASE_PATH = os.path.join(BASE_DIR, "data.db")
UPLOAD_IMAGES_DIR = os.path.join(BASE_DIR, "uploads", "images")
UPLOAD_MOODS_DIR = os.path.join(BASE_DIR, "uploads", "moods")

# 微信小程序配置
WECHAT_APPID = os.getenv("WECHAT_APPID", "your-appid")
WECHAT_SECRET = os.getenv("WECHAT_SECRET", "your-secret")

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "changeme-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

# 图片压缩
IMAGE_THUMB_WIDTH = 200
IMAGE_FULL_WIDTH = 750
IMAGE_QUALITY = 80

# 分享链接有效期（秒）
SHARE_EXPIRE_SECONDS = 7 * 24 * 3600

# 云同步权益有效期（秒）
CLOUD_SYNC_EXPIRE_SECONDS = 30 * 24 * 3600

os.makedirs(UPLOAD_IMAGES_DIR, exist_ok=True)
os.makedirs(UPLOAD_MOODS_DIR, exist_ok=True)
