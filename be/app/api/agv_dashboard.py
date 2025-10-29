from fastapi import APIRouter, Request, HTTPException, Query
from app.services.agv_dashboard_service import (
    save_agv_data, 
    get_data_by_time, 
    get_agv_position,
    get_all_robots_payload_data,
    get_all_robots_work_status,
    get_all_robots_work_status_summary,
    get_all_robots_payload_statistics_summary
)
from app.api.agv_websocket import manager
import json

router = APIRouter()

@router.post("/robot-data")
async def receive_robot_data(request: Request):
    """
    Nhận dữ liệu từ robot và broadcast qua WebSocket
    """
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
    device_code: str = Query(None, description="Filter by device code(s) (optional). Có thể truyền nhiều mã, ngăn cách bởi dấu phẩy: AGV_01,AGV_02")
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
            device_code=device_code
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
    start_date: str = Query(..., description="Start date: 'YYYY-MM-DD'"),
    end_date: str = Query(..., description="End date: 'YYYY-MM-DD'"),
    device_code: str = Query(None, description="Filter by device code(s) (optional). Có thể truyền nhiều mã, ngăn cách bởi dấu phẩy: AGV_01,AGV_02")
):
    """
    Lấy thống kê payload (có hàng/không hàng) cho TẤT CẢ robots - theo từng robot riêng biệt
    
    Args:
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        end_date: Ngày kết thúc (YYYY-MM-DD)
        device_code: Optional filter by specific device code
    
    Returns:
        dict: Payload statistics for each robot separately, with time series data
    """
    try:
        result = await get_all_robots_payload_data(
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

@router.get("/all-robots-work-status")
async def get_all_robots_work_status_endpoint(
    start_date: str = Query(..., description="Start date: 'YYYY-MM-DD'"),
    end_date: str = Query(..., description="End date: 'YYYY-MM-DD'"),
    device_code: str = Query(None, description="Filter by device code(s) (optional). Có thể truyền nhiều mã, ngăn cách bởi dấu phẩy: AGV_01,AGV_02")
):
    """
    Lấy thống kê work status (InTask/Idle) cho TẤT CẢ robots - theo từng robot riêng biệt
    
    Args:
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        end_date: Ngày kết thúc (YYYY-MM-DD)
        device_code: Optional filter by specific device code
    
    Returns:
        dict: Work status statistics for each robot separately, with time series data
    """
    try:
        result = await get_all_robots_work_status(
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


@router.get("/all-robots-work-status-summary")
async def get_all_robots_work_status_summary_endpoint(
    start_date: str = Query(..., description="Start date: 'YYYY-MM-DD'"),
    end_date: str = Query(..., description="End date: 'YYYY-MM-DD'"),
    device_code: str = Query(None, description="Filter by device code(s) (optional). Có thể truyền nhiều mã, ngăn cách bởi dấu phẩy: AGV_01,AGV_02")
):
    """
    Lấy SUMMARY thống kê work status (InTask/Idle) - TỔNG HỢP TẤT CẢ ROBOTS
    
    Args:
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        end_date: Ngày kết thúc (YYYY-MM-DD)
        device_code: Optional filter by specific device code
    
    Returns:
        dict: Summary statistics aggregated across all robots
    """
    try:
        result = await get_all_robots_work_status_summary(
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


@router.get("/all-robots-payload-statistics-summary")
async def get_all_robots_payload_statistics_summary_endpoint(
    start_date: str = Query(..., description="Start date: 'YYYY-MM-DD'"),
    end_date: str = Query(..., description="End date: 'YYYY-MM-DD'"),
    device_code: str = Query(None, description="Filter by device code(s) (optional). Có thể truyền nhiều mã, ngăn cách bởi dấu phẩy: AGV_01,AGV_02")
):
    """
    Lấy SUMMARY thống kê payload (có hàng/không hàng) - TỔNG HỢP TẤT CẢ ROBOTS
    
    Args:
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        end_date: Ngày kết thúc (YYYY-MM-DD)
        device_code: Optional filter by specific device code
    
    Returns:
        dict: Summary payload statistics aggregated across all robots
    """
    try:
        result = await get_all_robots_payload_statistics_summary(
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