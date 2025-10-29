import collections
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
    """
    Tính toán và lưu thống kê theo ngày của tất cả AGV vào database.
    Hàm này tính toán cả payload statistics (có tải/không tải) và work status (InTask/Idle).
    Chỉ lấy dữ liệu của NGÀY HÔM NAY (từ 00:00:00 đến 23:59:59)
    
    Returns:
        dict: Kết quả tính toán và số lượng bản ghi đã lưu
    """
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
    start_date: str,
    end_date: str,
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
        # Parse date range
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999)
        # Chọn collection phù hợp theo độ dài range
        days_diff = (end - start).days
        collection_name = "agv_data" if days_diff <= 7 else "agv_daily_statistics"
        collection = get_collection(collection_name)

        # Base query
        if collection_name == "agv_data":
            base_query = {"created_at": {"$gte": start, "$lt": end}}
        else:
            base_query = {"date": {"$gte": start.strftime("%Y-%m-%d"), "$lte": end.strftime("%Y-%m-%d")}}

        # Lọc theo device_code nếu có (hỗ trợ danh sách phân tách bằng dấu phẩy)
        if device_code:
            codes = [c.strip() for c in device_code.split(",") if c.strip()]
            if codes:
                base_query["device_code"] = {"$in": codes}

        robots_data = {}

        # ===== LOGIC CHO FILTER THEO NGÀY ("d") - Query từ raw data =====
        if collection_name == "agv_data":
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
            if collection_name == "agv_data":
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
            "time_range": f"{start_date} to {end_date}",
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
    start_date: str,
    end_date: str,
    device_code: str = None
):
    """
    Lấy dữ liệu work status (InTask/Idle) của TẤT CẢ robot
    
    Args:
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        end_date: Ngày kết thúc (YYYY-MM-DD)
        device_code: mã thiết bị để lọc (tùy chọn)
    
    Returns:
        dict: dữ liệu work status của từng robot riêng biệt
    """
    try:
        # Parse date range
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999)

        # Chọn collection dựa theo độ dài range: <=7 ngày dùng raw, ngược lại dùng daily
        days_diff = (end - start).days
        collection_name = "agv_data" if days_diff <= 7 else "agv_daily_statistics"
        collection = get_collection(collection_name)

        # Base query
        if collection_name == "agv_data":
            base_query = {"created_at": {"$gte": start, "$lt": end}}
        else:
            # daily stats dùng field 'date' dạng YYYY-MM-DD
            base_query = {"date": {"$gte": start.strftime("%Y-%m-%d"), "$lte": end.strftime("%Y-%m-%d")}}

        # Lọc theo device_code nếu có (hỗ trợ danh sách phân tách bằng dấu phẩy)
        if device_code:
            codes = [c.strip() for c in device_code.split(",") if c.strip()]
            if codes:
                base_query["device_code"] = {"$in": codes}

        robots_data = {}

        # ===== LOGIC CHO FILTER THEO NGÀY ("d") - Query từ raw data =====
        if collection_name == "agv_data":
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
            
            # Nếu dùng raw data, cần tính phần trăm cho time_series
            if collection_name == "agv_data":
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
            "time_range": f"{start_date} to {end_date}",
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


async def get_all_robots_work_status_summary(
    start_date: str,
    end_date: str,
    device_code: str = None
):
    """
    Lấy summary của work status (InTask/Idle) - AGGREGATE TẤT CẢ ROBOTS
    
    Args:
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        end_date: Ngày kết thúc (YYYY-MM-DD)
        device_code: mã thiết bị để lọc (tùy chọn)
    
    Returns:
        dict: summary statistics - tổng hợp tất cả robots
    """
    try:
        # Parse date range
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999)

        # Chọn collection dựa theo độ dài range
        days_diff = (end - start).days
        collection_name = "agv_data" if days_diff <= 7 else "agv_daily_statistics"
        collection = get_collection(collection_name)

        # Base query
        if collection_name == "agv_data":
            base_query = {"created_at": {"$gte": start, "$lt": end}}
        else:
            base_query = {"date": {"$gte": start.strftime("%Y-%m-%d"), "$lte": end.strftime("%Y-%m-%d")}}

        if device_code:
            codes = [c.strip() for c in device_code.split(",") if c.strip()]
            if codes:
                base_query["device_code"] = {"$in": codes}

        # Aggregate tất cả robots lại
        if collection_name == "agv_data":
            # Query từ raw data và aggregate
            pipeline = [
                {"$match": base_query},
                {
                    "$group": {
                        "_id": "$state",
                        "count": {"$sum": 1}
                    }
                }
            ]
            cursor = collection.aggregate(pipeline)
            result = await cursor.to_list(length=None)
            
            total_intask = 0
            total_idle = 0
            
            for item in result:
                if item["_id"] == "InTask":
                    total_intask = item["count"]
                elif item["_id"] == "Idle":
                    total_idle = item["count"]
            
            total_records = total_intask + total_idle
            intask_percentage = round((total_intask / total_records) * 100, 2) if total_records > 0 else 0
            idle_percentage = round((total_idle / total_records) * 100, 2) if total_records > 0 else 0
            
            return {
                "status": "success",
                "time_range": f"{start_date} to {end_date}",
                "collection_used": collection_name,
                "summary": {
                    "total_inTask_count": total_intask,
                    "total_idle_count": total_idle,
                    "total_records": total_records,
                    "inTask_percentage": intask_percentage,
                    "idle_percentage": idle_percentage
                }
            }
        else:
            # Query từ daily statistics và aggregate
            cursor = collection.find(base_query)
            daily_stats = await cursor.to_list(length=None)
            
            total_intask = sum(stat.get("InTask_count", 0) for stat in daily_stats)
            total_idle = sum(stat.get("Idle_count", 0) for stat in daily_stats)
            
            total_records = total_intask + total_idle
            intask_percentage = round((total_intask / total_records) * 100, 2) if total_records > 0 else 0
            idle_percentage = round((total_idle / total_records) * 100, 2) if total_records > 0 else 0
            
            return {
                "status": "success",
                "time_range": f"{start_date} to {end_date}",
                "collection_used": collection_name,
                "summary": {
                    "total_inTask_count": total_intask,
                    "total_idle_count": total_idle,
                    "total_records": total_records,
                    "inTask_percentage": intask_percentage,
                    "idle_percentage": idle_percentage
                }
            }

    except Exception as e:
        logger.error(f"Error getting all robots work status summary: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


async def get_all_robots_payload_statistics_summary(
    start_date: str,
    end_date: str,
    device_code: str = None
):
    """
    Lấy summary của payload statistics - AGGREGATE TẤT CẢ ROBOTS
    
    Args:
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        end_date: Ngày kết thúc (YYYY-MM-DD)
        device_code: mã thiết bị để lọc (tùy chọn)
    
    Returns:
        dict: summary payload statistics - tổng hợp tất cả robots
    """
    try:
        # Parse date range
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999)

        days_diff = (end - start).days
        collection_name = "agv_data" if days_diff <= 7 else "agv_daily_statistics"
        collection = get_collection(collection_name)

        if collection_name == "agv_data":
            base_query = {"created_at": {"$gte": start, "$lt": end}}
        else:
            base_query = {"date": {"$gte": start.strftime("%Y-%m-%d"), "$lte": end.strftime("%Y-%m-%d")}}

        if device_code:
            codes = [c.strip() for c in device_code.split(",") if c.strip()]
            if codes:
                base_query["device_code"] = {"$in": codes}

        if collection_name == "agv_data":
            # Query từ raw data và aggregate
            pipeline = [
                {"$match": {**base_query, "state": "InTask"}},
                {
                    "$group": {
                        "_id": "$payLoad",
                        "count": {"$sum": 1}
                    }
                }
            ]
            cursor = collection.aggregate(pipeline)
            result = await cursor.to_list(length=None)
            
            total_0_0 = 0
            total_1_0 = 0
            
            for item in result:
                if item["_id"] == "0.0":
                    total_0_0 = item["count"]
                elif item["_id"] == "1.0":
                    total_1_0 = item["count"]
            
            total_records = total_0_0 + total_1_0
            payload_0_0_percentage = round((total_0_0 / total_records) * 100, 2) if total_records > 0 else 0
            payload_1_0_percentage = round((total_1_0 / total_records) * 100, 2) if total_records > 0 else 0
            
            return {
                "status": "success",
                "time_range": f"{start_date} to {end_date}",
                "collection_used": collection_name,
                "summary": {
                    "total_payLoad_0_0_count": total_0_0,
                    "total_payLoad_1_0_count": total_1_0,
                    "total_records": total_records,
                    "payLoad_0_0_percentage": payload_0_0_percentage,
                    "payLoad_1_0_percentage": payload_1_0_percentage
                }
            }
        else:
            # Query từ daily statistics và aggregate
            cursor = collection.find(base_query)
            daily_stats = await cursor.to_list(length=None)
            
            total_0_0 = sum(stat.get("InTask_payLoad_0_0_count", 0) for stat in daily_stats)
            total_1_0 = sum(stat.get("InTask_payLoad_1_0_count", 0) for stat in daily_stats)
            
            total_records = total_0_0 + total_1_0
            payload_0_0_percentage = round((total_0_0 / total_records) * 100, 2) if total_records > 0 else 0
            payload_1_0_percentage = round((total_1_0 / total_records) * 100, 2) if total_records > 0 else 0
            
            return {
                "status": "success",
                "time_range": f"{start_date} to {end_date}",
                "collection_used": collection_name,
                "summary": {
                    "total_payLoad_0_0_count": total_0_0,
                    "total_payLoad_1_0_count": total_1_0,
                    "total_records": total_records,
                    "payLoad_0_0_percentage": payload_0_0_percentage,
                    "payLoad_1_0_percentage": payload_1_0_percentage
                }
            }

    except Exception as e:
        logger.error(f"Error getting all robots payload statistics summary: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

