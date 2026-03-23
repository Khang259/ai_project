"""
Script: Xóa tất cả bản ghi trong collection amrParts có amr_id từ amr055 đến amr080.

Chạy từ thư mục Server/be:
  python test/delete_amr_range_amrparts.py
"""

import asyncio
import sys
import os

BE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BE_DIR not in sys.path:
    sys.path.insert(0, BE_DIR)

os.chdir(BE_DIR)

from app.core.database import connect_to_mongo, get_collection, close_mongo_connection
from app.core.config import settings


COLLECTION_NAME = "amrParts"
DELETE_START = 55   # amr055
DELETE_END = 80     # amr080 (inclusive)


async def main():
    amr_ids_to_delete = [f"amr{i:03d}" for i in range(DELETE_START, DELETE_END + 1)]
    print(f"[*] Sẽ xóa tất cả bản ghi có amr_id trong: amr{DELETE_START:03d} .. amr{DELETE_END:03d} ({len(amr_ids_to_delete)} id)")
    print()

    await connect_to_mongo(settings.mongo_url, settings.mongo_db)

    try:
        coll = get_collection(COLLECTION_NAME)

        count_before = await coll.count_documents({"amr_id": {"$in": amr_ids_to_delete}})
        print(f"[*] Số bản ghi sẽ bị xóa: {count_before}")

        if count_before == 0:
            print("[!] Không có bản ghi nào trong khoảng này. Thoát.")
            return

        result = await coll.delete_many({"amr_id": {"$in": amr_ids_to_delete}})
        print(f"[+] Đã xóa: deleted_count = {result.deleted_count}")

        count_after = await coll.count_documents({"amr_id": {"$in": amr_ids_to_delete}})
        print(f"[*] Sau khi chạy: còn {count_after} bản ghi trong khoảng amr055..amr080.")

    finally:
        await close_mongo_connection()
        print("[*] Đã đóng kết nối MongoDB.")


if __name__ == "__main__":
    asyncio.run(main())
