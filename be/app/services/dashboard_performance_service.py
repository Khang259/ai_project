from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any
from app.core.database import get_collection
from fastapi import HTTPException
from shared.logging import get_logger

logger = get_logger(__name__)


async def get_performance_dashboard(group_id: str) -> List[Dict[str, Any]]:
    """
    Hàm xử lý logic cho biểu đồ hiệu suất theo cột theo group_id.
    
    Args:
        group_id: ID của group để lấy danh sách AMR
    
    Returns:
        List các dict với format: [{"date": "2025-01-15", "InTask_percentage": 77.78}, ...]
    """
    try:
        # Quy định time_ranges cố định: 7-12 và 13-17
        time_ranges = [
            (time(7), time(12)),
            (time(13), time(17))
        ]
        
        # 1. Lấy danh sách device_code từ routes collection
        route_collection = get_collection("routes")
        route_doc = await route_collection.find_one(
            {"group_id": group_id}, 
            {"robot_list": 1, "_id": 0}
        )
        
        amr_device_code_list = None
        if route_doc and "robot_list" in route_doc:
            amr_device_code_list = route_doc["robot_list"]
        
        # 2. Tính khoảng thời gian: 8 ngày trước đến hôm qua
        today = datetime.now().date()
        start_date = today - timedelta(days=8)  # 8 ngày trước
        end_date = today - timedelta(days=1)     # Hôm qua
        
        # 3. Query dữ liệu từ durations collection
        duration_collection = get_collection("durations")
        
        # Tạo match condition cho query
        match_conditions = {
            # Lọc theo state: chỉ lấy InTask và Idle
            "state": {"$in": ["InTask", "Idle"]},
            # Lọc theo ngày: startTime hoặc endTime nằm trong khoảng ngày
            "$or": [
                {
                    "startTime": {
                        "$gte": datetime.combine(start_date, time.min),
                        "$lt": datetime.combine(end_date + timedelta(days=1), time.min)
                    }
                },
                {
                    "endTime": {
                        "$gte": datetime.combine(start_date, time.min),
                        "$lt": datetime.combine(end_date + timedelta(days=1), time.min)
                    }
                }
            ]
        }
        
        # Thêm filter deviceCode nếu có (lưu ý: dùng deviceCode, không phải device_code)
        if amr_device_code_list:
            match_conditions["deviceCode"] = {"$in": amr_device_code_list}
        
        # Query tất cả records trong khoảng thời gian
        cursor = duration_collection.find(match_conditions)
        all_duration_records = await cursor.to_list(length=None)
        
        # 4. Xử lý và nhóm dữ liệu theo ngày và state
        # Dictionary để lưu: {date: {"InTask": total_seconds, "Idle": total_seconds}}
        daily_stats: Dict[str, Dict[str, int]] = {}
        
        for record in all_duration_records:
            start_time = record.get("startTime")
            end_time = record.get("endTime")
            state = record.get("state")
            
            # Validate dữ liệu
            if not start_time or not end_time or not state:
                continue
            
            # Chỉ xử lý InTask và Idle
            if state not in ["InTask", "Idle"]:
                continue
            
            # startTime và endTime từ MongoDB đã là datetime object
            # Chỉ cần đảm bảo là datetime
            if not isinstance(start_time, datetime):
                # Nếu là string, parse lại
                if isinstance(start_time, str):
                    start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                else:
                    continue
            
            if not isinstance(end_time, datetime):
                # Nếu là string, parse lại
                if isinstance(end_time, str):
                    end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                else:
                    continue
            
            # Xử lý từng ngày mà record trải qua
            current_date = start_time.date()
            end_date_record = end_time.date()
            
            while current_date <= end_date_record and current_date <= end_date:
                if current_date < start_date:
                    current_date += timedelta(days=1)
                    continue
                
                # Tính phần duration trong ngày hiện tại
                day_start = datetime.combine(current_date, time.min)
                day_end = datetime.combine(current_date, time.max) + timedelta(seconds=86399)
                
                # Phần record nằm trong ngày hiện tại
                record_start_in_day = max(start_time, day_start)
                record_end_in_day = min(end_time, day_end)
                
                if record_start_in_day < record_end_in_day:
                    # Tính duration trong khoảng giờ (7-12 và 13-17)
                    # Logic tính phần duration nằm trong time_ranges
                    total_seconds = 0
                    for time_start, time_end in time_ranges:
                        # Tạo datetime cho khoảng giờ trong ngày target_date
                        range_start = datetime.combine(current_date, time_start)
                        range_end = datetime.combine(current_date, time_end)
                        
                        # Tính phần giao nhau giữa [record_start_in_day, record_end_in_day] và [range_start, range_end]
                        overlap_start = max(record_start_in_day, range_start)
                        overlap_end = min(record_end_in_day, range_end)
                        
                        # Nếu có phần giao nhau
                        if overlap_start < overlap_end:
                            overlap_seconds = int((overlap_end - overlap_start).total_seconds())
                            total_seconds += overlap_seconds
                    
                    duration_seconds = total_seconds
                    
                    # Cộng dồn vào daily_stats
                    date_str = current_date.strftime("%Y-%m-%d")
                    if date_str not in daily_stats:
                        daily_stats[date_str] = {"InTask": 0, "Idle": 0}
                    
                    daily_stats[date_str][state] += duration_seconds
                
                current_date += timedelta(days=1)
        
        # 5. Tính InTask_percentage cho mỗi ngày
        performance_data = []
        
        # Tạo danh sách tất cả các ngày trong khoảng thời gian
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Lấy stats cho ngày này
            stats = daily_stats.get(date_str, {"InTask": 0, "Idle": 0})
            in_task_duration = stats["InTask"]
            idle_duration = stats["Idle"]
            total_duration = in_task_duration + idle_duration
            
            # Tính phần trăm
            if total_duration > 0:
                in_task_percentage = round((in_task_duration / total_duration) * 100, 2)
            else:
                in_task_percentage = 0.0
            
            performance_data.append({
                "date": date_str,
                "InTask_percentage": in_task_percentage
            })
            
            current_date += timedelta(days=1)
        
        # Sắp xếp theo ngày
        performance_data.sort(key=lambda x: x["date"])
        
        return performance_data
        
    except Exception as e:
        logger.error(f"Error in get_performance_dashboard: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))