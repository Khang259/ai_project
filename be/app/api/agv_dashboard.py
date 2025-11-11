from fastapi import APIRouter, Request, HTTPException, Query
from app.services.agv_dashboard_service import (
    save_agv_data, 
    get_data_by_time, 
    get_agv_position,
    get_all_robots_payload_data,
    get_all_robots_work_status,
)
from app.services.websocket_service import manager
from datetime import datetime
import json

router = APIRouter()

@router.post("/robot-data")
async def receive_robot_data(request: Request):
    payload = await request.json()
    # nhận dữ liệu từ robot
    #result = await save_agv_data(payload)
    agv_info = get_agv_position(payload)
    # Broadcast đến WebSocket clients
    message = json.dumps(agv_info)
    await manager.broadcast(message)

    return {"status": "success", "result": "success"}

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
    """
    Get work status statistics (InTask/Idle) for ALL robots
    
    This endpoint returns work status data for all robots in the system, with optional filtering
    by device_code or device_name. Data is broken down by time unit (day/week/month).
    
    Args:
        time_filter: Time range filter ("d"=7 days, "w"=7 weeks, "m"=7 months)
        device_code: Optional filter by specific device code
        device_name: Optional filter by specific device name
    
    Returns:
        dict: Work status statistics for each robot separately, with time series data
    """
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

