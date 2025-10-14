from datetime import datetime, timedelta
from app.core.database import get_collection
from shared.logging import get_logger

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
                agv_data = {
                    "device_code": record.get("deviceCode"),
                    "device_name": record.get("deviceName"),
                    "battery": record.get("battery"),
                    "speed": record.get("speed"),
                    "state": record.get("state"),
                    "payLoad": record.get("payLoad"),
                    "created_at": datetime.now()
                }
                agv_data.append(agv_data)
                saved_count += 1
        logger.info(f"Successfully saved {saved_count} AGV records")
        if len(agv_data) > 0:
            await agv_collection.insert_many(agv_data)
        return {"status": "success", "saved_count": saved_count}

    except Exception as e:
        logger.error(f"Error saving agv data: {e}")
        return {"status": "error", "message": str(e)}

def get_agv_position(payload: list):
    agv_info = [
        {
            "device_code": record.get("deviceCode"),
            "device_name": record.get("deviceName"),
            "battery": record.get("battery"),
            "speed": record.get("speed"),
            "devicePosition": record.get("devicePosition"),
            "orientation": record.get("orientation"),   
            "devicePositionReceived": record.get("devicePositionRec"),
        }
        for record in payload
    ]

    return agv_info

async def reverse_dashboard_data():
    
    return None

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
    time_filter: str,
    state: str,
    device_code: str = None
):
    """
    Lấy dữ liệu payload (có tải/không tải) của TẤT CẢ robot, có thể lọc theo device_code hoặc device_name
    
    Args:
        time_filter: "d", "w", "m"
        state: trạng thái cụ thể ("InTask", "Idle", etc.)
        device_code: mã thiết bị để lọc (tùy chọn)
        device_name: tên thiết bị để lọc (tùy chọn)
    
    Returns:
        dict: dữ liệu payload của từng robot riêng biệt
    """
    try:
        start, end = get_time_filter_simple(time_filter)
        agv_collection = get_collection("agv_data")

        # Base query
        base_query = {
            "created_at": {"$gte": start, "$lt": end}
        }

        # Lọc theo device_code hoặc device_name nếu có
        if device_code:
            base_query["device_code"] = device_code

        # Xác định format date theo time_filter
        date_format = {
            "d": "%Y-%m-%d",      # Theo ngày
            "w": "%Y-W%U",        # Theo tuần
            "m": "%Y-%m"          # Theo tháng
        }[time_filter]
        
        # Pipeline để lấy dữ liệu của từng robot riêng biệt
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
            {"$match": {"_id.state": state}},
            {"$sort": {"_id.device_code": 1, "_id.date": 1}}
        ]
        
        cursor = agv_collection.aggregate(pipeline)
        result = await cursor.to_list(length=None)
        
        # Tổ chức dữ liệu theo từng robot
        robots_data = {}
        
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
                        "summary": {
                            "total_payLoad_0_0_count": 0,
                            "total_payLoad_1_0_count": 0,
                            "total_records": 0,
                            "total_payLoad_0_0_percentage": 0,
                            "total_payLoad_1_0_percentage": 0
                        }
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
                    robots_data[device_code_key]["summary"]["total_payLoad_0_0_count"] += count
                elif payload == "1.0":
                    robots_data[device_code_key]["time_series"][date_key]["payLoad_1_0_count"] = count
                    robots_data[device_code_key]["summary"]["total_payLoad_1_0_count"] += count
                
                robots_data[device_code_key]["time_series"][date_key]["total_records"] += count
                robots_data[device_code_key]["summary"]["total_records"] += count
        
        # Tính phần trăm cho từng robot
        for device_code_key in robots_data:
            robot = robots_data[device_code_key]
            
            # Tính phần trăm cho từng ngày/tuần/tháng
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
            
            # Tính phần trăm tổng thể cho robot
            total_records = robot["summary"]["total_records"]
            if total_records > 0:
                robot["summary"]["total_payLoad_0_0_percentage"] = round(
                    (robot["summary"]["total_payLoad_0_0_count"] / total_records) * 100, 2
                )
                robot["summary"]["total_payLoad_1_0_percentage"] = round(
                    (robot["summary"]["total_payLoad_1_0_count"] / total_records) * 100, 2
                )
        
        return {
            "status": "success",
            "state": state,
            "time_range": f"{start} to {end}",
            "time_unit": time_filter,
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
    Lấy dữ liệu trạng thái làm việc (InTask/Idle) của TẤT CẢ robot, có thể lọc theo device_code hoặc device_name
    
    Args:
        time_filter: "d", "w", "m"
        device_code: mã thiết bị để lọc (tùy chọn)
        device_name: tên thiết bị để lọc (tùy chọn)
    
    Returns:
        dict: dữ liệu trạng thái làm việc của từng robot riêng biệt
    """
    try:
        start, end = get_time_filter_simple(time_filter)
        agv_collection = get_collection("agv_data")

        # Base query
        base_query = {
            "created_at": {"$gte": start, "$lt": end}
        }

        # Lọc theo device_code hoặc device_name nếu có
        if device_code:
            base_query["device_code"] = device_code

        # Xác định format date theo time_filter
        date_format = {
            "d": "%Y-%m-%d",      # Theo ngày
            "w": "%Y-W%U",        # Theo tuần
            "m": "%Y-%m"          # Theo tháng
        }[time_filter]
        
        # Pipeline để lấy dữ liệu của từng robot riêng biệt
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
        
        cursor = agv_collection.aggregate(pipeline)
        result = await cursor.to_list(length=None)
        
        # Tổ chức dữ liệu theo từng robot
        robots_data = {}
        
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
                    "summary": {
                        "total_InTask_count": 0,
                        "total_Idle_count": 0,
                        "total_records": 0,
                        "total_InTask_percentage": 0,
                        "total_Idle_percentage": 0
                    }
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
                robots_data[device_code_key]["summary"]["total_InTask_count"] += count
            elif state_value == "Idle":
                robots_data[device_code_key]["time_series"][date_key]["Idle_count"] = count
                robots_data[device_code_key]["summary"]["total_Idle_count"] += count
            
            robots_data[device_code_key]["time_series"][date_key]["total_records"] += count
            robots_data[device_code_key]["summary"]["total_records"] += count
        
        # Tính phần trăm cho từng robot
        for device_code_key in robots_data:
            robot = robots_data[device_code_key]
            
            # Tính phần trăm cho từng ngày/tuần/tháng
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
            
            # Tính phần trăm tổng thể cho robot
            total_records = robot["summary"]["total_records"]
            if total_records > 0:
                robot["summary"]["total_InTask_percentage"] = round(
                    (robot["summary"]["total_InTask_count"] / total_records) * 100, 2
                )
                robot["summary"]["total_Idle_percentage"] = round(
                    (robot["summary"]["total_Idle_count"] / total_records) * 100, 2
                )
        
        return {
            "status": "success",
            "time_range": f"{start} to {end}",
            "time_unit": time_filter,
            "total_robots": len(robots_data),
            "robots": list(robots_data.values())
        }

    except Exception as e:
        logger.error(f"Error getting all robots work status: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


