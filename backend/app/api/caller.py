from fastapi import APIRouter, Request, HTTPException, Query, Optional
from app.services.node_service import process_caller
from app.schemas.node import ProcessCaller
import httpx
import json

router = APIRouter()

@router.post("/process-caller")
async def process_caller(node: ProcessCaller, priority: int = Query(Optional[int], description="Priority of the process caller")):
    payload = process_caller(node, priority)
    async with httpx.AsyncClient() as client:
        response = await client.post('http://192.168.1.169:8888/ics/taskOrder/addTask', json=payload)
    return {"status": response.code, "payload": payload}