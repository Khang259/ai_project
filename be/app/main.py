from fastapi import FastAPI
from app.routers.parts_summary import router as parts_router
from app.routers.part_detail import router as part_detail_router
from app.routers.update_parts import router as update_router
from app.routers.sum_parts_replace import router as sum_parts_router
from app.routers.update_part_with_log import router as update_part_log_router

app = FastAPI(title="Maintenance Backend API", version="1.0")

app.include_router(parts_router, prefix="/api", tags=["Parts Summary"])
app.include_router(part_detail_router, prefix="/api", tags=["Part Detail"])
app.include_router(update_router, prefix="/api", tags=["Update Parts"])
app.include_router(sum_parts_router, prefix="/api", tags=["Sum Parts Replace"])
app.include_router(update_part_log_router, prefix="/api", tags=["Update Part With Log"])

@app.get("/")
def root():
    return {"message": "Maintenance API is running"}