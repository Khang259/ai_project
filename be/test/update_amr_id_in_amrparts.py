"""
Script: Tìm tất cả bản ghi trong collection amrParts có amr_id = "amr001"
       và cập nhật thành amr_id = "MS-08".

Chạy từ thư mục Server/be:
  python test/update_amr_id_in_amrparts.py

Hoặc từ thư mục test:
  python update_amr_id_in_amrparts.py
  (cần chạy từ be để load được app.*)
"""

import asyncio
import sys
import os

# Thêm thư mục be vào path để import app
BE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BE_DIR not in sys.path:
    sys.path.insert(0, BE_DIR)

# Cho phép chạy từ be hoặc từ test
os.chdir(BE_DIR)

from app.core.database import connect_to_mongo, get_collection, close_mongo_connection
from app.core.config import settings


OLD_AMR_ID = "MS-51"
NEW_AMR_ID = "VHL1"
COLLECTION_NAME = "amrParts"


async def main():
    print(f"[*] Kết nối MongoDB: {settings.mongo_db}")
    await connect_to_mongo(settings.mongo_url, settings.mongo_db)

    try:
        coll = get_collection(COLLECTION_NAME)

        # Đếm số bản ghi trước khi đổi
        count_before = await coll.count_documents({"amr_id": OLD_AMR_ID})
        print(f"[*] Số bản ghi có amr_id = '{OLD_AMR_ID}': {count_before}")

        if count_before == 0:
            print("[!] Không có bản ghi nào để cập nhật. Thoát.")
            return

        # Cập nhật tất cả bản ghi amr_id "amr001" -> "MS-08"
        result = await coll.update_many(
            {"amr_id": OLD_AMR_ID},
            {"$set": {"amr_id": NEW_AMR_ID}}
        )

        print(f"[+] Đã cập nhật: matched_count = {result.matched_count}, modified_count = {result.modified_count}")

        # Kiểm tra sau khi đổi
        count_after_old = await coll.count_documents({"amr_id": OLD_AMR_ID})
        count_after_new = await coll.count_documents({"amr_id": NEW_AMR_ID})
        print(f"[*] Sau khi chạy: amr_id '{OLD_AMR_ID}' còn {count_after_old} bản ghi, amr_id '{NEW_AMR_ID}' có {count_after_new} bản ghi.")

    finally:
        await close_mongo_connection()
        print("[*] Đã đóng kết nối MongoDB.")


if __name__ == "__main__":
    asyncio.run(main())
