# server/utils/image_utils.py
import os
from PIL import Image
from config import IMAGE_THUMB_WIDTH, IMAGE_FULL_WIDTH, IMAGE_QUALITY, UPLOAD_IMAGES_DIR


def compress_image(input_path: str, file_id: str) -> dict:
    """
    压缩图片并生成缩略图 + 全尺寸 WebP。
    返回 {"thumb": "thumb_xxx.webp", "full": "full_xxx.webp"}
    """
    img = Image.open(input_path).convert("RGB")
    w, h = img.size

    # 全尺寸（750px 宽，等比缩放）
    full = img.copy()
    if w > IMAGE_FULL_WIDTH:
        ratio = IMAGE_FULL_WIDTH / w
        full = full.resize((IMAGE_FULL_WIDTH, int(h * ratio)), Image.LANCZOS)

    # 缩略图（200px 宽）
    thumb = img.copy()
    if w > IMAGE_THUMB_WIDTH:
        ratio = IMAGE_THUMB_WIDTH / w
        thumb = thumb.resize((IMAGE_THUMB_WIDTH, int(h * ratio)), Image.LANCZOS)

    thumb_name = f"thumb_{file_id}.webp"
    full_name = f"full_{file_id}.webp"
    thumb.save(os.path.join(UPLOAD_IMAGES_DIR, thumb_name), "WEBP", quality=IMAGE_QUALITY)
    full.save(os.path.join(UPLOAD_IMAGES_DIR, full_name), "WEBP", quality=IMAGE_QUALITY)

    return {"thumb": thumb_name, "full": full_name}
