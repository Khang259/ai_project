from fastapi import APIRouter, Request, HTTPException, Query
from app.services.agv_dashboard_service import (
    get_data_by_time, 
    get_agv_position,
    get_all_robots_payload_data,
    get_task_dashboard,
    get_success_task_by_hour,
    save_agv_data,
    get_system_payload_efficiency_hourly_8h,
    get_system_efficiency_hourly_8h,
    get_total_robot_info,
    get_system_speed_and_payload_daily_7d,
    get_area_efficiency_by_8d,
    get_robot_data_by_task,
    get_task_details_stats,
    get_task_duration_distribution,
)
from app.services.websocket_service import manager
import json
from typing import Optional
from shared.logging import get_logger

logger = get_logger("camera_ai_app")

router = APIRouter()

@router.post("/robot-data")
async def receive_robot_data(request: Request):
    """
    Nhận dữ liệu từ robot và broadcast qua WebSocket
    """
    payload = await request.json()
    await save_agv_data(payload)
    
    grouped_agv_data = await get_agv_position(payload)
    
    # Send từng group riêng biệt qua WebSocket
    for group_id, robots_list in grouped_agv_data.items():
        data = {"areaId": group_id}
        robot_info = await get_total_robot_info(data)
        message_data = {
            "type": "agv_info",
            "info": robot_info,
            "data": robots_list
        }
        message = json.dumps(message_data)
        await manager.broadcast_to_group(group_id, message)
        logger.info(f"Broadcast agv info to group {group_id}")

    return {"status": "success", "result": "success"}

@router.get("/task-dashboard")
async def get_task_dashboard_endpoint(
    area_id: Optional[str] = Query(None, description="ID khu vực (area_id). Mặc định '0' = tổng tất cả"),
):
    result = await get_task_dashboard(area_id or "0")
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.get("/robot-data-by-task")
async def get_robot_data_by_task_endpoint(
    order_id: str = Query(..., description="ID order (order_id)"),
):
    try:
        result = await get_robot_data_by_task(order_id)
        # result là list document; nếu là dict có "status" == "error" thì raise
        if isinstance(result, dict) and result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))
        return {"status": "success", "result": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/success-task-by-hour")
async def get_success_task_by_hour_endpoint(
    area_id: Optional[str] = Query(None, description="ID khu vực (area_id) tùy chọn"),
    group_id: Optional[str] = Query(None, description="Lọc theo group (MS=2, PA=4). Có thể dùng cùng area_id"),
):
    result = await get_success_task_by_hour(area_id=area_id, group_id=group_id)
    return result

@router.get("/efficiency-hour")
async def get_efficency_by_hour_endpoint(
    area_id: Optional[str] = Query(None, description="ID khu vực (area_id) tùy chọn"),
    group_id: Optional[str] = Query(None, description="ID nhóm (group_id) tùy chọn"),
):
    result = await get_system_efficiency_hourly_8h(area_id=area_id, group_id=group_id)
    return result

@router.get("/efficiency-payload-hour")
async def get_efficency_payload_by_hour_endpoint(
    area_id: Optional[str] = Query(None, description="ID khu vực (area_id) tùy chọn"),
    group_id: Optional[str] = Query(None, description="ID nhóm (group_id) tùy chọn"),
):
    result = await get_system_payload_efficiency_hourly_8h(area_id=area_id, group_id=group_id)
    return result

@router.get("/robot-speed")
async def get_robot_speed_7days(
    area_id: Optional[str] = Query(None, description="ID khu vực (area_id) tùy chọn"),
    group_id: Optional[str] = Query(None, description="ID nhóm (group_id) tùy chọn"),
):
    result = await get_system_speed_and_payload_daily_7d(area_id=area_id, group_id=group_id)
    return result

@router.get("/work-status")
async def get_work_status(
    time_filter: str = Query(..., description="Time filter: 'd', 'w', 'm'"),
    device_code: str = Query(None, description="Filter by device code(s) (optional). Có thể truyền nhiều mã, ngăn cách bởi dấu phẩy: AGV_01,AGV_02")
):
    """
    Get AGV work status statistics (InTask vs Idle)
    
    This endpoint counts the number of AGVs that are working (InTask) 
    versus idle (Idle) within a given time range, broken down by time unit.
    
    Args:
        time_filter: Time range filter ("d"=7 days, "w"=7 weeks, "m"=7 months)
        device_code: Optional specific device code
    
    Returns:
        dict: Time series data with work status statistics by day/week/month
    """
    try:
        result = await get_data_by_time(
            time_filter=time_filter,
            device_code=device_code
            # No state parameter - this triggers the "without_state" logic
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/all-robots-payload-statistics")
async def get_all_robots_payload_statistics(
    area_id: Optional[str] = Query(None, description="Lọc theo area_id (optional)"),
    start_date: Optional[str] = Query(None, description="Start date: 'YYYY-MM-DD'. Không truyền thì lấy ngày mới nhất có trong DB"),
    end_date: Optional[str] = Query(None, description="End date: 'YYYY-MM-DD'. Không truyền thì lấy ngày mới nhất có trong DB"),
    device_code: Optional[str] = Query(None, description="Filter by device code(s) (optional). Có thể truyền nhiều mã, ngăn cách bởi dấu phẩy")
):
    """Thống kê Loaded, No load, InTask, Idle cho tất cả robot (1 API chung, từ agv_hourly_work_duration)."""
    try:
        result = await get_all_robots_payload_data(
            area_id=area_id,
            start_date=start_date,
            end_date=end_date,
            device_code=device_code
        )
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/task-details-statistics")
async def get_task_details_statistics(
    area_id: Optional[str] = Query(None, description="Lọc theo area_id (optional)"),
    start_date: Optional[str] = Query(None, description="Ngày bắt đầu YYYY-MM-DD. Không truyền → mặc định ngày hôm qua"),
    end_date: Optional[str] = Query(None, description="Ngày kết thúc YYYY-MM-DD. Không truyền → mặc định ngày hôm qua"),
    device_code: Optional[str] = Query(None, description="Lọc theo device_num, nhiều mã phân cách bởi dấu phẩy (optional)"),
):
    """
    Thống kê task_details theo từng robot (device_num).
    Mặc định trả về dữ liệu ngày hôm qua khi không truyền ngày.
    Mỗi robot trả về: total_tasks, cancel_count, total_duration,
    avg_total_duration, avg/sum của từng phase (Get_shelf, Transition,
    Shelf_lifting, Shelf_transport, Shelf_release).
    """
    try:
        result = await get_task_details_stats(
            area_id=area_id,
            start_date=start_date,
            end_date=end_date,
            device_code=device_code,
        )
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/task-duration-distribution")
async def get_task_duration_distribution_endpoint(
    area_id: Optional[str] = Query(None, description="Lọc theo area_id (optional)"),
    start_date: Optional[str] = Query(None, description="Ngày bắt đầu YYYY-MM-DD. Không truyền → mặc định ngày hôm qua"),
    end_date: Optional[str] = Query(None, description="Ngày kết thúc YYYY-MM-DD. Không truyền → mặc định ngày hôm qua"),
    device_code: Optional[str] = Query(None, description="Lọc theo device_num, nhiều mã phân cách bởi dấu phẩy (optional)"),
):
    """
    Phân bổ số lệnh theo khoảng thời gian: <2p, 2-3p, 3-4p, 4-5p, >5p.
    Mặc định trả về dữ liệu ngày hôm qua khi không truyền ngày.
    """
    try:
        result = await get_task_duration_distribution(
            area_id=area_id,
            start_date=start_date,
            end_date=end_date,
            device_code=device_code,
        )
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/area-efficiency-8d")
async def get_area_efficiency_8d_endpoint(
    area_id: str = Query(..., description="ID khu vực (area_id) để lấy hiệu suất 8 ngày"),
    group_id: str = Query(None, description="ID nhóm (group_id) tùy chọn để lọc theo nhóm"),
):
    result = await get_area_efficiency_by_8d(area_id, group_id=group_id)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

