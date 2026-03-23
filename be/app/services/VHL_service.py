from datetime import datetime, timezone
from shared.logging import get_logger
from app.core.database import get_collection
import asyncio
from typing import Optional
import contextlib
import asyncio
import time

logger = get_logger("logic_service")

DEFAULT_CARRIAGES = [
    {"carriage": 1, "slot": 1, "node_id": 40000368, "status": "shelf"}, {"carriage": 1, "slot": 2, "node_id": 40000369, "status": "shelf"}, {"carriage": 1, "slot": 3, "node_id": 40000370, "status": "shelf"},
            {"carriage": 1, "slot": 4, "node_id": 40000371, "status": "shelf"}, {"carriage": 1, "slot": 5, "node_id": 40000367, "status": "shelf"},
    {"carriage": 2, "slot": 1, "node_id": 40000383, "status": "shelf"}, {"carriage": 2, "slot": 2, "node_id": 40000384, "status": "shelf"}, {"carriage": 2, "slot": 3, "node_id": 40000385, "status": "shelf"},
            {"carriage": 2, "slot": 4, "node_id": 40000376, "status": "shelf"}, {"carriage": 2, "slot": 5, "node_id": 40000377, "status": "shelf"},
    {"carriage": 3.1, "slot": 1, "node_id": 40000154, "status": "shelf"}, {"carriage": 3.1, "slot": 2, "node_id": 40000156, "status": "shelf"}, {"carriage": 3.1, "slot": 3, "node_id": 40000158, "status": "shelf"},
            {"carriage": 3.1, "slot": 4, "node_id": 40000159, "status": "shelf"}, {"carriage": 3.1, "slot": 5, "node_id": 40000160, "status": "shelf"}, {"carriage": 3.1, "slot": 5, "node_id": 40000208, "status": "shelf"},
    {"carriage": 3.2, "slot": 1, "node_id": 40000141, "status": "shelf"}, {"carriage": 3.2, "slot": 2, "node_id": 40000146, "status": "shelf"}, {"carriage": 3.2, "slot": 3, "node_id": 40000147, "status": "shelf"},
            {"carriage": 3.2, "slot": 4, "node_id": 40000148, "status": "shelf"}, {"carriage": 3.2, "slot": 5, "node_id": 40000138, "status": "shelf"}, {"carriage": 3.2, "slot": 5, "node_id": 40000137, "status": "shelf"},
    {"carriage": 4.1, "slot": 1, "node_id": 40005576, "status": "shelf"}, {"carriage": 4.1, "slot": 2, "node_id": 40005575, "status": "shelf"}, {"carriage": 4.1, "slot": 3, "node_id": 40005574, "status": "shelf"},
            {"carriage": 4.1, "slot": 4, "node_id": 40005572, "status": "shelf"},
    {"carriage": 4.2, "slot": 1, "node_id": 40001423, "status": "shelf"}, {"carriage": 4.2, "slot": 2, "node_id": 40000126, "status": "shelf"}, {"carriage": 4.2, "slot": 3, "node_id": 40000127, "status": "shelf"},
            {"carriage": 4.2, "slot": 4, "node_id": 40000128, "status": "shelf"}, {"carriage": 4.2, "slot": 5, "node_id": 40000130, "status": "shelf"},
]

class VHL_Service:
    def __init__(self) -> None:
        self._consumer_task: Optional[asyncio.Task] = None
        self.current_robot_state = ""
        self.counting_idle_time: Optional[float] = None

    async def start(self) -> None:
        await self.initialize_carriage()
        if self._consumer_task is None:
            self._consumer_task = asyncio.create_task(self._consumer_loop())

    async def stop(self) -> None:
        if self._consumer_task:
            self._consumer_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._consumer_task
            self._consumer_task = None
    
    async def update_robot_state(self, state):
        self.current_robot_state = state

    async def _consumer_loop(self) -> None:
        while True:
            try:                         
                await self.trigger_consolidation()
                logger.info(f"{self.current_robot_state}")
                await self.trigger_idle(self.current_robot_state)

                await asyncio.sleep(5) 
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in manager loop: {e}")
                await asyncio.sleep(1)

    async def initialize_carriage(self):
        carriage_collection = get_collection("carriages")
        
        for carriage in DEFAULT_CARRIAGES:
            existing = await carriage_collection.find_one({"carriage": carriage["carriage"], "slot": carriage['slot']})
            if not existing:
                data = {
                    **carriage,
                    "created_at": datetime.utcnow(),
                }
                await carriage_collection.insert_one(data)
                logger.info(f"Created slot {carriage['slot']} carriage: {carriage['carriage']}")

    async def update_status(self, carriage, slot, new_status):
        carriage_collection = get_collection("carriages")
        now = datetime.now(timezone.utc)

        try:
            query = {
                "carriage": float(carriage),
                "slot": int(slot)
            }
            
            update_data = {
                "$set": {
                    "status": str(new_status),
                    "updated_at": now
                }
            }

            result = await carriage_collection.update_one(query, update_data)

            if result.matched_count > 0:
                if result.modified_count > 0:
                    logger.info(f"✅ Update Carriage {carriage} - Slot {slot} -> {new_status}")
                else:
                    logger.info(f"ℹ️ Carriage {carriage} - Slot {slot} is currently {new_status}.")
                return True
            
            logger.error(f"❌ Cannot find any: Carriage {carriage}, Slot {slot}")
            return False

        except ValueError:
            logger.error("❌ Error: Carriage và Slot must be int!")
            return False

    async def get_optimize(self, carriage, status):
        carriage_collection = get_collection("carriages")

        optimized_slot = await carriage_collection.find_one(
            {
                "carriage": carriage, 
                "status": status 
            },
            sort=[("slot", 1)] 
        )

        if optimized_slot:
            if status == "empty":
                behind_slot = await carriage_collection.find_one({
                    "carriage": carriage,
                    "slot": {"$gt": optimized_slot['slot']}, # $gt là viết tắt của Greater Than (>)
                    "status": "shelf"
                })

                if behind_slot:
                    logger.info(f"⚠️ Warning: Finding {behind_slot['slot']} is currently have shelf. Cannot forward")
                    return None, None 
        
            logger.info(f"📍 Reaching: Carriage {carriage} - Slot {optimized_slot['slot']}")
            node_id = optimized_slot.get("node_id")
            slot = optimized_slot.get("slot")
            return node_id, slot
        
        logger.warning(f"❌ Carriage {carriage} is currently full/ empty!")
        return None, None

    async def get_carriage_slot(self):
        carriage_collection = get_collection("carriages")

        cursor = carriage_collection.find().sort([("carriage", 1), ("slot", 1)])
        all_slots = await cursor.to_list(length=None)

        for item in all_slots:
            item["_id"] = str(item["_id"])
            
            if "updated_at" in item and item["updated_at"]:
                item["updated_at"] = item["updated_at"].isoformat()
            if "created_at" in item and item["created_at"]:
                item["created_at"] = item["created_at"].isoformat()

        return all_slots

    async def trigger_idle(self, state: str):
        if state == "Idle":
            if self.counting_idle_time is None:
                self.counting_idle_time = time.time()
        else:
            self.counting_idle_time = None
            self.current_robot_state = state
            return False

        if self.counting_idle_time:
            elapsed_time = time.time() - self.counting_idle_time
            
            if elapsed_time >= 600: 
                logger.info("🚨 The Robot has idled for 5 minutes, execute consolidation...")
                self.counting_idle_time = None 
                from app.services.VHL_logic import execute_consolidation 
                
                await execute_consolidation()
                return True
                
        return False

    async def trigger_consolidation(self):
        carriages_to_fix = await self.fixed_carriage()

        if not carriages_to_fix or len(carriages_to_fix) != 5:
            logger.info("Carriages still have shelf")
            return
        else:
            from app.services.VHL_logic import execute_consolidation 
            logger.info(f"Execute trigger consolid")
            await execute_consolidation()
            return True

    async def fixed_carriage(self):
        carriage_collection = get_collection("carriages")
        
        query = {
            "slot": {"$in": [1, 2]},
            "status": "empty"
        }
        
        carriages_to_fix = await carriage_collection.distinct("carriage", query)

        return carriages_to_fix

    async def get_carriages_data(self, carriages_to_fix: list):
        if not carriages_to_fix:
            return []

        carriage_collection = get_collection("carriages")
        
        query = {"carriage": {"$in": carriages_to_fix}}
        
        cursor = carriage_collection.find(query).sort([("carriage", 1), ("slot", 1)])
        
        all_data = await cursor.to_list(length=None)
        
        logger.info(f"Loaded {len(all_data)} slots for carriages: {carriages_to_fix}")
        return all_data

vhl_service = VHL_Service()
