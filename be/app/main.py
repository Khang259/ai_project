from fastapi import FastAPI
from app.routers.parts_summary import router as parts_router
from app.routers.part_detail import router as part_detail_router
from app.routers.update_parts import router as update_router

app = FastAPI(title="Maintenance Backend API", version="1.0")

app.include_router(parts_router, prefix="/api", tags=["Parts Summary"])
app.include_router(part_detail_router, prefix="/api", tags=["Part Detail"])
app.include_router(update_router, prefix="/api", tags=["Update Parts"])

@app.get("/")
def root():
    return {"message": "Maintenance API is running"}