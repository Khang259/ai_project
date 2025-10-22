from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "amrMaintenance")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

parts_catalog = db["parts_catalog"]
listAmr = db["listAmr"]
amrParts = db["amrParts"]
maintenanceCheck = db["maintenanceCheck"]
maintenanceLogs = db["maintenanceLogs"]
checkLogs = db["checkLogs"]