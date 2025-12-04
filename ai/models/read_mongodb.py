
from dotenv import load_dotenv
import os

load_dotenv()
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId # Import this to detect the ObjectIds
from slot_status_schema import SlotStatusModel

app = FastAPI()

client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
db = client["CamAI_Honda"] # Replace with your database name
collection= db["nodes"]
slot_collection=db["slot_status"]

# --- HELPER FUNCTION ---
# This function digs through lists and dicts to find and fix ObjectIds
def fix_mongo_ids(data):
    if isinstance(data, list):
        return [fix_mongo_ids(item) for item in data]
    if isinstance(data, dict):
        return {key: fix_mongo_ids(value) for key, value in data.items()}
    if isinstance(data, ObjectId):
        return str(data)
    return data
# -----------------------

@app.get("/")
async def read_entire_database():
    collection_names = await db.list_collection_names()
    full_database_data = {}

    for name in collection_names:
        # Get the raw data
        documents = await db[name].find().to_list(length=100)
        
        # Clean the ENTIRE list of documents using our helper
        # This handles nested IDs, lists of IDs, etc.
        cleaned_documents = fix_mongo_ids(documents)
        
        full_database_data[name] = cleaned_documents
        
    return full_database_data

@app.get("/nodes") # Changed endpoint name to be more accurate
async def read_nodes_only():
    # 1. Query ONLY the 'nodes' collection
    documents = await collection.find().to_list(length=100)
    
    # 2. Clean the IDs
    cleaned_documents = fix_mongo_ids(documents)
    
    # 3. Return the list directly
    return cleaned_documents

@app.post("/slot-status")
async def update_slot_status(status:SlotStatusModel):
    # serialize custom model to mongodb model
    slot_dict = status.model_dump()

    # add new qr_code status to mongodb collection
    new_status = await slot_collection.insert_one(slot_dict)

    return {"message": "Success", "new entry": str(new_status)} 