from typing import Dict, List
from shared.logging import get_logger
from fastapi import APIRouter, HTTPException
from app.services.VHL_logic import request_VHL, update_slot_state, get_carriage_data

logger = get_logger("logic_service")
router = APIRouter()

@router.post("/request-vhl")
async def receive_request(payload: Dict):
    try:
        res = await request_VHL(payload)
        return {"status": "success", "message": res}
    except Exception as e:
        logger.error(f"Error updating state: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-state")
async def update_slot(payload: Dict):
    try:
        await update_slot_state(payload)
        return {"status": "success", "message": "Data sended"}
    except Exception as e:
        logger.error(f"Error updating state: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/get-slots")
async def update_slot():
    try:
        data = await get_carriage_data()
        return data
    except Exception as e:
        logger.error(f"Error updating state: {e}")
        raise HTTPException(status_code=500, detail=str(e))