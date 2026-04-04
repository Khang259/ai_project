import collections
from datetime import datetime, timedelta, time
from app.core.database import get_collection
from shared.logging import get_logger
from typing import Optional
import httpx
from app.core.config import settings
import requests

ics_url = f"http://{settings.ics_host}:7020"
logger = get_logger("camera_ai_app")

async def save_agv_data(payload: list):
    agv_collection = get_collection("agv_data")
    saved_count = 0
    agv_data = []
    
    try:
        for record in payload:
            state = record.get("state")
            if state == "InTask" or state == "Idle":
                # Ghi dữ liệu chỉ khi trạng thái robot đang chạy hoặc đang không hoạt động
                agv_record = {
                    "task_path": record.get("taskPath"),
                    "order_id": record.get("orderId"),
                    "device_position": record.get("devicePosition"),
                    "oritation": record.get("oritation"),
                    "device_code": record.get("deviceCode"),
                    "device_position_rec": record.get("devicePostionRec"),
                    "shelf_num": record.get("shelfNumber"),
                    "device_name": record.get("deviceName"),
                    "battery": record.get("battery"),
                    "speed": record.get("speed"),
                    "state": record.get("state"),
                    "payLoad": record.get("payLoad"),
                    "created_at": datetime.now()
                }
                data = await extract_task_by_group_id(record.get("deviceName"))
                if data:
                    agv_record["area_id"] = data["area_id"]
                    agv_record["group_id"] = data["group_id"]
                    agv_record["route_id"] = data["route_id"]
                agv_data.append(agv_record)
                saved_count += 1
        
        if len(agv_data) > 0:
            await agv_collection.insert_many(agv_data)
        logger.info(f"Successfully saved {saved_count} AGV records")
        return {"status": "success", "saved_count": saved_count}

    except Exception as e:
        logger.error(f"Error saving agv data: {e}")
        return {"status": "error", "message": str(e)}


async def get_group_id(device_code):
    """Get group_id for device_code. Returns None if not found."""
    if not device_code:
        return None
    routes_collection = get_collection("routes")
    # Find route where device_code is in robot_list array
    route = await routes_collection.find_one({"robot_list": {"$in": [device_code]}})
    if not route or "group_id" not in route:
        return None
    return str(route.get("area_id")) if route.get("area_id") else None

async def extract_task_by_group_id(device_code: str):
    routes = get_collection("routes")
    data = {
        "area_id": "No Area",
        "group_id": "No Group",
        "route_id": "No Route"
    }

    route = await routes.find_one({"robot_list": {"$in": [device_code]}})
    if route:
        data["area_id"] = str(route["area_id"])
        data["group_id"] = str(route["group_id"])
        data["route_id"] = str(route["route_id"])

    return data


async def get_agv_position(payload: list):
    grouped_data = {}
    
    for record in payload:
        device_name = record.get("deviceName")
        if not device_name:
            continue
            
        # Get group_id for this device
        group_id = await get_group_id(device_name)
        if not group_id or group_id == "None":
            continue
        
        # Prepare robot info (thêm state để FE filter và đếm theo nhóm)
        robot_info = {
            "device_code": record.get("deviceCode"),
            "device_name": record.get("deviceName"),
            "battery": record.get("battery"),
            "speed": record.get("speed"),
            "state": record.get("state"),
            "devicePosition": record.get("devicePosition"),
            "payLoad": record.get("payLoad"),
            "oritation": record.get("oritation"),
            "devicePositionReceived": record.get("devicePositionRec"),
            "created_at": datetime.now().isoformat()
        }
        
        # Group by group_id
        if group_id not in grouped_data:
            grouped_data[group_id] = []
        grouped_data[group_id].append(robot_info)
    
    return grouped_data

async def get_robot_data_by_task(order_id: str):
    agv_collection = get_collection("agv_data")
    cursor = agv_collection.find({"order_id": order_id})
    agv_data = await cursor.to_list(length=None)
    for doc in agv_data:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
    return agv_data

async def filter_count_task(payload):
    try:
        response = requests.post(
            f"{ics_url}/statistic/todayTaskStatus",
            json=payload,
            timeout=5
        )
        data = response.json()
        statistic = data.get("data")
        in_progress = statistic.get("execution", 0)
        cancelled = statistic.get("canceled", 0)
        not_start = statistic.get("notStarted", 0)
        failed = statistic.get("failed", 0)
        completed = statistic.get("completed", 0)
            
        total_tasks = in_progress + cancelled + not_start + failed + completed
        
        return {
            "status": "success",
            "total_tasks": total_tasks,
            "in_progress": in_progress,
            "cancelled": cancelled,
            "completed": completed,
            "not_start": not_start,
            "failed": failed
        }

    except httpx.HTTPError as e:
        logger.error(f"HTTP error when calling get_in_progress_task: {e}")
        return {
            "status": "error",
            "message": f"HTTP error: {str(e)}",
            "tasks_with_end_time": [],
            "total_tasks": 0,
            "in_progress": 0,
            "cancelled": 0,
            "completed": 0,
            "not_start": 0,
            "failed": 0
        }
    except Exception as e:
        logger.error(f"Error in get_in_progress_task: {e}")
        return {
            "status": "error",
            "message": str(e),
            "tasks_with_end_time": [],
            "total_tasks": 0,
            "in_progress": 0,
            "cancelled": 0,
            "completed": 0,
            "not_start": 0,
            "failed": 0
        }
    
async def get_total_robot_info(payload):
    response = requests.post(
        f"{ics_url}/statistic/device/list/deviceInfo",
        json=payload,
        timeout=5
    )

    data = response.json()

    statistic = data.get("data")
    offline = statistic.get("offline", 0)
    total = statistic.get("total", 0)
    idle = statistic.get("idle", 0)
    charging = statistic.get("charging", 0)
    in_task = statistic.get("inTask", 0)
    
    
    return {
        "status": "success",
        "offline": offline,
        "total": total,
        "idle": idle,
        "charging": charging,
        "in_task": in_task
    }


async def get_in_progress_task(group_id: Optional[str] = None):
    if group_id:
        payload = {"areaId": group_id}
        logger.info(f"Getting in progress task for group {group_id}")
        result = await filter_count_task(payload)
        return result
    else:
        area_collection = get_collection("area")
        total_tasks = 0
        in_progress = 0
        cancelled = 0
        not_start = 0
        completed = 0
        failed = 0
        for area in await area_collection.find().to_list(length=None):
            payload = {"areaId": area["area_id"]}
            result = await filter_count_task(payload)
            logger.info(f"Getting in progress task for group {area['area_id']}: {result}")
            if result["status"] == "success":
                total_tasks += result["total_tasks"]
                in_progress += result.get("in_progress", 0)
                cancelled += result["cancelled"]
                not_start += result["not_start"]
                completed += result["completed"]
                failed += result["failed"]
        return {
            "status": "success",
            "total_tasks": total_tasks,
            "in_progress": in_progress,
            "completed": completed,
            "cancelled": cancelled,
            "not_start": not_start,
            "failed": failed
        }

async def get_task_dashboard(group_id):
    tasks_collection = get_collection("tasks")
    group_id = str(group_id)
    base_query = {}
    query_by_week = {}
    query_by_month = {}

    # Calculate time thresholds as ISO strings (since updated_at is stored as ISO string)
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (datetime.now() - timedelta(weeks=1)).isoformat()
    month_ago = (datetime.now() - timedelta(days=30)).isoformat()

    if group_id == '0':
        result = await get_in_progress_task()
        if result["status"] == "success":
            in_progress_tasks = result["in_progress"]
            completed_tasks = result["completed"]
            cancelled_tasks = result["cancelled"]
            failed_tasks = result["failed"]
            not_start_tasks = result["not_start"]
        else:
            in_progress_tasks = 0
            completed_tasks = 0
            cancelled_tasks = 0
            failed_tasks = 0
            not_start_tasks = 0
        query_by_week["updated_at"] = {"$gte": week_ago}
        query_by_month["updated_at"] = {"$gte": month_ago}
    else:
        result = await get_in_progress_task(group_id)
        if result["status"] == "success":
            in_progress_tasks = result["in_progress"]
            completed_tasks = result["completed"]
            cancelled_tasks = result["cancelled"]
            failed_tasks = result["failed"]
            not_start_tasks = result["not_start"]
        else:
            in_progress_tasks = 0
            completed_tasks = 0
            cancelled_tasks = 0
            failed_tasks = 0
            not_start_tasks = 0
        base_query["area_id"] = group_id
        base_query["updated_at"] = {"$gte": today_start}
        query_by_week["area_id"] = group_id
        query_by_week["updated_at"] = {"$gte": week_ago}
        query_by_month["area_id"] = group_id
        query_by_month["updated_at"] = {"$gte": month_ago}    
    
    tasks = tasks_collection.find(base_query)
    tasks = await tasks.to_list(length=None)

    tasks_by_week = tasks_collection.find(query_by_week)
    tasks_by_week = await tasks_by_week.to_list(length=None)

    tasks_by_month = tasks_collection.find(query_by_month)
    tasks_by_month = await tasks_by_month.to_list(length=None)
    
    # Count tasks from list (not from collection)
    completed_tasks_by_week = len([task for task in tasks_by_week if task.get("status") == 8])
    completed_tasks_by_month = len([task for task in tasks_by_month if task.get("status") == 8])
    total_tasks_by_week = len([task for task in tasks_by_week])
    total_tasks_by_month = len([task for task in tasks_by_month])

    
    return {
        "status": "success",
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "not_start_tasks": not_start_tasks,
        "cancelled_tasks": cancelled_tasks,
        "failed_tasks": failed_tasks,
        "completed_tasks_by_week": completed_tasks_by_week,
        "completed_tasks_by_month": completed_tasks_by_month,
        "total_tasks_by_week": total_tasks_by_week,
        "total_tasks_by_month": total_tasks_by_month,
    }

# Status task: success = 6, 8, 9; failed = 3, 7 (theo DB / task_service)
SUCCESS_STATUSES = [6, 8, 9]
FAILED_STATUSES = [3, 7]


async def get_success_task_by_hour(area_id: Optional[str] = None, group_id: Optional[str] = None):
    tasks_collection = get_collection("tasks")

    # 8 bucket bao gồm giờ hiện tại: start = now - 7h → 8 slot (7h trước, 6h trước, ..., giờ hiện tại)
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=7)
    start_str = start_time.strftime("%Y-%m-%dT%H:%M:%S.%f")
    end_str = end_time.strftime("%Y-%m-%dT%H:%M:%S.%f")

    def build_query(status_list):
        q = {"updated_at": {"$gte": start_str, "$lte": end_str}, "status": {"$in": status_list}}
        if area_id is not None and str(area_id).strip():
            q["area_id"] = str(area_id).strip()
        if group_id is not None and str(group_id).strip():
            q["group_id"] = str(group_id).strip()
        return q

    projection = {"area_id": 1, "group_id": 1, "updated_at": 1, "status": 1}

    success_query = build_query(SUCCESS_STATUSES)
    cursor_success = tasks_collection.find(success_query, projection)
    tasks_success = await cursor_success.to_list(length=None)

    failed_query = build_query(FAILED_STATUSES)
    cursor_failed = tasks_collection.find(failed_query, projection)
    tasks_failed = await cursor_failed.to_list(length=None)

    def _parse_updated_at(updated_at):
        if isinstance(updated_at, datetime):
            dt = updated_at
        elif isinstance(updated_at, str):
            try:
                dt = (
                    datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                    if "T" in updated_at
                    else datetime.strptime(updated_at, "%Y-%m-%d %H:%M:%S")
                )
            except Exception:
                return None
        else:
            return None
        if dt.tzinfo is not None:
            dt = dt.astimezone().replace(tzinfo=None)
        return dt

    # 8 bucket: giờ thực từ (now-7h) đến giờ hiện tại (vd. 2,3,...,9)
    hour_keys_ordered = [str((start_time + timedelta(hours=i)).hour) for i in range(8)]
    hour_keys_set = set(hour_keys_ordered)

    def aggregate_by_hour(tasks_list):
        stats = {}
        for task in tasks_list:
            task_area_id = task.get("area_id")
            updated_at = task.get("updated_at")
            if not task_area_id or not updated_at:
                continue
            dt = _parse_updated_at(updated_at)
            if dt is None:
                continue
            if dt < start_time or dt > end_time:
                continue
            # Gán theo giờ đồng hồ của task để giờ hiện tại (vd. 09:15) vào đúng bucket 9
            hour_key = str(dt.hour)
            if hour_key not in hour_keys_set:
                continue
            if task_area_id not in stats:
                stats[task_area_id] = {}
            stats[task_area_id][hour_key] = stats[task_area_id].get(hour_key, 0) + 1
        return stats

    completed_stats = aggregate_by_hour(tasks_success)
    failed_stats = aggregate_by_hour(tasks_failed)

    all_area_ids = set(completed_stats.keys()) | set(failed_stats.keys())
    if area_id is not None and str(area_id).strip():
        aid = str(area_id).strip()
        all_area_ids = {aid} if all_area_ids else {aid}

    def fill_eight_hours(stats_dict):
        out = {}
        for aid in all_area_ids:
            out[aid] = {h: stats_dict.get(aid, {}).get(h, 0) for h in hour_keys_ordered}
        return out

    data = fill_eight_hours(completed_stats)
    failed_data = fill_eight_hours(failed_stats)

    return {
        "data": data,
        "failed_data": failed_data,
        "total_areas": len(all_area_ids),
        "total_completed_tasks": len(tasks_success),
        "total_failed_tasks": len(tasks_failed),
        "filtered_by_area_id": area_id,
        "filtered_by_group_id": group_id,
        "window_start": start_str,
        "window_end": end_str,
        "hour_keys_order": hour_keys_ordered,
    }


async def reverse_dashboard_data():
    try:
        agv_collection = get_collection("agv_data")
        daily_stats_collection = get_collection("agv_daily_statistics")
        
        # Lấy ngày hôm nay (00:00:00 đến 23:59:59)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        today_date = today.date()  # Ngày hôm nay dạng date
        
        # Base query: chỉ lấy dữ liệu của ngày hôm nay
        base_query = {
            "created_at": {"$gte": today, "$lt": tomorrow}
        }
        
        # Pipeline 1: Tính toán payload statistics (có tải/không tải) theo ngày cho từng robot
        payload_pipeline = [
            {"$match": base_query},
            {
                "$group": {
                    "_id": {
                        "device_code": "$device_code",
                        "device_name": "$device_name",
                        "date": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at"
                            }
                        },
                        "state": "$state",
                        "payLoad": "$payLoad"
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.device_code": 1, "_id.date": 1}}
        ]
        
        # Pipeline 2: Tính toán work status (InTask/Idle) theo ngày cho từng robot
        work_status_pipeline = [
            {"$match": base_query},
            {
                "$group": {
                    "_id": {
                        "device_code": "$device_code",
                        "device_name": "$device_name",
                        "date": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at"
                            }
                        },
                        "state": "$state"
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.device_code": 1, "_id.date": 1}}
        ]
        
        # Thực hiện cả 2 pipeline
        cursor_payload = agv_collection.aggregate(payload_pipeline)
        payload_results = await cursor_payload.to_list(length=None)
        
        cursor_work = agv_collection.aggregate(work_status_pipeline)
        work_results = await cursor_work.to_list(length=None)
        
        # Tổ chức dữ liệu payload theo robot và ngày
        payload_data = {}
        for item in payload_results:
            device_code = item["_id"]["device_code"]
            device_name = item["_id"]["device_name"]
            date_key = item["_id"]["date"]
            state = item["_id"]["state"]
            payload = item["_id"]["payLoad"]
            count = item["count"]
            
            key = f"{device_code}_{date_key}"
            
            if key not in payload_data:
                payload_data[key] = {
                    "device_code": device_code,
                    "device_name": device_name,
                    "date": date_key,
                    "InTask_payLoad_0_0_count": 0,
                    "InTask_payLoad_1_0_count": 0,
                }
            
            # Phân loại theo state và payload
            if state == "InTask" and payload == "0.0":
                payload_data[key]["InTask_payLoad_0_0_count"] = count
            elif state == "InTask" and payload == "1.0":
                payload_data[key]["InTask_payLoad_1_0_count"] = count
        
        # Tổ chức dữ liệu work status theo robot và ngày
        work_status_data = {}
        for item in work_results:
            device_code = item["_id"]["device_code"]
            device_name = item["_id"]["device_name"]
            date_key = item["_id"]["date"]
            state = item["_id"]["state"]
            count = item["count"]
            
            key = f"{device_code}_{date_key}"
            
            if key not in work_status_data:
                work_status_data[key] = {
                    "device_code": device_code,
                    "device_name": device_name,
                    "date": date_key,
                    "InTask_count": 0,
                }
            
            if state == "InTask":
                work_status_data[key]["InTask_count"] = count
            elif state == "Idle":
                work_status_data[key]["Idle_count"] = count
        
        # Kết hợp cả 2 loại dữ liệu và tính toán phần trăm
        combined_data = []
        all_keys = set(list(payload_data.keys()) + list(work_status_data.keys()))
        
        for key in all_keys:
            # Lấy thông tin cơ bản
            if key in payload_data:
                base_info = {
                    "device_code": payload_data[key]["device_code"],
                    "device_name": payload_data[key]["device_name"],
                    "date": payload_data[key]["date"],
                }
            elif key in work_status_data:
                base_info = {
                    "device_code": work_status_data[key]["device_code"],
                    "device_name": work_status_data[key]["device_name"],
                    "date": work_status_data[key]["date"],
                }
            else:
                continue
            
            # Lấy group_id, route_id, area_id theo robot từ routes
            group_data = await extract_task_by_group_id(base_info["device_name"])
            
            # Payload statistics
            InTask_payload_0_0 = payload_data.get(key, {}).get("InTask_payLoad_0_0_count", 0)
            InTask_payload_1_0 = payload_data.get(key, {}).get("InTask_payLoad_1_0_count", 0)
            
            total_InTask_payload = InTask_payload_0_0 + InTask_payload_1_0
            
            # Work status
            InTask_count = work_status_data.get(key, {}).get("InTask_count", 0)
            Idle_count = work_status_data.get(key, {}).get("Idle_count", 0)
            total_work_records = InTask_count + Idle_count
            
            # Tính phần trăm payload cho InTask
            InTask_payload_0_0_percentage = round((InTask_payload_0_0 / total_InTask_payload) * 100, 2) if total_InTask_payload > 0 else 0
            InTask_payload_1_0_percentage = round((InTask_payload_1_0 / total_InTask_payload) * 100, 2) if total_InTask_payload > 0 else 0
            
            # Tính phần trăm work status
            InTask_percentage = round((InTask_count / total_work_records) * 100, 2) if total_work_records > 0 else 0
            Idle_percentage = round((Idle_count / total_work_records) * 100, 2) if total_work_records > 0 else 0
            
            # Tạo document để lưu
            daily_stat = {
                **base_info,
                "group_id": group_data["group_id"],
                "route_id": group_data["route_id"],
                "area_id": group_data["area_id"],
                # Payload statistics - InTask
                "InTask_payLoad_0_0_count": InTask_payload_0_0,
                "InTask_payLoad_1_0_count": InTask_payload_1_0,
                "InTask_total_payload_records": total_InTask_payload,
                "InTask_payLoad_0_0_percentage": InTask_payload_0_0_percentage,
                "InTask_payLoad_1_0_percentage": InTask_payload_1_0_percentage,
                
                # Work status statistics
                "InTask_count": InTask_count,
                "Idle_count": Idle_count,
                "total_work_records": total_work_records,
                "InTask_percentage": InTask_percentage,
                "Idle_percentage": Idle_percentage,
                
                # Metadata (MongoDB BSON chỉ hỗ trợ datetime, không hỗ trợ date)
                "date_time": datetime.combine(today_date, datetime.min.time()),
                "calculated_at": datetime.now()
            }
            
            combined_data.append(daily_stat)
        
        # Lưu vào database (insert trực tiếp, không check trùng)
        if len(combined_data) > 0:
            await daily_stats_collection.insert_many(combined_data)
        
        logger.info(f"Reverse dashboard completed: {len(combined_data)} records inserted for {today_date}")
        
        return {
            "status": "success",
            "date": str(today_date),
            "total_records_inserted": len(combined_data),
            "summary": {
                "total_robots": len(set([d["device_code"] for d in combined_data])),
                "date": str(today_date)
            }
        }
        
    except Exception as e:
        logger.error(f"Error in reverse_dashboard_data: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


async def delete_agv_data_older_than_days(days: int = 30):
    """
    Xóa các bản ghi trong agv_data có created_at cũ hơn N ngày.
    Mặc định 30 ngày.
    """
    try:
        agv_collection = get_collection("agv_data")
        cutoff = datetime.now() - timedelta(days=days)
        result = await agv_collection.delete_many({"created_at": {"$lt": cutoff}})
        deleted_count = result.deleted_count
        logger.info(f"Deleted {deleted_count} agv_data records older than {days} days (before {cutoff})")
        return {
            "status": "success",
            "deleted_count": deleted_count,
            "older_than_days": days,
            "cutoff_before": cutoff.isoformat(),
        }
    except Exception as e:
        logger.error(f"Error in delete_agv_data_older_than_days: {e}")
        return {
            "status": "error",
            "message": str(e),
        }


def get_time_filter_simple(time_filter: str):
    """
    Nhận string từ frontend: "d", "w", "m"
    Trả về khoảng thời gian start, end để query
    
    - "d": 7 ngày gần nhất
    - "w": 7 tuần gần nhất  
    - "m": 7 tháng gần nhất
    """
    now = datetime.now()

    if time_filter == "d":
        # 7 ngày gần nhất
        start = now - timedelta(days=7)
        end = now

    elif time_filter == "w":
        # 7 tuần gần nhất (49 ngày)
        start = now - timedelta(weeks=7)
        end = now

    elif time_filter == "m":
        # 7 tháng gần nhất (khoảng 210 ngày)
        start = now - timedelta(days=210)
        end = now

    else:
        raise ValueError("Invalid time_filter (chỉ chấp nhận: d, w, m)")

    return start, end

async def get_data_by_time(time_filter: str, device_code: str = None, state: str = None):
    """
    Lấy dữ liệu AGV theo thời gian với 2 trường hợp:
    1. Có state: đếm số bản ghi payLoad là "0.0" và "1.0" (String) theo state cụ thể
    2. Không có state: đếm số bản ghi có state InTask và Idle để tính số lượng làm việc/không làm việc
    
    Trả về dữ liệu theo từng đơn vị thời gian (ngày/tuần/tháng) thay vì tổng hợp
    
    Args:
        time_filter: "d", "w", "m" 
        device_code: mã thiết bị (tùy chọn)
        state: trạng thái cụ thể (tùy chọn)
    
    Returns:
        dict: kết quả thống kê theo từng đơn vị thời gian
    """
    try:
        start, end = get_time_filter_simple(time_filter)
        agv_collection = get_collection("agv_data")

        # Base query: luôn lọc theo thời gian
        base_query = {
            "created_at": {"$gte": start, "$lt": end}
        }

        # Nếu có device_code thì thêm vào query
        if device_code:
            base_query["device_code"] = device_code

        # Trường hợp 1: Có state truyền vào
        if state:
            # Xác định format date theo time_filter
            date_format = {
                "d": "%Y-%m-%d",      # Theo ngày
                "w": "%Y-W%U",        # Theo tuần (năm-tuần)
                "m": "%Y-%m"          # Theo tháng
            }[time_filter]
            
            # Pipeline để đếm số bản ghi payLoad theo từng đơn vị thời gian cho state cụ thể
            pipeline = [
                {"$match": base_query},
                {
                    "$group": {
                        "_id": {
                            "date": {
                                "$dateToString": {
                                    "format": date_format,
                                    "date": "$created_at"
                                }
                            },
                            "state": "$state",
                            "payLoad": "$payLoad"
                        },
                        "count": {"$sum": 1}
                    }
                },
                {"$match": {"_id.state": state}},  # Filter theo state sau khi group
                {"$sort": {"_id.date": 1}}
            ]
            
            cursor = agv_collection.aggregate(pipeline)
            result = await cursor.to_list(length=None)
            
            # Tổ chức dữ liệu theo ngày/tuần/tháng
            time_series_data = {}
            total_0_0 = 0
            total_1_0 = 0
            
            for item in result:
                date_key = item["_id"]["date"]
                state_value = item["_id"]["state"]
                payload = item["_id"]["payLoad"]
                count = item["count"]
                
                # Chỉ xử lý nếu state khớp và payload là "0.0" hoặc "1.0"
                if state_value == state and payload in ["0.0", "1.0"]:
                    if date_key not in time_series_data:
                        time_series_data[date_key] = {
                            "payLoad_0_0_count": 0,
                            "payLoad_1_0_count": 0,
                            "total_records": 0
                        }
                    
                    if payload == "0.0":
                        time_series_data[date_key]["payLoad_0_0_count"] = count
                        total_0_0 += count
                    elif payload == "1.0":
                        time_series_data[date_key]["payLoad_1_0_count"] = count
                        total_1_0 += count
                    
                    time_series_data[date_key]["total_records"] += count
            
            # Tính phần trăm cho từng ngày/tuần/tháng
            for date_key in time_series_data:
                total_daily = time_series_data[date_key]["total_records"]
                if total_daily > 0:
                    time_series_data[date_key]["payLoad_0_0_percentage"] = round(
                        (time_series_data[date_key]["payLoad_0_0_count"] / total_daily) * 100, 2
                    )
                    time_series_data[date_key]["payLoad_1_0_percentage"] = round(
                        (time_series_data[date_key]["payLoad_1_0_count"] / total_daily) * 100, 2
                    )
                else:
                    time_series_data[date_key]["payLoad_0_0_percentage"] = 0
                    time_series_data[date_key]["payLoad_1_0_percentage"] = 0
            
            # Tính phần trăm tổng thể
            total_records = total_0_0 + total_1_0
            total_payLoad_0_0_percentage = round((total_0_0 / total_records) * 100, 2) if total_records > 0 else 0
            total_payLoad_1_0_percentage = round((total_1_0 / total_records) * 100, 2) if total_records > 0 else 0
            
            return {
                "status": "success",
                "filter_type": "with_state",
                "state": state,
                "time_range": f"{start} to {end}",
                "time_unit": time_filter,
                "data": {
                    "time_series": time_series_data,
                    "summary": {
                        "total_payLoad_0_0_count": total_0_0,
                        "total_payLoad_1_0_count": total_1_0,
                        "total_records": total_records,
                        "total_payLoad_0_0_percentage": total_payLoad_0_0_percentage,
                        "total_payLoad_1_0_percentage": total_payLoad_1_0_percentage
                    }
                }
            }
        
        # Trường hợp 2: Không có state truyền vào
        else:
            # Xác định format date theo time_filter
            date_format = {
                "d": "%Y-%m-%d",      # Theo ngày
                "w": "%Y-W%U",        # Theo tuần (năm-tuần)
                "m": "%Y-%m"          # Theo tháng
            }[time_filter]
            
            # Pipeline để đếm số bản ghi theo state InTask và Idle theo từng đơn vị thời gian
            pipeline = [
                {"$match": base_query},
                {
                    "$group": {
                        "_id": {
                            "date": {
                                "$dateToString": {
                                    "format": date_format,
                                    "date": "$created_at"
                                }
                            },
                            "state": "$state"
                        },
                        "count": {"$sum": 1}
                    }
                },
                {"$sort": {"_id.date": 1}}
            ]
            
            cursor = agv_collection.aggregate(pipeline)
            result = await cursor.to_list(length=None)
            
            # Tổ chức dữ liệu theo ngày/tuần/tháng
            time_series_data = {}
            total_intask = 0
            total_idle = 0
            
            for item in result:
                date_key = item["_id"]["date"]
                state_value = item["_id"]["state"]
                count = item["count"]
                
                if date_key not in time_series_data:
                    time_series_data[date_key] = {
                        "InTask_count": 0,
                        "Idle_count": 0,
                        "total_records": 0
                    }
                
                if state_value == "InTask":
                    time_series_data[date_key]["InTask_count"] = count
                    total_intask += count
                elif state_value == "Idle":
                    time_series_data[date_key]["Idle_count"] = count
                    total_idle += count
                
                time_series_data[date_key]["total_records"] += count
            
            # Tính phần trăm cho từng ngày/tuần/tháng
            for date_key in time_series_data:
                total_daily = time_series_data[date_key]["total_records"]
                if total_daily > 0:
                    time_series_data[date_key]["InTask_percentage"] = round(
                        (time_series_data[date_key]["InTask_count"] / total_daily) * 100, 2
                    )
                    time_series_data[date_key]["Idle_percentage"] = round(
                        (time_series_data[date_key]["Idle_count"] / total_daily) * 100, 2
                    )
                else:
                    time_series_data[date_key]["InTask_percentage"] = 0
                    time_series_data[date_key]["Idle_percentage"] = 0
            
            # Tính phần trăm tổng thể
            total_records = total_intask + total_idle
            total_InTask_percentage = round((total_intask / total_records) * 100, 2) if total_records > 0 else 0
            total_Idle_percentage = round((total_idle / total_records) * 100, 2) if total_records > 0 else 0
            
            return {
                "status": "success",
                "filter_type": "without_state",
                "time_range": f"{start} to {end}",
                "time_unit": time_filter,
                "data": {
                    "time_series": time_series_data,
                    "summary": {
                        "total_InTask_count": total_intask,
                        "total_Idle_count": total_idle,
                        "total_records": total_records,
                        "total_InTask_percentage": total_InTask_percentage,
                        "total_Idle_percentage": total_Idle_percentage
                    }
                }
            }

    except Exception as e:
        logger.error(f"Error getting data by time: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

async def get_all_robots_payload_data(
    area_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    device_code: Optional[str] = None
):
    """
    Lấy dữ liệu thống kê chung của robot từ agv_hourly_work_duration: Loaded, No load, InTask, Idle.
    - area_id, start_date, end_date, device_code: optional. Không truyền ngày thì lấy ngày mới nhất trong DB.
    - Gộp nhiều ngày, mỗi robot 1 kết quả (phút + phần trăm).
    """
    try:
        logger.info(f"Getting robots stats from {start_date} to {end_date} in area_id={area_id}")
        collection = get_collection("agv_hourly_work_duration")

        filter_only = {}
        if area_id is not None and str(area_id).strip():
            filter_only["area_id"] = str(area_id).strip()
        if device_code:
            codes = [c.strip() for c in device_code.split(",") if c.strip()]
            if codes:
                filter_only["device_name"] = {"$in": codes}

        today_str = datetime.now().strftime("%Y-%m-%d")
        dates_provided = start_date is not None or end_date is not None  # caller có truyền ngày hay không
        if start_date is None and end_date is None:
            pipe = [{"$match": filter_only}, {"$group": {"_id": None, "maxDate": {"$max": "$date"}}}] 
            agg = await collection.aggregate(pipe).to_list(length=1)
            if agg and agg[0].get("maxDate"):
                start_date = end_date = agg[0]["maxDate"]
            else:
                start_date = end_date = today_str
        elif start_date is None:
            start_date = end_date
        elif end_date is None:
            end_date = start_date

        start = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999)
        start_str = start.strftime("%Y-%m-%d")
        end_str = end.strftime("%Y-%m-%d")
        # 890 phút/ngày = 53400 giây/60. Không truyền ngày → 1 ngày → chia 890; có truyền ngày → 890 * số ngày
        if not dates_provided:
            total_minutes_base = 890
        else:
            num_days = (end.date() - start.date()).days + 1
            total_minutes_base = 890 * num_days

        base_query = {"date": {"$gte": start_str, "$lte": end_str}}
        base_query.update(filter_only)

        cursor = collection.find(base_query)
        rows = await cursor.to_list(length=None)

        # Gộp theo robot: cộng Loaded, No load, InTask, Idle của tất cả ngày, mỗi robot 1 kết quả
        robots_data = {}
        for stat in rows:
            device_code_key = stat["device_code"]
            device_name_key = stat.get("device_name", "")
            no_load_min = stat.get("No_load_minutes", 0) or 0
            loaded_min = stat.get("Loaded_minutes", 0) or 0
            intask_min = stat.get("InTask_duration_minutes", 0) or 0
            idle_min = stat.get("Idle_duration_minutes", 0) or 0

            if device_code_key not in robots_data:
                robots_data[device_code_key] = {
                    "device_code": device_code_key,
                    "device_name": device_name_key,
                    "No_load_minutes": 0.0,
                    "Loaded_minutes": 0.0,
                    "InTask_duration_minutes": 0.0,
                    "Idle_duration_minutes": 0.0,
                }
            robots_data[device_code_key]["No_load_minutes"] += no_load_min
            robots_data[device_code_key]["Loaded_minutes"] += loaded_min
            robots_data[device_code_key]["InTask_duration_minutes"] += intask_min
            robots_data[device_code_key]["Idle_duration_minutes"] += idle_min

        # Tính phần trăm: payload (trong InTask), work status (InTask vs Idle)
        for robot in robots_data.values():
            total_payload = robot["No_load_minutes"] + robot["Loaded_minutes"]
            if total_payload > 0:
                robot["payLoad_0_0_percentage"] = round((robot["No_load_minutes"] / total_payload) * 100, 2)
                robot["payLoad_1_0_percentage"] = round((robot["Loaded_minutes"] / total_payload) * 100, 2)
            else:
                robot["payLoad_0_0_percentage"] = 0.0
                robot["payLoad_1_0_percentage"] = 0.0

            # InTask/Idle % = duration_minutes / (890 * số ngày)
            if total_minutes_base > 0:
                robot["InTask_percentage"] = round((robot["InTask_duration_minutes"] / total_minutes_base) * 100, 2)
                robot["Idle_percentage"] = round((robot["Idle_duration_minutes"] / total_minutes_base) * 100, 2)
            else:
                robot["InTask_percentage"] = 0.0
                robot["Idle_percentage"] = 0.0

        return {
            "status": "success",
            "time_range": f"{start_str} to {end_str}",
            "collection_used": "agv_hourly_work_duration",
            "total_robots": len(robots_data),
            "robots": list(robots_data.values()),
        }

    except Exception as e:
        logger.error(f"Error getting all robots payload data: {e}")
        return {
            "status": "error",
            "message": str(e),
        }

async def get_system_efficiency_hourly_8h(area_id = None, group_id = None):
    """
    Lấy dữ liệu Idle và InTask của hệ thống theo từng khung giờ (8 tiếng qua).
    Có thể lọc theo group_id (area_id).
    """
    try:
        collection = get_collection("agv_data")
        
        # 1. Xác định mốc thời gian
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=8)

        # 2. Xây dựng bộ lọc Match
        match_filter = {
            "created_at": {"$gte": start_time, "$lt": end_time},
            "state": {"$in": ["Idle", "InTask"]}
        }
        
        # Nếu có truyền group_id, lọc theo area_id
        if area_id:
            match_filter["area_id"] = str(area_id)
        if group_id:
            match_filter["group_id"] = str(group_id)

        # 3. Pipeline Aggregation
        pipeline = [
            {
                "$match": match_filter
            },
            {
                "$group": {
                    "_id": {
                        "hour": { "$dateToString": { "format": "%Y-%m-%d %H:00", "date": "$created_at" } },
                        "state": "$state"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.hour",
                    "states": {
                        "$push": {
                            "k": "$_id.state",
                            "v": "$count"
                        }
                    }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "hour": "$_id",
                    "data": { "$arrayToObject": "$states" }
                }
            },
            { "$sort": { "hour": 1 } }
        ]

        cursor = collection.aggregate(pipeline)
        hourly_raw = await cursor.to_list(length=None)

        # 4. Chuẩn hóa dữ liệu
        final_series = []
        for item in hourly_raw:
            # Sử dụng .get() để tránh lỗi nếu một trạng thái không tồn tại trong khung giờ đó
            data_obj = item.get("data", {})
            idle = data_obj.get("Idle", 0)
            intask = data_obj.get("InTask", 0)
            total = idle + intask
            
            final_series.append({
                "time_slot": item["hour"],
                "idle": idle,
                "intask": intask,
                "total": total,
                "utilization": round((intask / total * 100), 2) if total > 0 else 0
            })

        return {
            "status": "success",
            "group_id": group_id,
            "range": "Last 8 Hours",
            "hourly_data": final_series
        }

    except Exception as e:
        logger.error(f"Error in hourly system query: {e}")
        return {"status": "error", "message": str(e)}

async def get_system_payload_efficiency_hourly_8h(area_id = None, group_id = None):
    try:
        collection = get_collection("agv_data")
        
        # 1. Xác định mốc thời gian
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=8)

        # 2. Xây dựng bộ lọc Match
        match_filter = {
            "created_at": {"$gte": start_time, "$lt": end_time},
            "state": "InTask", 
            "payLoad": {"$in": ["0.0", "1.0"]}
        }

        # Nếu có truyền group_id, thêm điều kiện lọc theo area_id
        if area_id:
            match_filter["area_id"] = str(area_id)

        if group_id:
            match_filter["group_id"] = str(group_id)

        # 3. Pipeline Aggregation
        pipeline = [
            {
                "$match": match_filter # Sử dụng filter đã build ở trên
            },
            {
                "$group": {
                    "_id": {
                        "hour": { "$dateToString": { "format": "%Y-%m-%d %H:00", "date": "$created_at" } },
                        "payLoad": "$payLoad"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.hour",
                    "payload_types": {
                        "$push": {
                            "k": { 
                                "$cond": [ { "$eq": ["$_id.payLoad", "1.0"] }, "loaded", "unloaded" ] 
                            },
                            "v": "$count"
                        }
                    }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "hour": "$_id",
                    "stats": { "$arrayToObject": "$payload_types" }
                }
            },
            { "$sort": { "hour": 1 } }
        ]

        cursor = collection.aggregate(pipeline)
        raw_data = await cursor.to_list(length=None)

        # 4. Map raw_data theo giờ để tra cứu nhanh
        raw_by_hour = {item["hour"]: item for item in raw_data}

        # 5. Sinh đủ 8 khung giờ (bao gồm giờ hiện tại: 7 giờ trước + giờ hiện tại)
        expected_end = end_time.replace(minute=0, second=0, microsecond=0)
        expected_start = expected_end - timedelta(hours=7)

        final_history = []
        current_slot = expected_start
        while current_slot <= expected_end:
            hour_key = current_slot.strftime("%Y-%m-%d %H:00")
            item = raw_by_hour.get(hour_key)
            if item is None:
                # Không có dữ liệu cho giờ này -> trả về toàn 0
                final_history.append({
                    "time_slot": hour_key,
                    "loaded_count": 0,
                    "unloaded_count": 0,
                    "total_intask": 0,
                    "load_efficiency": 0
                })
            else:
                stats = item.get("stats", {})
                loaded = stats.get("loaded", 0)
                unloaded = stats.get("unloaded", 0)
                total_intask = loaded + unloaded
                final_history.append({
                    "time_slot": item["hour"],
                    "loaded_count": loaded,
                    "unloaded_count": unloaded,
                    "total_intask": total_intask,
                    "load_efficiency": round((loaded / total_intask * 100), 2) if total_intask > 0 else 0
                })
            current_slot += timedelta(hours=1)

        return {
            "status": "success",
            "group_id": group_id, # Trả về để client biết đang filter theo group nào
            "metric": "Payload Distribution (InTask only)",
            "data": final_history
        }

    except Exception as e:
        logger.error(f"Error in payload hourly query: {e}")
        return {"status": "error", "message": str(e)}
    
async def get_system_speed_and_payload_daily_7d(area_id = None, group_id = None):
    try:
        collection = get_collection("agv_data")
        
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_time = today_start - timedelta(days=6) # 6 ngày trước
        end_time = now # Đến thời điểm hiện tại của hôm nay

        # 2. Bộ lọc Match
        match_filter = {
            "created_at": {"$gte": start_time, "$lt": end_time},
            "state": "InTask",
            # Loại bỏ các bản ghi mà speed không phải là số hợp lệ hoặc rỗng
            "speed": {"$ne": None, "$exists": True} 
        }
        if area_id:
            match_filter["area_id"] = str(area_id)
        if group_id:
            match_filter["group_id"] = str(group_id)

        # 3. Pipeline Aggregation
        pipeline = [
            { "$match": match_filter },
            {
                "$group": {
                    "_id": { 
                        "$dateToString": { "format": "%Y-%m-%d", "date": "$created_at" } 
                    },
                    "avg_speed_raw": { 
                        "$avg": { "$toDouble": "$speed" } 
                    }
                }
            },
            { "$sort": { "_id": 1 } }
        ]

        cursor = collection.aggregate(pipeline)
        raw_results = {item["_id"]: item.get("avg_speed_raw") for item in await cursor.to_list(length=None)}

        # 4. Chuẩn hóa & Fill-in dữ liệu
        final_history = []
        for i in range(6, -1, -1):
            target_date_obj = today_start - timedelta(days=i)
            target_date = target_date_obj.strftime("%Y-%m-%d")
            
            raw_speed = raw_results.get(target_date)
            
            # Logic chuyển đổi đơn vị
            speed_converted = (raw_speed / 1000) if raw_speed is not None else 0
            
            final_history.append({
                "date": target_date,
                "average_speed": round(speed_converted, 2),
                "unit": "m/s" 
            })

        return {
            "status": "success",
            "data": final_history
        }

    except Exception as e:
        logger.error(f"Error: {e}")
        return {"status": "error", "message": str(e)}


def _parse_created_at(created_at):
    """Chuyển created_at (datetime hoặc ISO string) thành datetime."""
    if created_at is None:
        return None
    if isinstance(created_at, datetime):
        return created_at
    if isinstance(created_at, str):
        try:
            if "T" in created_at:
                return datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            return datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S")
        except Exception:
            return None
    return None


async def save_agv_work_duration_by_hour(target_date: Optional[datetime] = None):
    try:
        agv_collection = get_collection("agv_data")
        save_collection = get_collection("agv_hourly_work_duration")
        # save_collection = get_collection("tesst")

        day = target_date.date() if target_date else datetime.now().date()
        # Chỉ lấy và tính từ 5:00 sáng đến 24:00 (12h đêm); mỗi thiết bị chỉ tính từ bản ghi đầu tiên
        day_start = datetime.combine(day, time(5, 0, 0))  # 5h sáng
        day_end = datetime.combine(day, datetime.min.time()) + timedelta(days=1)  # 0h ngày sau
        date_str = day.strftime("%Y-%m-%d")

        # Query chỉ từ 5h đến 24h; tính từ bản ghi đầu tiên của mỗi thiết bị đến 24h
        cursor = agv_collection.find(
            {"created_at": {"$gte": day_start, "$lt": day_end}},
            {"device_code": 1, "device_name": 1, "state": 1, "payLoad": 1, "created_at": 1, "speed": 1},
        ).sort([("device_code", 1), ("created_at", 1)])

        rows = await cursor.to_list(length=None)

        by_device = collections.defaultdict(list)
        for r in rows:
            ts = _parse_created_at(r.get("created_at"))
            if ts is None:
                continue
            by_device[r["device_code"]].append({
                "device_code": r["device_code"],
                "device_name": r.get("device_name", ""),
                "state": r.get("state"),
                "payLoad": r.get("payLoad"),
                "created_at": ts,
                "speed": r.get("speed"),
            })

        to_save = []
        for device_code, recs in by_device.items():
            if not recs:
                continue
            recs.sort(key=lambda x: x["created_at"])
            device_name = recs[0].get("device_name", "")
            # Mỗi thiết bị chỉ tính từ bản ghi đầu tiên đến 24h (vd: bản ghi đầu lúc 14:30 thì tính từ 14:30→24h)
            device_window_start = recs[0]["created_at"]

            # Lấy group_id, area_id, route_id của robot từ bảng routes
            group_data = await extract_task_by_group_id(device_name)

            # Tốc độ trung bình từ bản ghi đầu tiên đến 24h
            speed_sum = 0.0
            speed_count = 0
            for rec in recs:
                try:
                    v = rec.get("speed")
                    if v is not None:
                        speed_sum += float(v)
                        speed_count += 1
                except (TypeError, ValueError):
                    pass
            average_speed = round(speed_sum / speed_count, 2) if speed_count else None

            # Tổng thời gian từ bản ghi đầu tiên đến 24h (clamp mỗi segment)
            idle_sec = 0.0
            intask_sec = 0.0
            intask_p0_sec = 0.0
            intask_p1_sec = 0.0
            for i, rec in enumerate(recs):
                seg_start = rec["created_at"]
                # seg_end = recs[i + 1]["created_at"] if i + 1 < len(recs) else day_end
                # Bản ghi cuối: không tính từ bản ghi này đến hết ngày (chỉ tính giữa các bản ghi)
                if i + 1 < len(recs):
                    seg_end = recs[i + 1]["created_at"]
                else:
                    seg_end = seg_start  # duration = 0, bỏ qua thời gian từ bản ghi cuối đến 24h
                effective_start = max(seg_start, device_window_start)
                effective_end = min(seg_end, day_end)
                duration_sec = (effective_end - effective_start).total_seconds()
                if duration_sec <= 0:
                    continue
                state = rec.get("state")
                payload = rec.get("payLoad")
                if state == "Idle":
                    idle_sec += duration_sec
                elif state == "InTask":
                    intask_sec += duration_sec
                    if str(payload) == "1.0":
                        intask_p1_sec += duration_sec
                    else:
                        intask_p0_sec += duration_sec

            idle_min = round(idle_sec / 60, 2)
            intask_min = round(intask_sec / 60, 2)
            khong_tai_min = round(intask_p0_sec / 60, 2)
            co_tai_min = round(intask_p1_sec / 60, 2)
            total_min = round((idle_sec + intask_sec) / 60, 2)

            to_save.append({
                "device_code": device_code,
                "device_name": device_name,
                "group_id": group_data["group_id"],
                "area_id": group_data["area_id"],
                "route_id": group_data["route_id"],
                "date": date_str,
                "InTask_duration_minutes": intask_min,
                "Idle_duration_minutes": idle_min,
                "No_load_minutes": khong_tai_min,
                "Loaded_minutes": co_tai_min,
                "total_duration_minutes": total_min,
                "average_speed": average_speed,
                "calculated_at": datetime.now(),
            })

        if not to_save:
            logger.info(f"save_agv_work_duration_by_hour: no data for {date_str}")
            return {"status": "success", "date": date_str, "records_saved": 0}

        await save_collection.delete_many({"date": date_str})
        await save_collection.insert_many(to_save)
        logger.info(f"save_agv_work_duration_by_hour: saved {len(to_save)} records for {date_str}")

        return {"status": "success", "date": date_str, "records_saved": len(to_save)}
    except Exception as e:
        logger.error(f"Error in save_agv_work_duration_by_hour: {e}")
        return {"status": "error", "message": str(e)}


async def get_area_efficiency_by_8d(area_id: str, group_id: str = None):
    """
    7 ngày: 6 ngày (today-6 -> today-1) từ agv_hourly_work_duration (avg phút / 890),
    + 1 ngày (hôm nay) từ agv_data (count). Return format giống trước (date, intask_count, idle_count, ...).
    Hỗ trợ filter theo area_id bắt buộc, group_id tùy chọn (nếu có).
    """
    try:
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_str = today_start.strftime("%Y-%m-%d")
        TOTAL_MINUTES_PER_DAY = 890

        # --- 6 ngày từ agv_hourly_work_duration (today-6 -> today-1) ---
        start_date_6 = today_start.date() - timedelta(days=6)
        end_date_6 = today_start.date() - timedelta(days=1)
        start_str_6 = start_date_6.strftime("%Y-%m-%d")
        end_str_6 = end_date_6.strftime("%Y-%m-%d")

        match_base_hourly = {"area_id": str(area_id), "date": {"$gte": start_str_6, "$lte": end_str_6}}
        if group_id is not None:
            match_base_hourly["group_id"] = str(group_id)

        coll_hourly = get_collection("agv_hourly_work_duration")
        pipe_6 = [
            {"$match": match_base_hourly},
            {
                "$group": {
                    "_id": "$date",
                    "InTask_duration_minutes": {"$sum": "$InTask_duration_minutes"},
                    "Idle_duration_minutes": {"$sum": "$Idle_duration_minutes"},
                    "record_count": {"$sum": 1},
                }
            },
        ]
        rows_6 = await coll_hourly.aggregate(pipe_6).to_list(length=None)

        by_date_6 = {}
        for r in rows_6:
            d = r["_id"]
            cnt = r.get("record_count") or 0
            s_i = r.get("InTask_duration_minutes") or 0
            s_idle = r.get("Idle_duration_minutes") or 0
            by_date_6[d] = {"sum_intask": s_i, "sum_idle": s_idle, "record_count": cnt}

        daily_dates_6 = [(start_date_6 + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6)]
        daily_results = []
        for date_str in daily_dates_6:
            day = by_date_6.get(date_str, {"sum_intask": 0, "sum_idle": 0, "record_count": 0})
            cnt = day["record_count"]
            avg_intask = (day["sum_intask"] / cnt) if cnt > 0 else 0
            avg_idle = (day["sum_idle"] / cnt) if cnt > 0 else 0
            total = avg_intask + avg_idle
            intask_pct = round((avg_intask / TOTAL_MINUTES_PER_DAY) * 100, 2) if TOTAL_MINUTES_PER_DAY > 0 else 0
            idle_pct = round((avg_idle / TOTAL_MINUTES_PER_DAY) * 100, 2) if TOTAL_MINUTES_PER_DAY > 0 else 0
            efficiency = round(avg_intask / avg_idle, 2) if avg_idle > 0 else 0
            daily_results.append({
                "date": date_str,
                "intask_count": round(avg_intask, 2),
                "idle_count": round(avg_idle, 2),
                "total_count": round(total, 2),
                "intask_percentage": intask_pct,
                "idle_percentage": idle_pct,
                "efficiency": efficiency,
            })

        # --- 1 ngày (hôm nay) từ agv_data ---
        coll_agv = get_collection("agv_data")
        match_today = {
            "created_at": {"$gte": today_start, "$lte": now},
            "state": {"$in": ["InTask", "Idle"]},
            "area_id": str(area_id),
        }
        if group_id is not None:
            match_today["group_id"] = str(group_id)
        pipe_today = [
            {"$match": match_today},
            {
                "$group": {
                    "_id": "$state",
                    "count": {"$sum": 1},
                }
            },
        ]
        rows_today = await coll_agv.aggregate(pipe_today).to_list(length=None)

        intask_today = 0
        idle_today = 0
        for r in rows_today:
            if r["_id"] == "InTask":
                intask_today = r.get("count", 0)
            elif r["_id"] == "Idle":
                idle_today = r.get("count", 0)
        total_today = intask_today + idle_today
        intask_pct_today = round((intask_today / total_today * 100), 2) if total_today > 0 else 0
        idle_pct_today = round((idle_today / total_today * 100), 2) if total_today > 0 else 0
        eff_today = round(intask_today / idle_today, 2) if idle_today > 0 else 0

        daily_results.append({
            "date": today_str,
            "intask_count": intask_today,
            "idle_count": idle_today,
            "total_count": total_today,
            "intask_percentage": intask_pct_today,
            "idle_percentage": idle_pct_today,
            "efficiency": eff_today,
        })

        daily_dates = daily_dates_6 + [today_str]

        result = {
            "status": "success",
            "area_id": area_id,
            "date_range": {"start": daily_dates[0], "end": daily_dates[-1]},
            "data": daily_results,
        }
        if group_id is not None:
            result["group_id"] = group_id
        return result

    except Exception as e:
        logger.error(f"Error in get_area_efficiency_by_8d: {e}")
        return {"status": "error", "message": str(e)}


async def get_area_efficiency_by_1d(area_id: str):
    """
    Lấy hiệu suất theo area từ agv_data cho đúng 1 ngày (hôm nay, từ 00:00 đến thời điểm hiện tại).
    Return cùng định dạng get_area_efficiency_by_8d nhưng data chỉ có 1 phần tử.
    """
    try:
        collection = get_collection("agv_data")

        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_time = today_start  # Chỉ 1 ngày: từ 00:00 hôm nay
        end_time = now

        match_filter = {
            "created_at": {"$gte": start_time, "$lte": end_time},
            "state": {"$in": ["InTask", "Idle"]},
            "area_id": str(area_id),
        }

        pipeline = [
            {"$match": match_filter},
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                        "state": "$state",
                    },
                    "count": {"$sum": 1},
                }
            },
        ]

        cursor = collection.aggregate(pipeline)
        rows = await cursor.to_list(length=None)

        by_date = {}
        for r in rows:
            d = r["_id"]["date"]
            state = r["_id"]["state"]
            cnt = r["count"]
            if d not in by_date:
                by_date[d] = {"InTask": 0, "Idle": 0}
            by_date[d][state] = cnt

        today_str = today_start.strftime("%Y-%m-%d")
        daily_dates = [today_str]

        daily_results = []
        for date_str in daily_dates:
            day = by_date.get(date_str, {"InTask": 0, "Idle": 0})
            intask_count = day["InTask"]
            idle_count = day["Idle"]
            total = intask_count + idle_count
            intask_pct = round((intask_count / total * 100), 2) if total > 0 else 0
            idle_pct = round((idle_count / total * 100), 2) if total > 0 else 0
            efficiency = round(intask_count / idle_count, 2) if idle_count > 0 else 0

            daily_results.append({
                "date": date_str,
                "intask_count": intask_count,
                "idle_count": idle_count,
                "total_count": total,
                "intask_percentage": intask_pct,
                "idle_percentage": idle_pct,
                "efficiency": efficiency,
            })

        return {
            "status": "success",
            "area_id": area_id,
            "date_range": {"start": today_str, "end": today_str},
            "data": daily_results,
        }

    except Exception as e:
        logger.error(f"Error in get_area_efficiency_by_1d: {e}")
        return {"status": "error", "message": str(e)}


async def get_area_efficiency_by_6d_from_hourly(area_id: str):
    """
    Lấy hiệu suất theo area từ agv_hourly_work_duration: 6 ngày trước hôm nay (today-6 -> today-1).
    Cộng InTask/Idle theo từng ngày, chia cho số bản ghi (count) để ra phút trung bình/robot, rồi chia 890 để ra %.
    Return cùng định dạng get_area_efficiency_by_8d; ngày không có data trả về 0.
    """
    try:
        collection = get_collection("agv_hourly_work_duration")

        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        # 6 ngày trước hôm nay: (today-6) đến (today-1) inclusive
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

        # Danh sách 6 ngày từ (today-6) -> (today-1)
        daily_dates = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6)]

        TOTAL_MINUTES_PER_DAY = 890

        daily_results = []
        for date_str in daily_dates:
            day = by_date.get(
                date_str,
                {"InTask_duration_minutes": 0, "Idle_duration_minutes": 0, "record_count": 0},
            )
            cnt = day["record_count"]
            sum_intask = day["InTask_duration_minutes"]
            sum_idle = day["Idle_duration_minutes"]
            # Phút trung bình = tổng / số bản ghi (nếu có bản ghi)
            avg_intask = (sum_intask / cnt) if cnt > 0 else 0
            avg_idle = (sum_idle / cnt) if cnt > 0 else 0
            total = avg_intask + avg_idle

            intask_pct = round((avg_intask / TOTAL_MINUTES_PER_DAY) * 100, 2) if TOTAL_MINUTES_PER_DAY > 0 else 0
            idle_pct = round((avg_idle / TOTAL_MINUTES_PER_DAY) * 100, 2) if TOTAL_MINUTES_PER_DAY > 0 else 0
            efficiency = round(avg_intask / avg_idle, 2) if avg_idle > 0 else 0

            daily_results.append({
                "date": date_str,
                "intask_count": round(avg_intask, 2),
                "idle_count": round(avg_idle, 2),
                "total_count": round(total, 2),
                "intask_percentage": intask_pct,
                "idle_percentage": idle_pct,
                "efficiency": efficiency,
                "record_count": cnt,
            })

        return {
            "status": "success",
            "area_id": area_id,
            "date_range": {"start": daily_dates[0], "end": daily_dates[-1]},
            "data": daily_results,
        }

    except Exception as e:
        logger.error(f"Error in get_area_efficiency_by_6d_from_hourly: {e}")
        return {"status": "error", "message": str(e)}


async def get_task_details_stats(
    area_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    device_code: Optional[str] = None,
):
    try:
        collection = get_collection("task_details")

        # ── 1. Xác định khoảng ngày ──────────────────────────────────────────
        yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

        if start_date is None and end_date is None:
            start_date = end_date = yesterday_str
        elif start_date is None:
            start_date = end_date
        elif end_date is None:
            end_date = start_date

        # updated_at lưu dạng ISO string "YYYY-MM-DDTHH:MM:SS.ffffff"
        start_str = f"{start_date}T00:00:00"
        end_str   = f"{end_date}T23:59:59.999999"

        # ── 2. Xây dựng bộ lọc ───────────────────────────────────────────────
        match_filter: dict = {
            "updated_at": {"$gte": start_str, "$lte": end_str}
        }

        if area_id is not None and str(area_id).strip():
            match_filter["area_id"] = str(area_id).strip()

        if device_code:
            codes = [c.strip() for c in device_code.split(",") if c.strip()]
            if codes:
                match_filter["device_num"] = {"$in": codes}

        # ── 3. Lấy toàn bộ document phù hợp ─────────────────────────────────
        rows = await collection.find(match_filter).to_list(length=None)

        n = len(rows)

        # ── 4. Tính tổng rồi chia trung bình ─────────────────────────────────
        if n == 0:
            summary = {
                "total_tasks":          0,
                "avg_total_duration":   0.0,
                "avg_Get_shelf":        0.0,
                "avg_Shelf_lifting":    0.0,
                "avg_Shelf_transport":  0.0,
            }
        else:
            sum_total    = sum(doc.get("total_duration", 0) or 0 for doc in rows)
            sum_get      = sum(doc.get("Get_shelf", 0) or 0 for doc in rows)
            sum_lifting  = sum(doc.get("Shelf_lifting", 0) or 0 for doc in rows)
            sum_transport = sum(doc.get("Shelf_transport", 0) or 0 for doc in rows)

            summary = {
                "total_tasks":          n,
                "avg_total_duration":   round(sum_total / n, 2),
                "avg_Get_shelf":        round(sum_get / n, 2),
                "avg_Shelf_lifting":    round(sum_lifting / n, 2),
                "avg_Shelf_transport":  round(sum_transport / n, 2),
            }

        logger.info(
            f"task-details-statistics: area={area_id} {start_date}~{end_date} "
            f"device={device_code} → {n} docs"
        )

        return {
            "status":          "success",
            "time_range":      f"{start_date} to {end_date}",
            "collection_used": "task_details",
            "summary":         summary,
        }

    except Exception as e:
        logger.error(f"Error in get_task_details_stats: {e}")
        return {"status": "error", "message": str(e)}


async def get_task_duration_distribution(
    area_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    device_code: Optional[str] = None,
):
    """
    Phân bổ số lệnh theo khoảng thời gian thực hiện (total_duration, đơn vị giây).
    - Mặc định (không truyền ngày): lấy dữ liệu ngày hôm qua.
    - Nhóm:
        under_2min  : total_duration < 120s
        2to3min     : 120s <= total_duration < 180s
        3to4min     : 180s <= total_duration < 240s
        4to5min     : 240s <= total_duration < 300s
        over_5min   : total_duration >= 300s
    """
    try:
        collection = get_collection("task_details")

        yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

        if start_date is None and end_date is None:
            start_date = end_date = yesterday_str
        elif start_date is None:
            start_date = end_date
        elif end_date is None:
            end_date = start_date

        start_str = f"{start_date}T00:00:00"
        end_str   = f"{end_date}T23:59:59.999999"

        match_filter: dict = {
            "updated_at": {"$gte": start_str, "$lte": end_str}
        }

        if area_id is not None and str(area_id).strip():
            match_filter["area_id"] = str(area_id).strip()

        if device_code:
            codes = [c.strip() for c in device_code.split(",") if c.strip()]
            if codes:
                match_filter["device_num"] = {"$in": codes}

        rows = await collection.find(match_filter, {"total_duration": 1, "_id": 0}).to_list(length=None)

        buckets = {
            "under_2min": 0,
            "2to3min":    0,
            "3to4min":    0,
            "4to5min":    0,
            "over_5min":  0,
        }

        for doc in rows:
            d = doc.get("total_duration", 0) or 0
            if d < 120:
                buckets["under_2min"] += 1
            elif d < 180:
                buckets["2to3min"] += 1
            elif d < 240:
                buckets["3to4min"] += 1
            elif d < 300:
                buckets["4to5min"] += 1
            else:
                buckets["over_5min"] += 1

        total = len(rows)

        distribution = [
            {"label": "under_2min", "count": buckets["under_2min"],
             "percentage": round(buckets["under_2min"] / total * 100, 2) if total else 0},
            {"label": "2to3min",    "count": buckets["2to3min"],
             "percentage": round(buckets["2to3min"]    / total * 100, 2) if total else 0},
            {"label": "3to4min",    "count": buckets["3to4min"],
             "percentage": round(buckets["3to4min"]    / total * 100, 2) if total else 0},
            {"label": "4to5min",    "count": buckets["4to5min"],
             "percentage": round(buckets["4to5min"]    / total * 100, 2) if total else 0},
            {"label": "over_5min",  "count": buckets["over_5min"],
             "percentage": round(buckets["over_5min"]  / total * 100, 2) if total else 0},
        ]

        logger.info(
            f"task-duration-distribution: area={area_id} {start_date}~{end_date} "
            f"device={device_code} → {total} docs"
        )

        return {
            "status":          "success",
            "time_range":      f"{start_date} to {end_date}",
            "collection_used": "task_details",
            "total_tasks":     total,
            "distribution":    distribution,
        }

    except Exception as e:
        logger.error(f"Error in get_task_duration_distribution: {e}")
        return {"status": "error", "message": str(e)}
