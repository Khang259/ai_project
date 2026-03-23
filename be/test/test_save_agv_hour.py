"""
Script phân tích hoạt động AGV 15 trong ngày (từ 5h đến 24h).
- Lấy dữ liệu từ bảng agv_data.
- Tính tổng thời gian Idle, InTask theo từng giờ (5h–24h).
- Tính tổng Idle, InTask và % InTask trên tổng thời gian.

Chạy từ thư mục be: python -m test.test_save_agv_hour
Hoặc: cd test && python test_save_agv_hour.py (sau khi đã set PYTHONPATH hoặc sys.path).
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta, time

# Thêm root project vào path để import app
BE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BE_DIR not in sys.path:
    sys.path.insert(0, BE_DIR)

from app.core.database import connect_to_mongo, close_mongo_connection, get_collection
from app.core.config import settings


def _parse_created_at(created_at):
    """Chuyển created_at (datetime hoặc str) thành datetime."""
    if created_at is None:
        return None
    if hasattr(created_at, "year"):
        return created_at
    if isinstance(created_at, str):
        try:
            if "T" in created_at:
                return datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            return datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S")
        except Exception:
            return None
    return None


async def run_agv15_report(target_date=None, device_filter="MS-15"):
    """
    Báo cáo AGV 15 (hoặc device_code/device_name chứa device_filter) cho một ngày.
    target_date: datetime.date hoặc None (mặc định = ngày hôm qua).
    device_filter: "15" để lấy AGV 15 (khớp device_code hoặc device_name chứa "15").
    """
    agv_collection = get_collection("agv_data")

    # Ngày đích: mặc định là hôm qua
    if target_date is None:
        target_date = (datetime.now() - timedelta(days=1)).date()
    if hasattr(target_date, "date"):
        target_date = target_date.date()

    day_start = datetime.combine(target_date, time(5, 0, 0))   # 5h sáng
    day_end = datetime.combine(target_date, time(0, 0, 0)) + timedelta(days=1)  # 0h ngày sau (24h)
    date_str = target_date.strftime("%Y-%m-%d")

    # Lọc theo device: AGV 15 (device_code hoặc device_name chứa "15")
    query = {
        "created_at": {"$gte": day_start, "$lt": day_end},
        "state": {"$in": ["InTask", "Idle"]},
        "$or": [
            {"device_code": {"$regex": f".*{device_filter}.*"}},
            {"device_name": {"$regex": f".*{device_filter}.*"}},
        ],
    }

    cursor = agv_collection.find(
        query,
        {"device_code": 1, "device_name": 1, "state": 1, "created_at": 1},
    ).sort("created_at", 1)

    rows = await cursor.to_list(length=None)

    if not rows:
        print(f"[AGV {device_filter}] Không có dữ liệu trong bảng agv_data cho ngày {date_str} (5h–24h).")
        return

    # Chuẩn hóa và sắp xếp theo thời gian
    recs = []
    for r in rows:
        ts = _parse_created_at(r.get("created_at"))
        if ts is None:
            continue
        recs.append({
            "device_code": r.get("device_code"),
            "device_name": r.get("device_name"),
            "state": r.get("state"),
            "created_at": ts,
        })
    recs.sort(key=lambda x: x["created_at"])

    device_code = recs[0]["device_code"]
    device_name = recs[0]["device_name"]
    # Cửa sổ tính: từ bản ghi đầu tiên đến 24h
    window_start = recs[0]["created_at"]
    window_end = day_end

    # Khung giờ từ 5 đến 24 (5h, 6h, ..., 23h, 24h = 23:00–00:00)
    hourly_idle_sec = {h: 0.0 for h in range(5, 24)}   # 5..23
    hourly_intask_sec = {h: 0.0 for h in range(5, 24)}

    idle_sec_total = 0.0
    intask_sec_total = 0.0

    for i, rec in enumerate(recs):
        seg_start = rec["created_at"]
        seg_end = recs[i + 1]["created_at"] if i + 1 < len(recs) else window_end
        effective_start = max(seg_start, window_start)
        effective_end = min(seg_end, window_end)
        duration_sec = (effective_end - effective_start).total_seconds()
        if duration_sec <= 0:
            continue

        state = rec.get("state")
        if state == "Idle":
            idle_sec_total += duration_sec
        elif state == "InTask":
            intask_sec_total += duration_sec

        # Phân bổ duration vào từng giờ (5–23): mỗi segment cắt theo từng giờ
        t = effective_start
        end_seg = effective_end
        while t < end_seg:
            if t.hour < 5:
                # Nhảy tới 5h nếu đang trước 5h (trường hợp window_start < 5h)
                t = t.replace(hour=5, minute=0, second=0, microsecond=0)
                if t >= end_seg:
                    break
            end_of_hour = (t.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1))
            end_of_hour = min(end_of_hour, window_end)
            chunk_end = min(end_seg, end_of_hour)
            chunk_sec = (chunk_end - t).total_seconds()
            if chunk_sec > 0 and 5 <= t.hour < 24:
                h = t.hour
                if state == "Idle":
                    hourly_idle_sec[h] += chunk_sec
                elif state == "InTask":
                    hourly_intask_sec[h] += chunk_sec
            t = chunk_end

    # In báo cáo
    print("=" * 70)
    print(f"BÁO CÁO HOẠT ĐỘNG AGV 15 — Ngày {date_str} (từ 5h đến 24h)")
    print(f"Thiết bị: {device_name} (code: {device_code})")
    print("Nguồn: bảng agv_data")
    print("=" * 70)

    print("\n--- Thời gian theo từng giờ (Idle / InTask, đơn vị: phút) ---\n")
    print(f"{'Giờ':<8} {'Idle (phút)':<14} {'InTask (phút)':<16} {'Tổng (phút)':<12} {'% InTask':<10}")
    print("-" * 60)

    for h in range(5, 24):
        label = f"{h:02d}h"
        idle_min = hourly_idle_sec[h] / 60
        intask_min = hourly_intask_sec[h] / 60
        total_min = idle_min + intask_min
        pct = (intask_min / total_min * 100) if total_min > 0 else 0
        print(f"{label:<8} {idle_min:>10.2f}     {intask_min:>10.2f}       {total_min:>8.2f}     {pct:>6.2f}%")
    # 24h = khung 23:00–24:00 (dữ liệu nằm ở bucket giờ 23)
    print(f"{'24h':<8} {hourly_idle_sec[23]/60:>10.2f}     {hourly_intask_sec[23]/60:>10.2f}       {(hourly_idle_sec[23]+hourly_intask_sec[23])/60:>8.2f}     {(hourly_intask_sec[23]/(hourly_idle_sec[23]+hourly_intask_sec[23])*100) if (hourly_idle_sec[23]+hourly_intask_sec[23]) > 0 else 0:>6.2f}%")

    TOTAL_REF_SEC = 53400  # Mẫu cố định cho % InTask
    total_sec = idle_sec_total + intask_sec_total
    total_min = total_sec / 60
    idle_min = idle_sec_total / 60
    intask_min = intask_sec_total / 60
    pct_intask = (intask_sec_total / TOTAL_REF_SEC * 100) if TOTAL_REF_SEC > 0 else 0

    print("-" * 60)
    print("\n--- TỔNG KẾT (từ bản ghi đầu tiên trong ngày đến 24h) ---\n")
    print(f"  Tổng thời gian Idle:   {idle_min:.2f} phút  ({idle_sec_total:.0f} giây)")
    print(f"  Tổng thời gian InTask: {intask_min:.2f} phút  ({intask_sec_total:.0f} giây)")
    print(f"  Tổng thời gian:        {total_min:.2f} phút  ({total_sec:.0f} giây)")
    print(f"  % InTask / 53400s:     {pct_intask:.2f}%")
    print("\n" + "=" * 70)


async def main():
    # Kết nối DB
    await connect_to_mongo(settings.mongo_url, settings.mongo_db)
    try:
        # Mặc định: ngày hôm qua, AGV 15 (device_code hoặc device_name chứa "15")
        await run_agv15_report(
            target_date=datetime.now() - timedelta(days=1),
            device_filter="MS-20",
        )
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
