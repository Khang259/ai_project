from fastapi import APIRouter, Request, HTTPException, Query
from app.services.task_service import filter_raw_task, get_tasks_from_db, get_task_details_by_total_duration_gt, get_task_details_by_order_id
from app.services.websocket_service import manager
import json
from shared.logging import get_logger

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.post("/task-status")
async def receive_task_status(request: Request):
    payload = await request.json()

    data = await filter_raw_task(payload)

    return {"status": "success", "data": data}

    # if data["status"] == "success":
    #     message = json.dumps(data["tasks"])
    #     await manager.broadcast_to_group(data["tasks"]["group_id"], message)
    #     await manager.broadcast_to_route(data["tasks"]["route_id"], message)
    #     logger.info(f"Task successfully updated to group {data['tasks']['group_id']} and route {data['tasks']['route_id']}")
    #     return {"status": "success", "message": f"Task successfully updated to group {data['tasks']['group_id']}"}
    # else:
    #     return {"status": "error", "message": "Failed to extract data by group id"}


@router.get("/tasks")
async def get_tasks(
    page: int = 1,
    limit: int = 20,
    area_id: str | None = Query(None, description="Lọc theo area_id (để trống = tất cả)"),
    today_only: bool = Query(False, description="True = chỉ lấy task trong ngày hôm nay, không giới hạn số lượng"),
):
    try:
        return await get_tasks_from_db(page=page, limit=limit, area_id=area_id, today_only=today_only)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task-details/by-order")
async def get_task_details_by_order(
    order_id: str = Query(..., description="Mã đơn cần tra cứu trong task_details"),
):
    """
    Lấy document duy nhất trong task_details theo order_id.
    Trả về đúng dữ liệu DB: order_id, Get_shelf, Transition, Shelf_lifting,
    Shelf_transport, Shelf_release, total_duration (hoặc Cancel).
    """
    try:
        doc = await get_task_details_by_order_id(order_id=order_id)
        if doc is None:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy order_id: {order_id}")
        return {"success": True, "data": doc}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_task_details_by_order error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task-details/long-duration")
async def get_task_details_long_duration(
    threshold: float = Query(300.0, description="Chỉ lấy bản ghi có total_duration > threshold (giây)"),
    page: int = Query(1, ge=1, description="Trang"),
    limit: int = Query(20, ge=1, le=1000, description="Số bản ghi mỗi trang"),
    area_id: str | None = Query(None, description="Lọc theo area_id (để trống = tất cả khu vực)"),
):
    """
    Lấy danh sách task_details có total_duration lớn hơn threshold.
    Trả về: order_id, Get_shelf, Transition, Shelf_lifting, Shelf_transport,
    Shelf_release, total_duration, (Cancel nếu có), area_id, group_id, route_id ...
    """
    try:
        result = await get_task_details_by_total_duration_gt(
            threshold=threshold,
            page=page,
            limit=limit,
            area_id=area_id,
        )
        return {"success": True, **result}
    except Exception as e:
        logger.exception("get_task_details_long_duration error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
