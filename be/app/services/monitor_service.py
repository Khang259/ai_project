from app.core.database import get_collection
from app.schemas.monitor import MonitorRequest, MonitorOut
from typing import List
from datetime import datetime
from bson import ObjectId
from pymongo import UpdateOne


async def save_monitors_with_bulk(items: List[MonitorRequest]) -> dict:
    """
    Upsert danh sách monitors trong 1 lần gọi database duy nhất:
    - Filter: date (chuẩn hóa 00:00:00) + product_name
    - $set: production_order, target_quantity, category_name, updated_at
    - $setOnInsert: produced_quantity=0, status='pending', created_at, date
    - upsert=True
    - Không ghi đè produced_quantity, status khi record đã tồn tại
    """
    col = get_collection("monitor")
    if not items:
        return {"total": 0, "matched": 0, "inserted": 0, "message": "No data"}

    ops = []
    now = datetime.utcnow()

    for it in items:
        normalized_date = datetime(it.date.year, it.date.month, it.date.day, 0, 0, 0, 0)
        filter_query = {
            "date": normalized_date,
            "product_name": it.product_name,
        }

        # Update pipeline: chỉ cập nhật target_quantity & updated_at khi thay đổi
        update_pipeline = [
            {
                "$set": {
                    # luôn đồng bộ các trường không ảnh hưởng sản xuất hiện tại
                    "production_order": it.production_order,
                    "category_name": it.category_name,

                    # target_quantity: chỉ thay đổi khi khác
                    "target_quantity": {
                        "$cond": [
                            {"$ne": ["$target_quantity", it.target_quantity]},
                            it.target_quantity,
                            "$target_quantity",
                        ]
                    },

                    # updated_at: chỉ đổi khi target_quantity thay đổi
                    "updated_at": {
                        "$cond": [
                            {"$ne": ["$target_quantity", it.target_quantity]},
                            now,
                            "$updated_at",
                        ]
                    },

                    # các giá trị mặc định khi insert (hoặc khi trường đang null)
                    "produced_quantity": {"$ifNull": ["$produced_quantity", 0]},
                    "status": {"$ifNull": ["$status", "pending"]},
                    "created_at": {"$ifNull": ["$created_at", now]},
                    "date": {"$ifNull": ["$date", normalized_date]},
                }
            }
        ]

        ops.append(UpdateOne(filter=filter_query, update=update_pipeline, upsert=True))

    result = await col.bulk_write(ops, ordered=False)

    inserted_count = getattr(result, "upserted_count", None)
    if inserted_count is None:
        upserted_ids = getattr(result, "upserted_ids", {}) or {}
        inserted_count = len(upserted_ids)

    return {
        "total": len(items),
        "matched": result.matched_count,
        "inserted": inserted_count,
        "message": f"Processed {len(items)} items: {result.matched_count} updated, {inserted_count} inserted",
    }


async def get_monitor(date: datetime) -> List[MonitorOut]:
    """Chỉ nhận tham số date (ngày-tháng-năm), trả về danh sách theo ngày đó bằng equality query."""
    col = get_collection("monitor")
    # Chuẩn hóa về 00:00:00 giống logic upsert
    start_of_day = datetime(date.year, date.month, date.day, 0, 0, 0)

    # Equality query nhanh và đơn giản hơn
    cursor = col.find({"date": start_of_day}).sort("production_order", 1)
    docs = await cursor.to_list(length=None)
    return [MonitorOut(**d, id=str(d["_id"])) for d in docs]


