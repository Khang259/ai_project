"""
Test get_area_efficiency_by_6d_from_hourly: kiểm tra cấu trúc và logic dữ liệu trả về.
- Gọi service, kiểm tra format giống get_area_efficiency_by_8d.
- Tính lại từ agv_hourly_work_duration (cùng logic: 6 ngày, group theo date, /890) và so sánh.

Chạy từ thư mục be: python -m test.test_efficiency_6d
Hoặc: python test/test_efficiency_6d.py (sau khi set PYTHONPATH).
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

BE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BE_DIR not in sys.path:
    sys.path.insert(0, BE_DIR)

from app.core.database import connect_to_mongo, close_mongo_connection, get_collection
from app.core.config import settings
from app.services.agv_dashboard_service import get_area_efficiency_by_6d_from_hourly

# Area test (có thể đổi theo DB của bạn)
TEST_AREA_ID = "1"

# Hằng số khớp service
TOTAL_MINUTES_PER_DAY = 890


def _expected_daily_dates():
    """6 ngày trước hôm nay: (today-6) -> (today-1)."""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = today_start.date() - timedelta(days=6)
    return [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6)]


async def compute_expected_from_db(area_id: str):
    """
    Lặp lại đúng logic trong get_area_efficiency_by_6d_from_hourly:
    query agv_hourly_work_duration, group by date (sum + count), chia sum cho count ra phút TB, rồi chia 890 ra %.
    """
    collection = get_collection("agv_hourly_work_duration")
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = today_start.date() - timedelta(days=6)
    end_date = today_start.date() - timedelta(days=1)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")

    match_filter = {
        "area_id": str(area_id),
        "date": {"$gte": start_str, "$lte": end_str},
    }
    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": "$date",
                "InTask_duration_minutes": {"$sum": "$InTask_duration_minutes"},
                "Idle_duration_minutes": {"$sum": "$Idle_duration_minutes"},
                "record_count": {"$sum": 1},
            }
        },
    ]
    cursor = collection.aggregate(pipeline)
    rows = await cursor.to_list(length=None)

    by_date = {}
    for r in rows:
        d = r["_id"]
        cnt = r.get("record_count") or 0
        sum_intask = r.get("InTask_duration_minutes") or 0
        sum_idle = r.get("Idle_duration_minutes") or 0
        by_date[d] = {
            "InTask_duration_minutes": sum_intask,
            "Idle_duration_minutes": sum_idle,
            "record_count": cnt,
        }

    daily_dates = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6)]
    result = []
    for date_str in daily_dates:
        day = by_date.get(
            date_str,
            {"InTask_duration_minutes": 0, "Idle_duration_minutes": 0, "record_count": 0},
        )
        cnt = day["record_count"]
        sum_intask = day["InTask_duration_minutes"]
        sum_idle = day["Idle_duration_minutes"]
        avg_intask = (sum_intask / cnt) if cnt > 0 else 0
        avg_idle = (sum_idle / cnt) if cnt > 0 else 0
        total = avg_intask + avg_idle
        intask_pct = round((avg_intask / TOTAL_MINUTES_PER_DAY) * 100, 2) if TOTAL_MINUTES_PER_DAY > 0 else 0
        idle_pct = round((avg_idle / TOTAL_MINUTES_PER_DAY) * 100, 2) if TOTAL_MINUTES_PER_DAY > 0 else 0
        efficiency = round(avg_intask / avg_idle, 2) if avg_idle > 0 else 0
        result.append({
            "date": date_str,
            "intask_count": round(avg_intask, 2),
            "idle_count": round(avg_idle, 2),
            "total_count": round(total, 2),
            "intask_percentage": intask_pct,
            "idle_percentage": idle_pct,
            "efficiency": efficiency,
            "record_count": cnt,
        })
    return result


def assert_structure(resp):
    """Kiểm tra cấu trúc trả về giống get_area_efficiency_by_8d."""
    assert resp.get("status") == "success", f"status phải là success, nhận: {resp.get('status')}"
    assert "area_id" in resp, "thiếu area_id"
    assert "date_range" in resp, "thiếu date_range"
    assert "data" in resp, "thiếu data"
    dr = resp["date_range"]
    assert "start" in dr and "end" in dr, "date_range phải có start, end"

    data = resp["data"]
    assert isinstance(data, list), "data phải là list"
    assert len(data) == 6, f"data phải có đúng 6 phần tử, nhận: {len(data)}"

    expected_dates = _expected_daily_dates()
    assert resp["date_range"]["start"] == expected_dates[0], "date_range.start sai"
    assert resp["date_range"]["end"] == expected_dates[-1], "date_range.end sai"

    required_keys = ("date", "intask_count", "idle_count", "total_count", "intask_percentage", "idle_percentage", "efficiency", "record_count")
    for i, row in enumerate(data):
        for k in required_keys:
            assert k in row, f"data[{i}] thiếu key: {k}"
        assert row["date"] == expected_dates[i], f"data[{i}].date sai: {row['date']} vs {expected_dates[i]}"
        assert abs(row["total_count"] - (row["intask_count"] + row["idle_count"])) < 0.01, f"data[{i}] total_count != intask + idle"
        # Logic %: phút TB / 890; cho phép sai số 0.02 do làm tròn (backend tính từ số thực, test tính từ intask_count đã round)
        exp_intask_pct = round((row["intask_count"] / TOTAL_MINUTES_PER_DAY) * 100, 2)
        exp_idle_pct = round((row["idle_count"] / TOTAL_MINUTES_PER_DAY) * 100, 2)
        assert abs(row["intask_percentage"] - exp_intask_pct) <= 0.02, f"data[{i}] intask_percentage sai: {row['intask_percentage']} vs {exp_intask_pct}"
        assert abs(row["idle_percentage"] - exp_idle_pct) <= 0.02, f"data[{i}] idle_percentage sai: {row['idle_percentage']} vs {exp_idle_pct}"
        exp_eff = round(row["intask_count"] / row["idle_count"], 2) if row["idle_count"] > 0 else 0
        assert abs(row["efficiency"] - exp_eff) <= 0.02, f"data[{i}] efficiency sai: {row['efficiency']} vs {exp_eff}"


def assert_matches_expected(service_data, expected_data, tol=0.02):
    """So sánh từng ngày: service trả về trùng với tính tay từ DB (cho phép sai số do làm tròn)."""
    assert len(service_data) == len(expected_data)
    for i, (s, e) in enumerate(zip(service_data, expected_data)):
        assert s["date"] == e["date"], f"[{i}] date khác: {s['date']} vs {e['date']}"
        assert abs(s["intask_count"] - e["intask_count"]) <= tol, f"[{i}] intask_count khác: {s['intask_count']} vs {e['intask_count']}"
        assert abs(s["idle_count"] - e["idle_count"]) <= tol, f"[{i}] idle_count khác: {s['idle_count']} vs {e['idle_count']}"
        assert abs(s["total_count"] - e["total_count"]) <= tol, f"[{i}] total_count khác"
        assert abs(s["intask_percentage"] - e["intask_percentage"]) <= tol, f"[{i}] intask_percentage khác"
        assert abs(s["idle_percentage"] - e["idle_percentage"]) <= tol, f"[{i}] idle_percentage khác"
        assert abs(s["efficiency"] - e["efficiency"]) <= tol, f"[{i}] efficiency khác"
        assert s.get("record_count") == e.get("record_count"), f"[{i}] record_count khác"


async def main():
    await connect_to_mongo(settings.mongo_url, settings.mongo_db)
    try:
        area_id = TEST_AREA_ID
        print(f"[Test] area_id = {area_id}")
        print("[Test] Gọi get_area_efficiency_by_6d_from_hourly(...)")
        resp = await get_area_efficiency_by_6d_from_hourly(area_id)

        if resp.get("status") == "error":
            print(f"[Test] Service trả lỗi: {resp.get('message')}")
            return

        print("[Test] Kiểm tra cấu trúc và logic (format + công thức 890)...")
        assert_structure(resp)

        print("[Test] Tính lại từ DB (cùng logic) và so sánh...")
        expected = await compute_expected_from_db(area_id)
        assert_matches_expected(resp["data"], expected)

        print("[Test] In dữ liệu trả về:")
        print(f"  status: {resp['status']}, area_id: {resp['area_id']}")
        print(f"  date_range: {resp['date_range']}")
        for row in resp["data"]:
            print(f"  {row['date']}: records={row.get('record_count', 'N/A')}, "
                  f"intask_avg={row['intask_count']}, idle_avg={row['idle_count']}, "
                  f"intask%={row['intask_percentage']}, idle%={row['idle_percentage']}, eff={row['efficiency']}")

        print("\n[Test] Tất cả kiểm tra đều pass.")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
