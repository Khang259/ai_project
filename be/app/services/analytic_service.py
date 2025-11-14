from datetime import datetime, date, time, timedelta
from typing import List, Optional, Dict, Any, Tuple
from app.core.database import get_collection
from app.schemas.analytic import AMRData
from shared.logging import get_logger

logger = get_logger(__name__)


async def save_amr_data(amr_data: AMRData) -> bool:
    """Lưu dữ liệu AMR vào MongoDB theo logic status"""
    action_logs_collection = get_collection("action_logs")
    try:
        current_time = datetime.now()
        
        if amr_data.subTaskTypeId == "1" and amr_data.subTaskStatus == "2":
            # subTaskTypeId 1 và subTaskStatus 2 : Tạo record mới - bắt đầu di chuyển không tải
            data_dict = {
                "_id": f"{amr_data.orderId}_{amr_data.subTaskId}_{amr_data.deviceNum}",
                "orderId": amr_data.orderId,
                "deviceName": amr_data.deviceNum,
                "start_time_no_load": current_time,
                "activity": "start_move_no_load",
                "created_at": current_time,
                "updated_at": current_time
            }
            
            await action_logs_collection.insert_one(data_dict)
            return True
            
        elif amr_data.subTaskTypeId == "1" and amr_data.subTaskStatus == "3":
            # subTaskTypeId 1 và subTaskStatus 3 : Update record - kết thúc di chuyển không tải, bắt đầu picking
            filter_query = {
                "orderId": amr_data.orderId,
                "deviceName": amr_data.deviceNum,
                "activity": "start_move_no_load"
            }
            
            # Tìm record để tính duration
            existing_record = await action_logs_collection.find_one(filter_query)
            if not existing_record:
                logger.warning(f"Xe chua di lay hang : {amr_data.orderId}, deviceName: {amr_data.deviceNum} with subTaskTypeId 1 and subTaskStatus 2")
                return False
            
            # Tính duration_no_load
            start_time_no_load = existing_record.get("start_time_no_load")
            duration_no_load = (current_time - start_time_no_load).total_seconds() if start_time_no_load else 0
            
            update_data = {
                "$set": {
                    "end_time_no_load": current_time,
                    "duration_no_load": duration_no_load,
                    "activity": "end_move_no_load",
                    "updated_at": current_time
                }
            }
            
            result = await action_logs_collection.update_one(filter_query, update_data)
            if result.modified_count > 0:
                return True
            else:
                logger.warning(f"No record updated for orderId: {amr_data.orderId}, deviceName: {amr_data.deviceNum}")
                return False
                
        elif amr_data.subTaskTypeId == "5" and amr_data.subTaskStatus == "3":
            # subTaskTypeId 5 và subTaskStatus 3 : Update record - kết thúc di chuyển có tải, hoàn thành
            filter_query = {
                "orderId": amr_data.orderId,
                "deviceName": amr_data.deviceNum,
                "activity": "end_move_no_load"
            }
            
            # Tìm record để tính duration
            existing_record = await action_logs_collection.find_one(filter_query)
            if not existing_record:
                logger.warning(f"No existing record found for orderId: {amr_data.orderId}, deviceName: {amr_data.deviceNum} with subTaskTypeId 5 and subTaskStatus 3")
                return False
            
            # Tính duration_with_load
            end_time_no_load = existing_record.get("end_time_no_load")
            duration_with_load = (current_time - end_time_no_load).total_seconds() if end_time_no_load else 0
            
            # Tính total duration
            start_time_no_load = existing_record.get("start_time_no_load")
            total_duration = (current_time - start_time_no_load).total_seconds() if start_time_no_load else 0
            
            update_data = {
                "$set": {
                    "end_time_with_load": current_time,
                    "duration_with_load": duration_with_load,
                    "total_duration": total_duration,
                    "activity": "complete",
                    "updated_at": current_time
                }
            }
            
            result = await action_logs_collection.update_one(filter_query, update_data)
            if result.modified_count > 0:
                return True
            else:
                logger.warning(f"No record updated for orderId: {amr_data.orderId}, deviceName: {amr_data.deviceNum}")
                return False
        
        else:
            # Các status khác - có thể log hoặc xử lý theo nhu cầu
            return False
            
    except Exception as e:
        logger.error(f"Error saving AMR data: {e}")
        return False


# lấy dữ liệu load/no-load duration 
async def get_payload_per_amr(
    start_time: datetime,
    end_time: datetime,
    device_names: Optional[List[str]] = None,
    time_ranges: Optional[List[Tuple[time, time]]] = None
) -> List[Dict[str, Any]]:
    action_logs_collection = get_collection("action_logs")
    try:
        # Tạo điều kiện lọc dữ liệu
        match_stage: Dict[str, Any] = {
            "activity": "complete"
        }

        # Sử dụng trường thời gian đã chuẩn hóa để so sánh (hỗ trợ cả string và Date)
        created_at_field = "created_at_normalized"

        # Lọc theo danh sách thiết bị (dùng trường đã chuẩn hóa)
        if device_names:
            # Sẽ áp dụng sau khi $addFields tạo device_name_normalized
            match_stage["device_name_normalized"] = {"$in": device_names}

        # Lọc theo time_ranges nếu được cung cấp, ngược lại dùng khoảng thời gian tổng quát
        if time_ranges and len(time_ranges) > 0:
            # Xây dựng các khoảng datetime cụ thể theo từng ngày trong khoảng start_time -> end_time
            current_date = start_time.date()
            last_date = end_time.date()
            time_filters: List[Dict[str, Any]] = []

            while current_date <= last_date:
                for start_t, end_t in time_ranges:
                    if start_t >= end_t:
                        continue
                    window_start = datetime.combine(current_date, start_t)
                    window_end = datetime.combine(current_date, end_t)
                    # Giao với [start_time, end_time]
                    range_start = max(window_start, start_time)
                    range_end = min(window_end, end_time)
                    if range_start < range_end:
                        time_filters.append({
                            created_at_field: {"$gte": range_start, "$lte": range_end}
                        })
                current_date = current_date + timedelta(days=1)

            if not time_filters:
                return []

            if len(time_filters) == 1:
                # Chèn trực tiếp điều kiện created_at
                match_stage.update(time_filters[0])
            else:
                # Kết hợp bằng $or các khoảng thời gian trong ngày
                match_stage["$or"] = time_filters
        else:
            # Không có time_ranges -> dùng khoảng thời gian tổng quát
            match_stage[created_at_field] = {"$gte": start_time, "$lte": end_time}

        # Pipeline để tổng hợp theo từng deviceName
        pipeline = [
            # Chuẩn hóa trường created_at thành kiểu Date nếu đang là string
            {
                "$addFields": {
                    "created_at_normalized": {
                        "$cond": [
                            {"$eq": [{"$type": "$created_at"}, "string"]},
                            {"$dateFromString": {"dateString": "$created_at"}},
                            "$created_at"
                        ]
                    },
                    # Tương thích dữ liệu cũ: nếu chưa có deviceName thì dùng amrID
                    "device_name_normalized": {"$ifNull": ["$deviceName", "$amrID"]}
                }
            },
            {"$match": match_stage},
            {
                "$group": {
                    "_id": "$device_name_normalized",  # Nhóm theo device (đã chuẩn hóa)
                    "duration_with_no_load": {"$sum": {"$ifNull": ["$duration_no_load", 0]}},
                    "duration_with_load": {"$sum": {"$ifNull": ["$duration_with_load", 0]}},
                    "total_duration": {"$sum": {"$ifNull": ["$total_duration", 0]}},
                    "total_tasks": {"$sum": 1}
                }
            }
        ]

        cursor = action_logs_collection.aggregate(pipeline)
        result = await cursor.to_list(length=None)

        # Format kết quả trả về
        formatted = []
        for item in result:
            formatted.append({
                "deviceName": item["_id"],
                "duration_with_no_load": round(item.get("duration_with_no_load", 0), 2),
                "duration_with_load": round(item.get("duration_with_load", 0), 2),
                "total_duration": round(item.get("total_duration", 0), 2),
                "total_tasks": item.get("total_tasks", 0),
                "time_range": {
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat()
                }
            })
        return formatted

    except Exception as e:
        logger.error(f"Error getting total duration per AMR: {e}")
        return []


async def get_payload_summary(
    start_time: datetime,
    end_time: datetime,
    device_names: Optional[List[str]] = None,
    time_ranges: Optional[List[Tuple[time, time]]] = None
) -> Dict[str, Any]:
    """Lấy tổng hợp duration load/no-load không phân theo AMR
    Sử dụng get_payload_per_amr và cộng dồn kết quả"""
    try:
        # Gọi hàm theo từng AMR, có áp dụng time_ranges nếu có
        per_amr_results = await get_payload_per_amr(
            start_time=start_time,
            end_time=end_time,
            device_names=device_names,
            time_ranges=time_ranges
        )

        if not per_amr_results:
            # Trả về kết quả mặc định nếu không có dữ liệu
            return {
                "total_duration_with_no_load": 0.0,
                "total_duration_with_load": 0.0,
                "total_duration": 0.0,
                "total_tasks": 0,
                "unique_amrs_count": 0,
                "time_range": {
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat()
                }
            }

        # Cộng dồn tất cả kết quả từ các AMR
        total_duration_with_no_load = 0.0
        total_duration_with_load = 0.0
        total_duration = 0.0
        total_tasks = 0
        unique_devices = set()

        for item in per_amr_results:
            total_duration_with_no_load += item.get("duration_with_no_load", 0)
            total_duration_with_load += item.get("duration_with_load", 0)
            total_duration += item.get("total_duration", 0)
            total_tasks += item.get("total_tasks", 0)
            unique_devices.add(item.get("deviceName"))

        return {
            "total_duration_with_no_load": round(total_duration_with_no_load, 2),
            "total_duration_with_load": round(total_duration_with_load, 2),
            "total_duration": round(total_duration, 2),
            "total_tasks": total_tasks,
            "unique_devices_count": len(unique_devices),
            "time_range": {
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Error getting aggregated total duration: {e}")
        return {
            "total_duration_with_no_load": 0.0,
            "total_duration_with_load": 0.0,
            "total_duration": 0.0,
            "total_tasks": 0,
            "unique_amrs_count": 0,
            "time_range": {
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            }
        }


# Tổng hợp duration theo từng state
async def handle_event(payload: List[Dict[str, Any]]) -> bool:
    """Xử lý sự kiện mới cho nhiều thiết bị."""
    active_col = get_collection("active_state")
    durations_col = get_collection("durations")
    try:
        now = datetime.now()

        for device in payload:
            # --- lấy thông tin cần thiết ---
            device_name: Optional[str] = device.get("deviceName")
            if isinstance(device_name, str):
                device_name = device_name.strip()

            state: Optional[str] = device.get("state")
            if isinstance(state, str):
                state = state.strip()
            
            orderId: Optional[str] = device.get('orderId')
            if isinstance(orderId, str):
                orderId = orderId.strip()
            else:
                orderId = ""

            if not device_name or not state:
                logger.warning(f"Missing deviceName or state: deviceName={device_name}, state={state}, orderId={orderId}")
                continue  # bỏ qua thiết bị lỗi, xử lý tiếp

            # --- tìm trạng thái hiện tại ---
            current = await active_col.find_one({"deviceName": device_name})
            if current is None:
                if device.get('state') != "InCharging":
                    # chưa có bản ghi -> tạo mới
                    await active_col.update_one(
                        {"deviceName": device_name},
                        {"$set": {"deviceName": device_name, "state": state, "startTime": now, "orderId": orderId}},
                        upsert=True
                    )
                    continue
            current_state = current.get("state")
            start_time = current.get("startTime")
            current_orderId = current.get("orderId")

            # --- nếu state không đổi -> bỏ qua ---
            if current_orderId == orderId:
                continue

            # --- nếu start_time bị null -> reset ---
            if start_time is None:
                await active_col.delete_one({"deviceName": device_name})
                await active_col.update_one(
                    {"deviceName": device_name},
                    {"$set": {"deviceName": device_name, "state": state, "startTime": now, "orderId": orderId}},
                    upsert=True
                )
                continue

            if not isinstance(start_time, datetime):
                logger.error(f"start_time is not datetime for {device_name}: {start_time}")
                raise ValueError(f"Invalid start_time for device {device_name}: {start_time}")

            # --- tính duration ---
            duration_secs = int((now - start_time).total_seconds())

            duration_doc = {
                "deviceName": device_name,
                "state": current_state,
                "orderId": orderId,
                "startTime": start_time,
                "endTime": now,
                "duration": duration_secs,
            }
            await durations_col.insert_one(duration_doc)

            # --- cập nhật state mới ---
            await active_col.update_one(
                {"deviceName": device_name},
                {"$set": {"state": state, "startTime": now, "orderId": orderId}}
            )

        return True

    except Exception as e:
        logger.error(f"Error in handle_event: {str(e)}", exc_info=True)
        raise


async def get_work_status_per_amr(
    start_date: date,
    end_date: date,
    time_ranges: List[Tuple[time, time]],
    device_names: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Tổng hợp tổng duration theo state trong khoảng ngày và time ranges, có thể lọc theo thiết bị."""
    durations_col = get_collection("durations")
    
    # Validate time ranges trước khi xử lý
    valid_time_ranges = []
    for start_time, end_time in time_ranges:
        if start_time >= end_time:
            logger.warning(f"Invalid time range: {start_time} >= {end_time}, skipping")
            continue
        valid_time_ranges.append((start_time, end_time))
    
    if not valid_time_ranges:
        logger.warning("No valid time ranges provided")
        return []

    # Tạo danh sách các khoảng thời gian cần filter
    time_filters = []
    current_date = start_date
    while current_date <= end_date:
        for start_time, end_time in valid_time_ranges:
            # Tạo datetime (naive)
            start_datetime = datetime.combine(current_date, start_time)
            end_datetime = datetime.combine(current_date, end_time)
            time_filters.append({
                "$and": [
                    {"startTime": {"$gte": start_datetime, "$lt": end_datetime}},
                    {"endTime": {"$gte": start_datetime, "$lt": end_datetime}}
                ]
            })
        # Tăng ngày
        current_date = current_date + timedelta(days=1)

    # Tối ưu hóa: Nếu chỉ có 1 time range, không cần $or
    if len(time_filters) == 1:
        match: Dict[str, Any] = time_filters[0]
    else:
        # Tạo match condition với $or cho các time ranges
        match: Dict[str, Any] = {
            "$or": time_filters
        }
    
    # Thêm filter device_names nếu có (cần xử lý để tránh conflict với $or/$and)
    if device_names:
        if "$or" in match or "$and" in match:
            # Nếu có operator, wrap trong $and
            if "$and" in match:
                match["$and"].append({"deviceName": {"$in": device_names}})
            else:
                match = {
                    "$and": [
                        match,
                        {"deviceName": {"$in": device_names}}
                    ]
                }
        else:
            # Nếu không có operator, merge trực tiếp
            match["deviceName"] = {"$in": device_names}

    pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": {"deviceName": "$deviceName", "state": "$state"},
                "totalDuration": {"$sum": "$duration"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.deviceName": 1, "_id.state": 1}}
    ]

    # Thêm hint để sử dụng index nếu có
    cursor = durations_col.aggregate(pipeline)
    results = await cursor.to_list(length=None)

    # Định dạng lại output
    formatted: List[Dict[str, Any]] = []
    for item in results:
        formatted.append({
            "deviceName": item["_id"]["deviceName"],
            "state": item["_id"]["state"],
            "totalDuration": int(item.get("totalDuration", 0)),
            "count": item.get("count", 0)
        })

    return formatted


async def get_work_status_summary(
    start_date: date,
    end_date: date,
    time_ranges: List[Tuple[time, time]],
    device_names: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Tổng hợp duration cộng dồn theo từng state, áp dụng time_ranges cho mọi ngày.
    Tùy chọn lọc theo device_names trước khi group.
    Sử dụng get_work_status_per_amr và cộng dồn theo state.
    """
    # Gọi hàm get_work_status_per_amr để lấy dữ liệu
    detailed_results = await get_work_status_per_amr(
        start_date=start_date,
        end_date=end_date,
        time_ranges=time_ranges,
        device_names=device_names
    )

    # Cộng dồn theo state (không phân biệt AMR)
    state_totals: Dict[str, Dict[str, Any]] = {}
    
    for item in detailed_results:
        state = item["state"]
        duration = item["totalDuration"]
        count = item["count"]
        
        if state not in state_totals:
            state_totals[state] = {
                "state": state,
                "totalDuration": 0,
                "count": 0
            }
        
        state_totals[state]["totalDuration"] += duration
        state_totals[state]["count"] += count

    # Chuyển đổi thành list và sắp xếp theo state
    formatted = list(state_totals.values())
    formatted.sort(key=lambda x: x["state"])

    return formatted