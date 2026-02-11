from fastapi import APIRouter, HTTPException, status, FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId

client = AsyncIOMotorClient("mongodb+srv://CamAI_DB:Xinhzai1102%40%40@cluster0.1xazymq.mongodb.net/")
db = client.logistics_db

class PointPair(BaseModel):
    id: str = Field(default=None, alias="_id") 
    loadName: str
    unloadName: str
    area: Optional[str] = ""

    class Config:
        populate_by_name = True 
        # allow_population_by_field_name = True

# Helper to format MongoDB doc
def pair_helper(pair) -> dict:
    return {
        "id": str(pair["_id"]),
        "loadName": pair["loadName"],
        "unloadName": pair["unloadName"],
        "area": pair.get("area", "")
    }

app = FastAPI()
router = APIRouter()

@router.get("/points")
async def get_points():
    pairs = await db.points.find().to_list(1000)
    return [pair_helper(p) for p in pairs]

@router.post("/points")
async def add_pair(pair: PointPair):
    new_pair = await db.points.insert_one(pair.dict(exclude={"id"}))
    return {"id": str(new_pair.inserted_id)}

@router.put("/points/{pair_id}")
async def update_pair(pair_id: str, pair: PointPair):
    await db.points.update_one({"_id": ObjectId(pair_id)}, {"$set": pair.dict(exclude={"id"})})
    return {"status": "updated"}

@router.delete("/points/{pair_id}")
async def delete_pair(pair_id: str):
    await db.points.delete_one({"_id": ObjectId(pair_id)})
    return {"status": "deleted"}

from typing import List

@router.post("/points/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_add_pairs(pairs: List[PointPair]):
    # Convert Pydantic models to dicts, excluding the 'id' field
    pair_dicts = [p.dict(exclude={"id"}, by_alias=True) for p in pairs]
    
    if not pair_dicts:
        raise HTTPException(status_code=400, detail="No valid data provided")
        
    result = await db.points.insert_many(pair_dicts)
    return {"inserted_count": len(result.inserted_ids)}

app.include_router(router)