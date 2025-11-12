from app.core.database import get_collection
from app.schemas.camera import CameraCreate, CameraOut, CameraUpdate
from shared.logging import get_logger
from typing import List, Optional, Tuple
from datetime import datetime
from bson import ObjectId
import cv2
import numpy as np
from io import BytesIO

logger = get_logger("camera_ai_app")

async def validate_area_exists(area_id: int) -> bool:
    """Kiểm tra xem area có tồn tại không theo area_id"""
    areas = get_collection("areas")
    area = await areas.find_one({"area_id": area_id})
    return area is not None

async def create_camera(camera_in: CameraCreate) -> CameraOut:
    """Tạo camera mới"""
    cameras = get_collection("cameras")
    
    # Validate area tồn tại
    if not await validate_area_exists(camera_in.area):
        logger.warning(f"Camera creation failed: area '{camera_in.area}' does not exist")
        raise ValueError("Area does not exist")
    
    # Kiểm tra xem camera_id đã tồn tại chưa
    existing_id = await cameras.find_one({"camera_id": camera_in.camera_id})
    if existing_id:
        logger.warning(f"Camera creation failed: camera_id '{camera_in.camera_id}' already exists")
        raise ValueError("Camera ID already exists")
    
    # Kiểm tra xem camera_name đã tồn tại chưa
    existing_name = await cameras.find_one({"camera_name": camera_in.camera_name})
    if existing_name:
        logger.warning(f"Camera creation failed: camera_name '{camera_in.camera_name}' already exists")
        raise ValueError("Camera name already exists")
    
    camera_data = {
        "camera_id": camera_in.camera_id,
        "camera_name": camera_in.camera_name,
        "camera_path": camera_in.camera_path,
        "area": camera_in.area,
        "roi": camera_in.roi,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await cameras.insert_one(camera_data)
    logger.info(f"Camera created successfully: {camera_in.camera_name} with camera_id: {camera_in.camera_id}")
    
    # Lấy camera vừa tạo để trả về
    created_camera = await cameras.find_one({"_id": result.inserted_id})
    return CameraOut(**created_camera, id=str(created_camera["_id"]))

async def get_camera(camera_id: str) -> Optional[CameraOut]:
    """Lấy camera theo MongoDB ID"""
    cameras = get_collection("cameras")
    
    if not ObjectId.is_valid(camera_id):
        logger.warning(f"Invalid camera ID format: {camera_id}")
        return None
    
    camera = await cameras.find_one({"_id": ObjectId(camera_id)})
    if not camera:
        logger.warning(f"Camera not found: {camera_id}")
        return None
    
    return CameraOut(**camera, id=str(camera["_id"]))

async def get_camera_by_camera_id(camera_id: int) -> Optional[CameraOut]:
    """Lấy camera theo camera_id (không phải MongoDB ObjectId)"""
    cameras = get_collection("cameras")
    
    camera = await cameras.find_one({"camera_id": camera_id})
    if not camera:
        logger.warning(f"Camera not found with camera_id: {camera_id}")
        return None
    
    return CameraOut(**camera, id=str(camera["_id"]))

async def get_cameras(skip: int = 0, limit: int = 100) -> List[CameraOut]:
    """Lấy danh sách tất cả cameras"""
    cameras = get_collection("cameras")
    
    cursor = cameras.find().skip(skip).limit(limit)
    camera_list = await cursor.to_list(length=limit)
    
    return [CameraOut(**camera, id=str(camera["_id"])) for camera in camera_list]

async def get_cameras_by_area(area_id: int) -> List[CameraOut]:
    """Lấy danh sách cameras theo area"""
    cameras = get_collection("cameras")
    
    cursor = cameras.find({"area": area_id})
    camera_list = await cursor.to_list(length=None)
    
    return [CameraOut(**camera, id=str(camera["_id"])) for camera in camera_list]

async def update_camera(camera_id: str, camera_update: CameraUpdate) -> Optional[CameraOut]:
    """Cập nhật camera"""
    cameras = get_collection("cameras")
    
    if not ObjectId.is_valid(camera_id):
        logger.warning(f"Invalid camera ID format: {camera_id}")
        return None
    
    # Kiểm tra camera có tồn tại không
    existing_camera = await cameras.find_one({"_id": ObjectId(camera_id)})
    if not existing_camera:
        logger.warning(f"Camera not found for update: {camera_id}")
        return None
    
    # Chuẩn bị dữ liệu cập nhật
    update_data = {}
    for field, value in camera_update.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    # Validate area nếu có thay đổi
    if "area" in update_data:
        if not await validate_area_exists(update_data["area"]):
            logger.warning(f"Camera update failed: area '{update_data['area']}' does not exist")
            raise ValueError("Area does not exist")
    
    # Kiểm tra camera_id mới có trùng không (nếu có thay đổi)
    if "camera_id" in update_data:
        existing_id = await cameras.find_one({
            "camera_id": update_data["camera_id"],
            "_id": {"$ne": ObjectId(camera_id)}
        })
        if existing_id:
            logger.warning(f"Camera update failed: camera_id '{update_data['camera_id']}' already exists")
            raise ValueError("Camera ID already exists")
    
    # Kiểm tra camera_name mới có trùng không (nếu có thay đổi)
    if "camera_name" in update_data:
        existing_name = await cameras.find_one({
            "camera_name": update_data["camera_name"],
            "_id": {"$ne": ObjectId(camera_id)}
        })
        if existing_name:
            logger.warning(f"Camera update failed: camera_name '{update_data['camera_name']}' already exists")
            raise ValueError("Camera name already exists")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await cameras.update_one(
        {"_id": ObjectId(camera_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        logger.warning(f"No changes made to camera: {camera_id}")
        return None
    
    logger.info(f"Camera updated successfully: {camera_id}")
    
    # Lấy camera đã cập nhật để trả về
    updated_camera = await cameras.find_one({"_id": ObjectId(camera_id)})
    return CameraOut(**updated_camera, id=str(updated_camera["_id"]))

async def delete_camera(camera_id: str) -> bool:
    """Xóa camera"""
    cameras = get_collection("cameras")
    
    if not ObjectId.is_valid(camera_id):
        logger.warning(f"Invalid camera ID format: {camera_id}")
        return False
    
    # Kiểm tra camera có tồn tại không
    camera = await cameras.find_one({"_id": ObjectId(camera_id)})
    if not camera:
        logger.warning(f"Camera not found for deletion: {camera_id}")
        return False
    
    camera_name = camera["camera_name"]
    
    # Xóa camera
    result = await cameras.delete_one({"_id": ObjectId(camera_id)})
    
    if result.deleted_count == 0:
        logger.warning(f"Camera not found for deletion: {camera_id}")
        return False
    
    logger.info(f"Camera '{camera_name}' deleted successfully")
    return True

async def get_camera_count_by_area(area_id: int) -> int:
    """Lấy số lượng cameras trong area"""
    cameras = get_collection("cameras")
    
    return await cameras.count_documents({"area": area_id})

def generate_frames_from_rtsp(rtsp_url: str):
    """
    Generator để stream frames từ RTSP camera
    
    Args:
        rtsp_url: URL RTSP của camera
        
    Yields:
        bytes: JPEG frame trong multipart format
    """
    cap = cv2.VideoCapture(rtsp_url)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    
    if not cap.isOpened():
        logger.error(f"Cannot open camera stream for streaming: {rtsp_url}")
        return
    
    try:
        while True:
            ret, frame = cap.read()
            
            if not ret:
                logger.warning(f"Cannot read frame, reconnecting...")
                break
            
            # Encode frame to JPEG
            success, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            
            if not success:
                continue
            
            # Convert to bytes
            frame_bytes = buffer.tobytes()
            
            # Yield frame in multipart format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                   
    except Exception as e:
        logger.error(f"Error in frame generator: {str(e)}")
    finally:
        cap.release()
        logger.info(f"Camera stream closed: {rtsp_url}")

async def health_check_camera(camera_id: str) -> bool:
    """Kiểm tra kết nối của camera"""
    cameras = get_collection("cameras")
    
    camera = await cameras.find_one({"_id": ObjectId(camera_id)})
    if not camera:
        logger.warning(f"Camera not found for health check: {camera_id}")
        return False
    return True
