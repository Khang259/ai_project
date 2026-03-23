"""
Tool download map file từ DB: lấy trường `data` của collection maps, đóng gói thành file zip.
- Mặc định: tất cả map (mỗi area_id một file JSON trong zip).
- Có thể truyền area_id để chỉ tải một map.

Chạy từ thư mục be:
  python -m test.test_map                    # Tải tất cả map
  python -m test.test_map --area_id 2       # Chỉ tải map area_id=2
  python -m test.test_map -o ./exports      # Lưu zip vào thư mục exports
"""

import asyncio
import sys
import os
import json
import zipfile
import argparse
from datetime import datetime
from io import BytesIO

BE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BE_DIR not in sys.path:
    sys.path.insert(0, BE_DIR)

from app.core.database import connect_to_mongo, close_mongo_connection, get_collection
from app.core.config import settings


def json_serializer(obj):
    """Chuyển datetime, ObjectId, ... sang dạng có thể serialize JSON."""
    from bson import ObjectId
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, ObjectId):
        return str(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


async def download_maps_to_zip(area_id=None, output_dir=None):
    """
    Lấy document từ collection maps (theo area_id nếu có), trích trường `data`,
    ghi mỗi map thành file JSON rồi đóng gói vào một file zip.
    """
    maps_coll = get_collection("maps")
    query = {}
    if area_id is not None:
        query["area_id"] = int(area_id) if isinstance(area_id, str) and area_id.isdigit() else area_id

    cursor = maps_coll.find(query, {"area_id": 1, "data": 1})
    docs = await cursor.to_list(length=None)

    if not docs:
        print(f"[test_map] Không tìm thấy map nào (query: {query})")
        return None

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for doc in docs:
            aid = doc.get("area_id", "unknown")
            data = doc.get("data")
            if data is None:
                print(f"[test_map] Bỏ qua document area_id={aid}: không có trường 'data'")
                continue
            try:
                json_bytes = json.dumps(data, ensure_ascii=False, default=json_serializer).encode("utf-8")
            except TypeError as e:
                print(f"[test_map] Lỗi serialize JSON area_id={aid}: {e}")
                continue
            name = f"map_area_{aid}.json"
            zf.writestr(name, json_bytes)
            print(f"[test_map] Đã thêm vào zip: {name}")

    buf.seek(0)
    out_dir = output_dir or os.getcwd()
    os.makedirs(out_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    area_suffix = f"_area_{area_id}" if area_id is not None else ""
    zip_name = f"map_export{area_suffix}_{ts}.zip"
    zip_path = os.path.join(out_dir, zip_name)

    with open(zip_path, "wb") as f:
        f.write(buf.read())

    print(f"[test_map] Đã lưu file zip: {zip_path}")
    return zip_path


async def main():
    parser = argparse.ArgumentParser(description="Download map (trường data) từ DB thành file zip")
    parser.add_argument("--area_id", "-a", type=str, default=None, help="Chỉ tải map của area_id này (mặc định: tất cả)")
    parser.add_argument("--output", "-o", type=str, default=None, help="Thư mục lưu file zip (mặc định: thư mục hiện tại)")
    args = parser.parse_args()

    await connect_to_mongo(settings.mongo_url, settings.mongo_db)
    try:
        path = await download_maps_to_zip(area_id=args.area_id, output_dir=args.output)
        if path:
            print(f"[test_map] Hoàn tất. File: {path}")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
