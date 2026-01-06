from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, List, Dict, Any, Tuple
from datetime import date, datetime, time
from ..schemas.analytic import AMRData, AMRDataResponse
from ..services.analytic_service import (
    save_amr_data,
    get_payload_per_amr,
    get_payload_summary,
    handle_event,
    get_work_status_per_amr,
    get_work_status_summary
)
from shared.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/analysis", tags=["Analysis"])

@router.post("/amr_data", response_model=AMRDataResponse)
async def receive_amr_data(amr_data: AMRData):
    """Nhận dữ liệu từ ICS system"""
    try:
        # Lưu dữ liệu vào MongoDB
        success = await save_amr_data(amr_data)
        
        if success:
            return AMRDataResponse(
                code=1000,
                desc="success" 
            )
        else:
            return AMRDataResponse(
                code=500,
                desc="failed to save data, possibly duplicate" 
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/all-robots-payload-statistics")
async def get_all_robots_payload_statistics(
    start_date: str = Query(..., description="Ngày bắt đầu (YYYY-MM-DD)"),
    end_date: str = Query(..., description="Ngày kết thúc (YYYY-MM-DD)"),
    time_ranges: str = Query(..., description="Khoảng thời gian trong ngày, format: HH:MM-HH:MM,HH:MM-HH:MM (nhiều range phân cách bằng dấu phẩy)"),
    device_names: Optional[str] = Query(None, description="Danh sách deviceName, phân cách bằng dấu phẩy")
):
    try:
        # Parse dates
        try:
            start_date_obj: date = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date_obj: date = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Định dạng ngày không hợp lệ: {str(e)}")

        if start_date_obj > end_date_obj:
            raise HTTPException(status_code=400, detail="start_date phải nhỏ hơn hoặc bằng end_date")

        # Chuyển về mốc datetime bao trùm ngày
        start_time = datetime.combine(start_date_obj, datetime.min.time())
        end_time = datetime.combine(end_date_obj, datetime.max.time())
        
        # Parse device_names
        device_name_list = None
        if device_names:
            device_name_list = [name.strip() for name in device_names.split(",") if name.strip()]
        
        # Parse time_ranges (bắt buộc giống total_operating_api)
        try:
            parsed_time_ranges: List[Tuple[time, time]] = []
            for tr in time_ranges.split(","):
                tr = tr.strip()
                if "-" not in tr:
                    raise ValueError(f"Time range không hợp lệ: {tr}")
                start_str, end_str = tr.split("-", 1)
                start_t = datetime.strptime(start_str.strip(), "%H:%M").time()
                end_t = datetime.strptime(end_str.strip(), "%H:%M").time()
                parsed_time_ranges.append((start_t, end_t))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Định dạng time_ranges không hợp lệ: {str(e)}")
        
        # Lấy tổng duration
        result = await get_payload_per_amr(
            start_time=start_time,
            end_time=end_time,
            device_names=device_name_list,
            time_ranges=parsed_time_ranges
        )

        return {
            "success": True,
            "message": "Tính tổng duration thành công.",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")

@router.get("/all-robots-payload-statistics-summary")
async def get_aggregated_duration(
    start_date: str = Query(..., description="Ngày bắt đầu (YYYY-MM-DD)"),
    end_date: str = Query(..., description="Ngày kết thúc (YYYY-MM-DD)"),
    time_ranges: str = Query(..., description="Khoảng thời gian trong ngày, format: HH:MM-HH:MM,HH:MM-HH:MM (nhiều range phân cách bằng dấu phẩy)"),
    device_names: Optional[str] = Query(None, description="Danh sách deviceName, phân cách bằng dấu phẩy")
):
    """API lấy tổng hợp duration load/no-load không phân theo từng AMR"""
    try:
        # Parse dates
        try:
            start_date_obj: date = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date_obj: date = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Định dạng ngày không hợp lệ: {str(e)}")

        if start_date_obj > end_date_obj:
            raise HTTPException(status_code=400, detail="start_date phải nhỏ hơn hoặc bằng end_date")

        start_time = datetime.combine(start_date_obj, datetime.min.time())
        end_time = datetime.combine(end_date_obj, datetime.max.time())
        
        # Parse device_names
        device_name_list = None
        if device_names:
            device_name_list = [name.strip() for name in device_names.split(",") if name.strip()]
        
        # Parse time_ranges (bắt buộc giống total_operating_api)
        try:
            parsed_time_ranges: List[Tuple[time, time]] = []
            for tr in time_ranges.split(","):
                tr = tr.strip()
                if "-" not in tr:
                    raise ValueError(f"Time range không hợp lệ: {tr}")
                start_str, end_str = tr.split("-", 1)
                start_t = datetime.strptime(start_str.strip(), "%H:%M").time()
                end_t = datetime.strptime(end_str.strip(), "%H:%M").time()
                parsed_time_ranges.append((start_t, end_t))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Định dạng time_ranges không hợp lệ: {str(e)}")
        
        # Lấy tổng hợp duration
        result = await get_payload_summary(
            start_time=start_time,
            end_time=end_time,
            device_names=device_name_list,
            time_ranges=parsed_time_ranges
        )

        return {
            "success": True,
            "message": "Tính tổng hợp duration thành công.",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")


@router.post("/total-operating")
async def total_operating_event(payload: List[Dict[str, Any]] = Body(...)):
    """
    Nhận payload là một mảng các thiết bị.
    Ví dụ:
    [
      {"deviceName": "0006", "state": "InTask", "battery": "70", ...},
      {"deviceName": "0005", "state": "Idle", "battery": "89", ...}
    ]
    """
    try:
        success = await handle_event(payload)
        if success:
            return {"code": 1000, "desc": "Request successfully"}
        return {"code": 200, "desc": "Request fail"}
    except Exception as e:
        logger.error(f"Error in total_operating_event: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/all-robots-work-status")
async def total_operating_each_amr(
    start_date: str = Query(..., description="Ngày bắt đầu (YYYY-MM-DD)"),
    end_date: str = Query(..., description="Ngày kết thúc (YYYY-MM-DD)"),
    time_ranges: str = Query(..., description="Khoảng thời gian trong ngày, format: HH:MM-HH:MM,HH:MM-HH:MM (nhiều range phân cách bằng dấu phẩy)"),
    device_names: Optional[str] = Query(None, description="Danh sách deviceName, phân cách bằng dấu phẩy")
):
    try:
        # Parse dates
        try:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Định dạng ngày không hợp lệ: {str(e)}")
        
        if start_date_obj > end_date_obj:
            raise HTTPException(status_code=400, detail="start_date phải nhỏ hơn hoặc bằng end_date")

        # Parse time ranges
        try:
            time_range_list = []
            for time_range in time_ranges.split(","):
                time_range = time_range.strip()
                if "-" not in time_range:
                    raise ValueError(f"Time range không hợp lệ: {time_range}")
                start_time_str, end_time_str = time_range.split("-", 1)
                start_time_obj = datetime.strptime(start_time_str.strip(), "%H:%M").time()
                end_time_obj = datetime.strptime(end_time_str.strip(), "%H:%M").time()
                time_range_list.append((start_time_obj, end_time_obj))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Định dạng time_ranges không hợp lệ: {str(e)}")

        device_name_list: Optional[List[str]] = None
        if device_names:
            device_name_list = [x.strip() for x in device_names.split(",") if x.strip()]
        data = await get_work_status_per_amr(
            start_date=start_date_obj,
            end_date=end_date_obj,
            time_ranges=time_range_list,
            device_names=device_name_list
        )
        return {
            "success": True,
            "message": "Tổng hợp duration theo từng AMR thành công",
            "data": data
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/all-robots-work-status-summary")
async def total_operating_by_state(
    start_date: str = Query(..., description="Ngày bắt đầu (YYYY-MM-DD)"),
    end_date: str = Query(..., description="Ngày kết thúc (YYYY-MM-DD)"),
    time_ranges: str = Query(..., description="Khoảng thời gian trong ngày, format: HH:MM-HH:MM,HH:MM-HH:MM (nhiều range phân cách bằng dấu phẩy)"),
    device_names: Optional[str] = Query(None, description="Danh sách deviceName, phân cách bằng dấu phẩy")
):
    try:
        # Parse dates
        try:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Định dạng ngày không hợp lệ: {str(e)}")

        if start_date_obj > end_date_obj:
            raise HTTPException(status_code=400, detail="start_date phải nhỏ hơn hoặc bằng end_date")

        # Parse time ranges
        try:
            time_range_list: List[Tuple[time, time]] = []
            for time_range in time_ranges.split(","):
                time_range = time_range.strip()
                if "-" not in time_range:
                    raise ValueError(f"Time range không hợp lệ: {time_range}")
                start_time_str, end_time_str = time_range.split("-", 1)
                start_time_obj = datetime.strptime(start_time_str.strip(), "%H:%M").time()
                end_time_obj = datetime.strptime(end_time_str.strip(), "%H:%M").time()
                time_range_list.append((start_time_obj, end_time_obj))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Định dạng time_ranges không hợp lệ: {str(e)}")

        device_name_list: Optional[List[str]] = None
        if device_names:
            device_name_list = [x.strip() for x in device_names.split(",") if x.strip()]

        data = await get_work_status_summary(
            start_date=start_date_obj,
            end_date=end_date_obj,
            time_ranges=time_range_list,
            device_names=device_name_list
        )
        return {
            "success": True,
            "message": "Tổng hợp duration theo từng state thành công",
            "data": data
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
