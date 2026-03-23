from shared.logging import get_logger
from app.services.VHL_service import vhl_service
from app.core.config import settings
import time
import uuid
from fastapi import HTTPException
import httpx
import time

logger = get_logger("logic_service")
ics_url = f"http://{settings.ics_host}:7000"

async def add_task(payload):
    try:    
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(f"{ics_url}/ics/taskOrder/addTask", json=payload)
        logger.info(f"ICS API response: {response.json()}")
    except Exception as e:
        logger.error(f"Error calling process caller: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def request_RCS(data):
    payload = None
    if len(data) == 2:
        order_id = f"2-{time.strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:4]}"
        logger.info(f"----Sending RCS SINGLE SUPPLY VHL----")
        payload = {
                "modelProcessCode": f"Cap_PT_VHL", 
                "fromSystem": "Thadosoft", 
                "orderId": order_id,  
                "taskOrderDetail": [ 
                    {    
                        "taskPath": f"{data[0]},{data[1]}"
                    } 
                ] 
            }

    elif len(data) == 4:
        order_id = f"4-{time.strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:4]}"
        logger.info(f"----Sending RCS DUAL VHL----")
        payload = {
                "modelProcessCode": f"Cap_tra_PT_VHL", 
                "fromSystem": "Thadosoft", 
                "orderId": order_id,  
                "taskOrderDetail": [ 
                    {    
                        "taskPath": f"{data[0]},{data[1]}"
                    }, 
                    {    
                        "taskPath": f"{data[2]},{data[3]}"
                    } 
                ] 
            } 

    else:
        return None

    if payload:
        await add_task(payload)
        time.sleep(1)

async def request_VHL(payload):
    node_type = payload.get("type")
    carriage = payload.get("line")

    if node_type == "import":
        return await import_stuff(carriage, payload)
    else:
        return await export_stuff(carriage, payload)

async def import_stuff(carriage, data):
    start = data.get("start")

    end, slot = await vhl_service.get_optimize(carriage, "empty")
    if end and slot:
        data = [start, end]
        await vhl_service.update_status(carriage, slot, "shelf")
        await request_RCS(data)
        return "Đã gửi lệnh"
    else:
        return "Vẫn còn hàng trong toa"

async def export_stuff(carriage, payload):
    node_type = payload.get("type")

    if node_type == "supply":
        end = payload.get("end")
        start, slot = await vhl_service.get_optimize(carriage, "shelf")
        if start and slot:
            data = [start, end]
            await vhl_service.update_status(carriage, slot, "empty")
            await request_RCS(data)
            return "Đã gửi lệnh"
        else:
            return "Đã hết hàng trong toa"

    elif node_type == "return":
        start = payload.get("next_start")
        end = payload.get("next_end")
        data = [start, end]
        await request_RCS(data)
        return "Đã gửi lệnh"

    else:
        end = payload.get("end")
        start, slot = await vhl_service.get_optimize(carriage, "shelf")
        if start and slot:
            next_start = payload.get("next_start")
            next_end = payload.get("next_end")
            data = [start, end, next_start, next_end]
            await vhl_service.update_status(carriage, slot, "empty")
            await request_RCS(data)
            return "Đã gửi lệnh"
        else:
            return "Đã hết hàng trong toa"

async def execute_consolidation():
    carriages_to_fix = await vhl_service.fixed_carriage()
    if not carriages_to_fix:
        return

    all_slots = await vhl_service.get_carriages_data(carriages_to_fix)
    grouped = {}
    for s in all_slots:
        grouped.setdefault(s["carriage"], []).append(s)

    for c_id, slots in grouped.items():
        moves = await calculate_consolidation_moves(slots)
    
        for m in moves:
            logger.info(f"🚚 Requesting Robot: Carriage {c_id} | {m['from_slot']} -> {m['to_slot']}")
            
            data_single_request = [m["from_node"], m["to_node"]]
            
            await vhl_service.update_status(c_id, m["from_slot"], "empty")
            await vhl_service.update_status(c_id, m["to_slot"], "shelf")
            
            await request_RCS(data_single_request)
            

    logger.info("✅ Sucessfully execute consolidation.")
        

async def calculate_consolidation_moves(slots: list):
    moves = []
    empty_slots = [s for s in slots if s["status"] == "empty"]
    occupied_slots = [s for s in slots if s["status"] != "empty"]

    if not empty_slots or not occupied_slots:
        return []

    empty_idx = 0
    
    for occ_slot in occupied_slots:
        if empty_idx < len(empty_slots) and occ_slot["slot"] > empty_slots[empty_idx]["slot"]:
            target = empty_slots[empty_idx]
            
            moves.append({
                "from_node": occ_slot["node_id"],
                "to_node": target["node_id"],
                "from_slot": occ_slot["slot"],
                "to_slot": target["slot"]
            })
            
            empty_idx += 1
            
    return moves

async def update_slot_state(payload):
    await vhl_service.update_status(payload['carriage'], payload['slot'], payload['state'])

async def get_carriage_data():
    data = await vhl_service.get_carriage_slot()
    return data