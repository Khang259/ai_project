from fastapi import APIRouter, Request, HTTPException, Query
from app.services.agv_dashboard_service import (
    get_data_by_time, 
    get_agv_position,
    get_all_robots_payload_data,
    get_all_robots_work_status,
    save_agv_position_snapshot,
    get_battery_agv,
    get_task_dashboard,
    get_success_task_by_hour
)
from app.services.websocket_service import manager
import json
from typing import Optional
from shared.logging import get_logger

logger = get_logger("camera_ai_app")

router = APIRouter()

@router.post("/robot-data")
async def receive_robot_data(request: Request):
    payload = await request.json()
    # nhận dữ liệu từ robot
    #result = await save_agv_data(payload)
    
    # Group AGV data theo group_id
    grouped_agv_data = await get_agv_position(payload)
    
    # Lưu dữ liệu real-time vào database để scheduler có thể lấy snapshot
    await save_agv_position_snapshot(grouped_agv_data)
    
    # Send từng group riêng biệt qua WebSocket
    for group_id, robots_list in grouped_agv_data.items():
        # Wrap data với type field
        message_data = {
            "type": "agv_info",
            "data": robots_list
        }
        message = json.dumps(message_data)
        await manager.broadcast_to_group(group_id, message)
        logger.info(f"Broadcast agv info to group {group_id}")
    
    # Also broadcast to global connections (dashboard) - send all groups combined
    # if grouped_agv_data:
    #     all_robots = []
    #     for robots_list in grouped_agv_data.values():
    #         all_robots.extend(robots_list)
    #     global_message = json.dumps(all_robots)
    #     await manager.broadcast(global_message)

    return {"status": "success", "result": "success"}


@router.get("/battery-agv")
async def get_battery_agv_endpoint(group_id: Optional[str] = None):
    result = await get_battery_agv(group_id)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.get("/task-dashboard")
async def get_task_dashboard_endpoint(group_id: Optional[str] = None):
    result = await get_task_dashboard(group_id)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.get("/success-task-by-hour")
async def get_success_task_by_hour_endpoint(group_id: Optional[str] = None):
    result = await get_success_task_by_hour(group_id)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.get("/payload-statistics")
async def get_payload_statistics(
    time_filter: str = Query(..., description="Time filter: 'd', 'w', 'm'"),
    state: str = Query(..., description="AGV state: 'InTask', 'Idle', etc."),
    device_code: str = Query(None, description="Specific device code (optional)")
):
    """
    Get AGV payload statistics for a specific state
    
    This endpoint counts the number of records with payLoad '0.0' and '1.0' 
    for a specific AGV state within a given time range, broken down by time unit.
    
    Args:
        time_filter: Time range filter ("d"=7 days, "w"=7 weeks, "m"=7 months)
        state: AGV state to filter by ("InTask", "Idle", etc.)
        device_code: Optional specific device code
    
    Returns:
        dict: Time series data with payload statistics by day/week/month
    """
    try:
        result = await get_data_by_time(
            time_filter=time_filter,
            device_code=device_code,
            state=state
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/work-status")
async def get_work_status(
    time_filter: str = Query(..., description="Time filter: 'd', 'w', 'm'"),
    device_code: str = Query(None, description="Specific device code (optional)")
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
    time_filter: str = Query(..., description="Time filter: 'd', 'w', 'm'"),
    device_code: str = Query(None, description="Filter by specific device code (optional)")
):
    """
    Get payload statistics (loaded/unloaded) for ALL robots
    
    This endpoint returns payload data for all robots in the system, with optional filtering
    by device_code or device_name. Data is broken down by time unit (day/week/month).
    
    Args:
        time_filter: Time range filter ("d"=7 days, "w"=7 weeks, "m"=7 months)
        state: AGV state to filter by ("InTask", "Idle", etc.)
        device_code: Optional filter by specific device code
        device_name: Optional filter by specific device name
    
    Returns:
        dict: Payload statistics for each robot separately, with time series data
    """
    try:
        result = await get_all_robots_payload_data(
            time_filter=time_filter,
            device_code=device_code
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/all-robots-work-status")
async def get_all_robots_work_status_endpoint(
    time_filter: str = Query(..., description="Time filter: 'd', 'w', 'm'"),
    device_code: str = Query(None, description="Filter by specific device code (optional)")
):
    try:
        result = await get_all_robots_work_status(
            time_filter=time_filter,
            device_code=device_code
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")



