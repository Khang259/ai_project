import collections
from datetime import datetime, timedelta
from app.core.database import get_collection
from shared.logging import get_logger
from typing import Optional
import httpx
from app.core.config import settings


ics_url = f"http://{settings.ics_host}:7000"
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
                    "device_code": record.get("deviceCode"),
                    "device_name": record.get("deviceName"),
                    "battery": record.get("battery"),
                    "speed": record.get("speed"),
                    "state": record.get("state"),
                    "payLoad": record.get("payLoad"),
                    "created_at": datetime.now()
                }
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
    return str(route.get("group_id")) if route.get("group_id") else None

async def get_agv_position(payload: list):
    """
    Group AGV data theo group_id và return dict {group_id: [list of robots]}
    """
    grouped_data = {}
    
    for record in payload:
        device_code = record.get("deviceCode")
        if not device_code:
            continue
            
        # Get group_id for this device
        group_id = await get_group_id(device_code)
        if not group_id or group_id == "None":
            continue
        
        # Prepare robot info
        robot_info = {
            "device_code": device_code,
            "device_name": record.get("deviceName"),
            "battery": record.get("battery"),
            "speed": record.get("speed"),
            "devicePosition": record.get("devicePosition"),
            "orientation": record.get("orientation"),   
            "devicePositionReceived": record.get("devicePositionRec"),
            "created_at": datetime.now().isoformat()
        }
        
        # Group by group_id
        if group_id not in grouped_data:
            grouped_data[group_id] = []
        grouped_data[group_id].append(robot_info)
    
    return grouped_data

async def get_battery_agv(group_id: Optional[str] = None):
    try:
        battery_collection = get_collection("battery_collection")
        
        # Tính ngày hôm trước
        now = datetime.now()
        yesterday_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_end = yesterday_start + timedelta(days=1)  # 00:00:00 của ngày hôm nay
        
        # Build query
        query = {
            "snapshot_time": {
                "$gte": yesterday_start,
                "$lt": yesterday_end
            }
        }
        
        # Thêm filter group_id nếu có
        if group_id:
            query["group_id"] = group_id
        
        # Query database
        cursor = battery_collection.find(query).sort("snapshot_time", 1)  # Sort theo thời gian tăng dần
        battery_data = await cursor.to_list(length=None)
        
        if not battery_data:
            logger.info(f"No battery data found for yesterday (group_id: {group_id or 'all'})")
            return {
                "status": "success",
                "data": [],
                "date": yesterday_start.date().isoformat(),
                "group_id": group_id,
                "count": 0
            }
        
        logger.info(f"Retrieved {len(battery_data)} battery records for yesterday (group_id: {group_id or 'all'})")
        
        return {
            "status": "success",
            "data": battery_data,
            "date": yesterday_start.date().isoformat(),
            "group_id": group_id,
            "count": len(battery_data)
        }
        
    except Exception as e:
        logger.error(f"Error getting battery AGV data: {e}")
        return {
            "status": "error",
            "message": str(e),
            "data": []
        }

async def save_agv_position_snapshot(grouped_data: dict = None):
    try:
        battery_collection = get_collection("battery_collection")
        snapshot_time = datetime.now().replace(minute=0, second=0, microsecond=0)

        current_hour = snapshot_time.hour
        if current_hour < 8 or current_hour >= 19:  # < 8h hoặc >= 19h thì không chạy
            logger.debug(f"Snapshot skipped: outside working hours (current hour: {current_hour})")
            return {
                "status": "skipped",
                "message": f"Snapshot only runs between 8:00 and 19:00. Current hour: {current_hour}",
                "snapshot_time": snapshot_time.isoformat()
            }
        
        if not grouped_data:
            logger.warning("No grouped_data provided")
            return {"status": "error", "message": "No data provided"}
        
        # ✅ TỐI ƯU 1: Batch check tất cả groups cùng lúc (1 query thay vì N queries)
        group_ids = list(grouped_data.keys())
        existing_snapshots = await battery_collection.find({
            "group_id": {"$in": group_ids},
            "snapshot_time": snapshot_time
        }).to_list(length=None)
        
        # Tạo set các group_ids đã có snapshot
        existing_group_ids = {snapshot["group_id"] for snapshot in existing_snapshots}
        
        # Tính toán và chuẩn bị data cho các groups chưa có snapshot
        battery_data_to_insert = []
        saved_groups = []
        skipped_groups = list(existing_group_ids)
        
        for group_id, robots_list in grouped_data.items():
            if group_id in existing_group_ids:
                logger.debug(f"Snapshot already exists for group {group_id}")
                continue
            
            # Tính toán battery cho group này
            if not robots_list or len(robots_list) == 0:
                logger.warning(f"No robots in group {group_id}")
                continue
            
            sum_battery = 0
            valid_count = 0
            
            for robot in robots_list:
                battery = robot.get("battery")
                if battery is not None:
                    try:
                        sum_battery += float(battery)
                        valid_count += 1
                    except (ValueError, TypeError):
                        continue
            
            if valid_count == 0:
                logger.warning(f"No valid battery data for group {group_id}")
                continue
            
            avg_battery = sum_battery / valid_count
            
            battery_data_to_insert.append({
                "group_id": group_id,
                "avg_battery": round(avg_battery, 2),
                "snapshot_time": snapshot_time,
                "robot_count": len(robots_list),
                "valid_battery_count": valid_count,
                "created_at": datetime.now().isoformat()
            })
            saved_groups.append(group_id)
        
        # ✅ TỐI ƯU 2: Batch insert tất cả cùng lúc (1 query thay vì N queries)
        if battery_data_to_insert:
            await battery_collection.insert_many(battery_data_to_insert)
            logger.info(f"Saved {len(battery_data_to_insert)} battery snapshots at {snapshot_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        return {
            "status": "success",
            "saved_groups": saved_groups,
            "skipped_groups": skipped_groups,
            "total_groups": len(grouped_data),
            "snapshot_time": snapshot_time.isoformat()
        }
            
    except Exception as e:
        logger.error(f"Error saving AGV position snapshot: {e}")
        return {"status": "error", "message": str(e)}

async def filter_count_task(payload):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f'{ics_url}/ics/out/task/getOrderList', json=payload)
            response.raise_for_status()
            response_data = response.json()
            
            # Kiểm tra response code
            if response_data.get("code") != 1000:
                logger.warning(f"API returned code {response_data.get('code')}: {response_data.get('desc', 'Unknown error')}")
                return {
                    "status": "error",
                    "message": response_data.get("desc", "API returned error code"),
                    "tasks_with_end_time": [],
                    "total_tasks": 0,
                    "filtered_count": 0
                }
            
            # Lấy danh sách tasks từ response
            tasks = response_data.get("data", {}).get("Tasks", [])
            total_tasks = len(tasks)
            
            # Lọc các task có ActualEndTime
            tasks_with_end_time = [
                task for task in tasks 
                if task.get("ActualEndTime") is not None and task.get("ActualEndTime") != ""
            ]
            filtered_count = len(tasks_with_end_time)
            
            logger.info(f"Filtered {filtered_count} tasks with ActualEndTime out of {total_tasks} total tasks")
            
            return {
                "status": "success",
                "total_tasks": total_tasks,
                "filtered_count": filtered_count
            }

    except httpx.HTTPError as e:
        logger.error(f"HTTP error when calling get_in_progress_task: {e}")
        return {
            "status": "error",
            "message": f"HTTP error: {str(e)}",
            "tasks_with_end_time": [],
            "total_tasks": 0,
            "filtered_count": 0
        }
    except Exception as e:
        logger.error(f"Error in get_in_progress_task: {e}")
        return {
            "status": "error",
            "message": str(e),
            "tasks_with_end_time": [],
            "total_tasks": 0,
            "filtered_count": 0
        }

async def get_in_progress_task(group_id: Optional[str] = None):
    if group_id:
        payload = {"areaId": group_id, "pageSize": "50"}
        logger.info(f"Getting in progress task for group {group_id}")
        result = await filter_count_task(payload)
        return result
    else:
        area_collection = get_collection("area")
        total_tasks = 0
        filtered_count = 0
        for area in await area_collection.find().to_list(length=None):
            payload = {"areaId": area["area_id"], "pageSize": "50"}
            result = await filter_count_task(payload)
            logger.info(f"Getting in progress task for group {area['area_id']}: {result}")
            if result["status"] == "success":
                total_tasks += result["total_tasks"]
                filtered_count += result["filtered_count"]
        return {
            "status": "success",
            "total_tasks": total_tasks,
            "filtered_count": filtered_count
        }

async def get_task_dashboard(group_id: Optional[str] = None):
    tasks_collection = get_collection("tasks")
    base_query = {}
    query_by_week = {}
    query_by_month = {}

    # Calculate time thresholds as ISO strings (since updated_at is stored as ISO string)
    week_ago = (datetime.now() - timedelta(weeks=1)).isoformat()
    month_ago = (datetime.now() - timedelta(days=30)).isoformat()

    if group_id:
        result = await get_in_progress_task(group_id)
        if result["status"] == "success":
            in_progress_tasks = result["filtered_count"]
        else:
            in_progress_tasks = 0
        base_query["group_id"] = group_id
        query_by_week["group_id"] = group_id
        query_by_week["updated_at"] = {"$gte": week_ago}
        query_by_month["group_id"] = group_id
        query_by_month["updated_at"] = {"$gte": month_ago}
    else:
        # If no group_id, still filter by time for week/month queries
        result = await get_in_progress_task()
        if result["status"] == "success":
            in_progress_tasks = result["filtered_count"]
        else:
            in_progress_tasks = 0
        query_by_week["updated_at"] = {"$gte": week_ago}
        query_by_month["updated_at"] = {"$gte": month_ago}
    
    tasks = tasks_collection.find(base_query)
    tasks = await tasks.to_list(length=None)

    tasks_by_week = tasks_collection.find(query_by_week)
    tasks_by_week = await tasks_by_week.to_list(length=None)

    tasks_by_month = tasks_collection.find(query_by_month)
    tasks_by_month = await tasks_by_month.to_list(length=None)
    
    # Count tasks from list (not from collection)
    completed_tasks = len([task for task in tasks if task.get("status") == 20])
    cancelled_tasks = len([task for task in tasks if task.get("status") == 3])
    failed_tasks = len([task for task in tasks if task.get("status") == 4])

    completed_tasks_by_week = len([task for task in tasks_by_week if task.get("status") == 20])
    completed_tasks_by_month = len([task for task in tasks_by_month if task.get("status") == 20])
    cancelled_tasks_by_week = len([task for task in tasks_by_week if task.get("status") == 3])
    cancelled_tasks_by_month = len([task for task in tasks_by_month if task.get("status") == 3])
    failed_tasks_by_week = len([task for task in tasks_by_week if task.get("status") == 4])
    failed_tasks_by_month = len([task for task in tasks_by_month if task.get("status") == 4])
    
    return {
        "status": "success",
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "cancelled_tasks": cancelled_tasks,
        "failed_tasks": failed_tasks,
        "completed_tasks_by_week": completed_tasks_by_week,
        "completed_tasks_by_month": completed_tasks_by_month,
        "cancelled_tasks_by_week": cancelled_tasks_by_week,
        "cancelled_tasks_by_month": cancelled_tasks_by_month,
        "failed_tasks_by_week": failed_tasks_by_week,
        "failed_tasks_by_month": failed_tasks_by_month
    }

async def get_success_task_by_hour(group_id: Optional[str] = None):
    tasks_collection = get_collection("tasks")
    # Lấy ngày hôm qua
    yesterday = datetime.now() - timedelta(days=1)
    # Thời gian bắt đầu: 8:00:00 của ngày hôm qua
    start_time = yesterday.replace(hour=8, minute=0, second=0, microsecond=0)
    # Thời gian kết thúc: 19:59:59.999999 của ngày hôm qua
    end_time = yesterday.replace(hour=19, minute=59, second=59, microsecond=999999)
    
    base_query = {
        "updated_at": {"$gte": start_time, "$lte": end_time}
    }
    if group_id:
        base_query["group_id"] = group_id
    tasks = tasks_collection.find(base_query)
    tasks = await tasks.to_list(length=None)
    
    # Group tasks theo group_id - luôn trả về format đồng nhất
    tasks_by_group = {}
    for task in tasks:
        task_group_id = task.get("group_id")
        if task_group_id:
            if task_group_id not in tasks_by_group:
                tasks_by_group[task_group_id] = []
            tasks_by_group[task_group_id].append(task)
    
    # Count completed tasks by group và tính toán thống kê
    groups_statistics = {}
    for group_id, group_tasks in tasks_by_group.items():
        total_tasks_in_group = len(group_tasks)
        completed_tasks = [task for task in group_tasks if task.get("status") == 20]
        completed_count = len(completed_tasks)
        completion_rate = round((completed_count / total_tasks_in_group * 100), 2) if total_tasks_in_group > 0 else 0
        
        groups_statistics[group_id] = {
            "total_tasks": total_tasks_in_group,
            "completed_count": completed_count,
            "completion_rate": completion_rate
        }
    
    # Trả về format đồng nhất với metadata để frontend dễ render
    return {
        "data": groups_statistics,
        "total_groups": len(groups_statistics),
        "total_tasks": len(tasks),
        "filtered_by_group_id": group_id if group_id else None
    }


async def reverse_dashboard_data():
    try:
        agv_collection = get_collection("agv_data")
        daily_stats_collection = get_collection("agv_daily_statistics")
        
        # Lấy ngày hôm nay (00:00:00 đến 23:59:59)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        today_date = today.date()  # Ngày hôm nay dạng date
        
        logger.info(f"Starting reverse_dashboard_data for {today_date}")
        
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
                
                # Metadata
                "date_time": today_date,  # Ngày hôm nay
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

def get_time_filter_complicated(time_filter: str):
    now = datetime.now()

    if time_filter == "d":
        # Theo ngày hôm nay
        start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
        collection = "agv_data"

    elif time_filter == "w":
        # 7 ngày gần nhất
        start = now - timedelta(weeks=1)
        end = now
        collection = "agv_daily_statistics"

    elif time_filter == "m":
        # 30 ngày gần nhất
        start = now - timedelta(days=30)
        end = now
        collection = "agv_daily_statistics" 

    else:
        raise ValueError("Invalid time_filter (chỉ chấp nhận: d, w, m)")

    return start, end, collection


async def get_all_robots_payload_data(
    time_filter: str,
    device_code: str = None
):
    """
    Lấy dữ liệu payload (có tải/không tải) của TẤT CẢ robot
    
    Logic:
    - "d": Query từ agv_data (raw data) và tính toán - data nhiều, nặng
    - "w", "m": Query từ agv_daily_statistics (đã tính sẵn), chỉ tổng hợp lại
    
    Args:
        time_filter: "d", "w", "m"
        state: trạng thái cụ thể ("InTask", "Idle", etc.)
        device_code: mã thiết bị để lọc (tùy chọn)
    
    Returns:
        dict: dữ liệu payload của từng robot riêng biệt
    """
    try:
        start, end, collection_name = get_time_filter_complicated(time_filter)
        collection = get_collection(collection_name)

        # Base query
        base_query = {
            "created_at": {"$gte": start, "$lt": end}
        }

        # Lọc theo device_code nếu có
        if device_code:
            base_query["device_code"] = device_code

        robots_data = {}

        # ===== LOGIC CHO FILTER THEO NGÀY ("d") - Query từ raw data =====
        if time_filter == "d":
            # Xác định format date
            date_format = "%Y-%m-%d"
            
            # Pipeline để lấy dữ liệu từ agv_data
            pipeline = [
                {"$match": base_query},
                {
                    "$group": {
                        "_id": {
                            "device_code": "$device_code",
                            "device_name": "$device_name",
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
                {"$match": {"_id.state": "InTask"}},
                {"$sort": {"_id.device_code": 1, "_id.date": 1}}
            ]
            
            cursor = collection.aggregate(pipeline)
            result = await cursor.to_list(length=None)
            
            # Tổ chức dữ liệu theo từng robot
            for item in result:
                device_code_key = item["_id"]["device_code"]
                device_name_key = item["_id"]["device_name"]
                date_key = item["_id"]["date"]
                payload = item["_id"]["payLoad"]
                count = item["count"]
                
                # Chỉ xử lý nếu payload là "0.0" hoặc "1.0"
                if payload in ["0.0", "1.0"]:
                    # Khởi tạo robot nếu chưa có
                    if device_code_key not in robots_data:
                        robots_data[device_code_key] = {
                            "device_code": device_code_key,
                            "device_name": device_name_key,
                            "time_series": {},
                        }
                    
                    # Khởi tạo date nếu chưa có
                    if date_key not in robots_data[device_code_key]["time_series"]:
                        robots_data[device_code_key]["time_series"][date_key] = {
                            "payLoad_0_0_count": 0,
                            "payLoad_1_0_count": 0,
                            "total_records": 0
                        }
                    
                    # Cập nhật số lượng
                    if payload == "0.0":
                        robots_data[device_code_key]["time_series"][date_key]["payLoad_0_0_count"] = count
                    elif payload == "1.0":
                        robots_data[device_code_key]["time_series"][date_key]["payLoad_1_0_count"] = count
                    
                    robots_data[device_code_key]["time_series"][date_key]["total_records"] += count

        # ===== LOGIC CHO FILTER THEO TUẦN/THÁNG ("w", "m") - Query từ daily_statistics =====
        else:
            # Query từ agv_daily_statistics - data đã được tính sẵn theo ngày
            cursor = collection.find(base_query)
            daily_stats = await cursor.to_list(length=None)
            
            for stat in daily_stats:
                device_code_key = stat["device_code"]
                device_name_key = stat["device_name"]
                date_key = stat["date"]
                
                # Lấy dữ liệu payload đã tính sẵn (chỉ lấy InTask vì state filter)  
                payload_0_0_count = stat.get("InTask_payLoad_0_0_count", 0)
                payload_1_0_count = stat.get("InTask_payLoad_1_0_count", 0)
                total_payload_records = stat.get("InTask_total_payload_records", 0)
                
                # Khởi tạo robot nếu chưa có
                if device_code_key not in robots_data:
                    robots_data[device_code_key] = {
                        "device_code": device_code_key,
                        "device_name": device_name_key,
                        "time_series": {},
                    }
                
                # Thêm dữ liệu theo ngày vào time_series
                robots_data[device_code_key]["time_series"][date_key] = {
                    "payLoad_0_0_count": payload_0_0_count,
                    "payLoad_1_0_count": payload_1_0_count,
                    "total_records": total_payload_records,
                    "payLoad_0_0_percentage": stat.get("InTask_payLoad_0_0_percentage", 0),
                    "payLoad_1_0_percentage": stat.get("InTask_payLoad_1_0_percentage", 0)
                }
        
        # ===== TÍNH PHẦN TRĂM CHO SUMMARY (áp dụng cho cả 2 trường hợp) =====
        for device_code_key in robots_data:
            robot = robots_data[device_code_key]
            
            # Nếu filter "d", cần tính phần trăm cho time_series
            if time_filter == "d":
                for date_key in robot["time_series"]:
                    total_daily = robot["time_series"][date_key]["total_records"]
                    if total_daily > 0:
                        robot["time_series"][date_key]["payLoad_0_0_percentage"] = round(
                            (robot["time_series"][date_key]["payLoad_0_0_count"] / total_daily) * 100, 2
                        )
                        robot["time_series"][date_key]["payLoad_1_0_percentage"] = round(
                            (robot["time_series"][date_key]["payLoad_1_0_count"] / total_daily) * 100, 2
                        )
                    else:
                        robot["time_series"][date_key]["payLoad_0_0_percentage"] = 0
                        robot["time_series"][date_key]["payLoad_1_0_percentage"] = 0
        
        return {
            "status": "success",
            "time_range": f"{start} to {end}",
            "time_unit": time_filter,
            "collection_used": collection_name,
            "total_robots": len(robots_data),
            "robots": list(robots_data.values())
        }

    except Exception as e:
        logger.error(f"Error getting all robots payload data: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


async def get_all_robots_work_status(
    time_filter: str,
    device_code: str = None
):
    """
    Lấy dữ liệu work status (InTask/Idle) của TẤT CẢ robot
    
    Logic:
    - "d": Query từ agv_data (raw data) và tính toán - data nhiều, nặng
    - "w", "m": Query từ agv_daily_statistics (đã tính sẵn), chỉ tổng hợp lại
    
    Args:
        time_filter: "d", "w", "m"
        device_code: mã thiết bị để lọc (tùy chọn)
    
    Returns:
        dict: dữ liệu work status của từng robot riêng biệt
    """
    try:
        start, end, collection_name = get_time_filter_complicated(time_filter)
        collection = get_collection(collection_name)

        # Base query
        base_query = {
            "created_at": {"$gte": start, "$lt": end}
        }

        # Lọc theo device_code nếu có
        if device_code:
            base_query["device_code"] = device_code

        robots_data = {}

        # ===== LOGIC CHO FILTER THEO NGÀY ("d") - Query từ raw data =====
        if time_filter == "d":
            # Xác định format date
            date_format = "%Y-%m-%d"
            
            # Pipeline để lấy dữ liệu từ agv_data
            pipeline = [
                {"$match": base_query},
                {
                    "$group": {
                        "_id": {
                            "device_code": "$device_code",
                            "device_name": "$device_name",
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
                {"$sort": {"_id.device_code": 1, "_id.date": 1}}
            ]
            
            cursor = collection.aggregate(pipeline)
            result = await cursor.to_list(length=None)
            
            # Tổ chức dữ liệu theo từng robot
            for item in result:
                device_code_key = item["_id"]["device_code"]
                device_name_key = item["_id"]["device_name"]
                date_key = item["_id"]["date"]
                state_value = item["_id"]["state"]
                count = item["count"]
                
                # Khởi tạo robot nếu chưa có
                if device_code_key not in robots_data:
                    robots_data[device_code_key] = {
                        "device_code": device_code_key,
                        "device_name": device_name_key,
                        "time_series": {},
                    }
                
                # Khởi tạo date nếu chưa có
                if date_key not in robots_data[device_code_key]["time_series"]:
                    robots_data[device_code_key]["time_series"][date_key] = {
                        "InTask_count": 0,
                        "Idle_count": 0,
                        "total_records": 0
                    }
                
                # Cập nhật số lượng
                if state_value == "InTask":
                    robots_data[device_code_key]["time_series"][date_key]["InTask_count"] = count
                elif state_value == "Idle":
                    robots_data[device_code_key]["time_series"][date_key]["Idle_count"] = count
                
                robots_data[device_code_key]["time_series"][date_key]["total_records"] += count

        # ===== LOGIC CHO FILTER THEO TUẦN/THÁNG ("w", "m") - Query từ daily_statistics =====
        else:
            # Query từ agv_daily_statistics - data đã được tính sẵn theo ngày
            cursor = collection.find(base_query)
            daily_stats = await cursor.to_list(length=None)
            
            for stat in daily_stats:
                device_code_key = stat["device_code"]
                device_name_key = stat["device_name"]
                date_key = stat["date"]
                
                # Lấy dữ liệu work status đã tính sẵn
                intask_count = stat.get("InTask_count", 0)
                idle_count = stat.get("Idle_count", 0)
                total_work_records = stat.get("total_work_records", 0)
                
                # Khởi tạo robot nếu chưa có
                if device_code_key not in robots_data:
                    robots_data[device_code_key] = {
                        "device_code": device_code_key,
                        "device_name": device_name_key,
                        "time_series": {},
                    }
                
                # Thêm dữ liệu theo ngày vào time_series
                robots_data[device_code_key]["time_series"][date_key] = {
                    "InTask_count": intask_count,
                    "Idle_count": idle_count,
                    "total_records": total_work_records,
                    "InTask_percentage": stat.get("InTask_percentage", 0),
                    "Idle_percentage": stat.get("Idle_percentage", 0)
                }
        
        # ===== TÍNH PHẦN TRĂM CHO SUMMARY (áp dụng cho cả 2 trường hợp) =====
        for device_code_key in robots_data:
            robot = robots_data[device_code_key]
            
            # Nếu filter "d", cần tính phần trăm cho time_series
            if time_filter == "d":
                for date_key in robot["time_series"]:
                    total_daily = robot["time_series"][date_key]["total_records"]
                    if total_daily > 0:
                        robot["time_series"][date_key]["InTask_percentage"] = round(
                            (robot["time_series"][date_key]["InTask_count"] / total_daily) * 100, 2
                        )
                        robot["time_series"][date_key]["Idle_percentage"] = round(
                            (robot["time_series"][date_key]["Idle_count"] / total_daily) * 100, 2
                        )
                    else:
                        robot["time_series"][date_key]["InTask_percentage"] = 0
                        robot["time_series"][date_key]["Idle_percentage"] = 0
        
        return {
            "status": "success",
            "time_range": f"{start} to {end}",
            "time_unit": time_filter,
            "collection_used": collection_name,
            "total_robots": len(robots_data),
            "robots": list(robots_data.values())
        }

    except Exception as e:
        logger.error(f"Error getting all robots work status: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

