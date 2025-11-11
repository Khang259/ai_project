from app.core.database import get_collection
from app.schemas.monitor import MonitorRequest, MonitorOut
from typing import List
from datetime import datetime
from bson import ObjectId
from pymongo import UpdateOne
from app.api.agv_websocket import broadcast_monitor_data
# ===== CONSTANTS - Business rules cho mapping node_end -> category =====
FRAME_NODES = {56789,789} 
TANK_NODES = {6789}   


async def save_monitors_with_bulk(items: List[MonitorRequest]) -> dict:
    col = get_collection("monitor")
    if not items:
        return {"total": 0, "deleted": 0, "inserted": 0, "message": "No data"}

    now = datetime.utcnow()

    # Gom các ngày chuẩn hóa (00:00:00) xuất hiện trong batch
    date_set = set()
    docs = []
    for it in items:
        normalized_date = datetime(it.date.year, it.date.month, it.date.day, 0, 0, 0, 0)
        date_set.add(normalized_date)

        docs.append({
            "date": normalized_date,
            "category_name": it.category_name,
            "product_name": it.product_name,
            "production_order": it.production_order,
            "target_quantity": it.target_quantity,
            "produced_quantity": 0,
            "status": "in_progress" if it.production_order == 1 else "pending",
            "created_at": now,
        })

    # Xóa tất cả record của các ngày có trong batch
    deleted_total = 0
    for d in date_set:
        res = await col.delete_many({"date": d})
        deleted_total += res.deleted_count or 0

    # Thêm mới toàn bộ batch
    result = await col.insert_many(docs, ordered=False)
    inserted = len(result.inserted_ids)

    return {
        "total": len(items),
        "deleted": deleted_total,
        "inserted": inserted,
        "message": f"Replaced {deleted_total} old docs; inserted {inserted} new docs for {len(date_set)} day(s).",
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


async def increment_produced_quantity_by_node_end(node_end: int) -> None:
    if node_end in FRAME_NODES:
        category_name = "frame"
    elif node_end in TANK_NODES:
        category_name = "tank"
    else:
        return
    
    col = get_collection("monitor")
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    current_doc = await col.find_one(
        {
            "date": today,
            "category_name": category_name,
            "status": "in_progress"
        }
    )
    
    if not current_doc:
        return
    
    current_produced = current_doc.get("produced_quantity", 0)
    new_produced_quantity = current_produced + 1
    target_quantity = current_doc.get("target_quantity", 0)
    production_order = current_doc.get("production_order", 0)
    
    broadcast_needed = False

    if new_produced_quantity >= target_quantity:
        await col.update_one(
            {"_id": current_doc["_id"]},
            {
                "$inc": {"produced_quantity": 1},
                "$set": {"status": "completed"}
            }
        )
        broadcast_needed = True
        
        # Tìm document có production_order + 1 (cùng date, category_name)
        next_production_order = production_order + 1
        next_doc = await col.find_one(
            {
                "date": today,
                "category_name": category_name,
                "production_order": next_production_order
            }
        )
        
        if next_doc:
            # Chuyển status của document tiếp theo thành "in_progress"
            await col.update_one(
                {"_id": next_doc["_id"]},
                {"$set": {"status": "in_progress"}}
            )
    else:
        # Chưa đạt target -> chỉ tăng produced_quantity
        await col.update_one(
            {"_id": current_doc["_id"]},
            {"$inc": {"produced_quantity": 1}}
        )
        broadcast_needed = True

    if broadcast_needed:
        await broadcast_monitor_data()

