from be.app.core.database import get_collection
from be.app.schemas.camera import CameraCreate, CameraOut, CameraUpdate
from be.shared.logging import get_logger
from typing import List, Optional, Tuple
from datetime import datetime
from bson import ObjectId
import cv2
# import numpy as np
# from io import BytesIO

logger = get_logger("camera_ai_app")

async def validate_area_exists(area_id: int) -> bool:
    """Kiểm tra xem area có tồn tại không theo area_id"""
    areas = get_collection("areas")
    area = await areas.find_one({"area_id": area_id})
    return area is not None

async def create_camera(camera_in: CameraCreate) -> CameraOut:
    """Tạo camera mới"""
    cameras = get_collection("cameras")
    
    for cam in camera_in.cameras:
        # Validate area tồn tại
        if not await validate_area_exists(cam.area_id):
            logger.warning(f"Camera creation failed: area '{cam.area_id}' does not exist")
            raise ValueError("Area does not exist")
        
        # Kiểm tra xem camera_id đã tồn tại chưa
        existing_id = await cameras.find_one({
            "cameras.cameraId": cam.cameraId
            })
        if existing_id:
            logger.warning(f"Camera creation failed: camera_id '{cam.cameraId}' already exists")
            raise ValueError("Camera ID already exists")
    
    camera_data = {
        "client_id": camera_in.client_id,
        "cameras": []
    }

    for cam in camera_in.cameras:
        rois_list = []
        if cam.rois:
            for node_id, roi in cam.rois.item():
                rois_list.append({
                    "node_id":str(node_id),
                    "roi": roi
                })

        camera_data["cameras"].append({
            "url":cam.url,
            "cameraId":cam.cameraId,
            "area_id": cam.area_id,
            "source_owner": cam.source_owner,
            "type_model": cam.type_model,
            "rois":rois_list
        })

    camera_data["created_at"] = datetime.utcnow()
    camera_data["updated_at"] = datetime.utcnow()
    
    result = await cameras.insert_one(camera_data)
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

async def get_cameras(skip: int = 0, limit: int = 1000) -> List[CameraOut]:
    """Lấy danh sách tất cả cameras"""
    cameras = get_collection("cameras")
    
    cursor = cameras.find().skip(skip).limit(limit)
    camera_list = await cursor.to_list(length=limit)
    
    return [CameraOut(**camera, id=str(camera["_id"])) for camera in camera_list]

async def get_cameras_by_area(area_id: int) -> List[CameraOut]:
    """Lấy danh sách cameras theo area"""
    cameras = get_collection("cameras")
    cursor = cameras.find({"cameras.area_id": area_id})
    documents = await cursor.to_list(length=None)
    result = []
    for doc in documents:
        filtered_cameras = [
            camera_item 
            for camera_item in doc.get("cameras", []) 
            if camera_item.get("area_id") == area_id
        ]
        if filtered_cameras:
            camera_data = {
                "id": str(doc["_id"]),
                "client_id": doc.get("client_id", 0),
                "cameras": filtered_cameras,
                "created_at": doc.get("created_at"),
                "updated_at": doc.get("updated_at")
            }
            result.append(CameraOut(**camera_data))
    
    return result

async def update_camera(camera_id: str, camera_update: CameraUpdate) -> Optional[CameraOut]:
    """Cập nhật camera theo MongoDB ID với payload CameraUpdate"""
    cameras = get_collection("cameras")

    # 1. Validate ID
    if not ObjectId.is_valid(camera_id):
        logger.warning(f"Invalid camera ID format: {camera_id}")
        return None

    existing_camera = await cameras.find_one({"_id": ObjectId(camera_id)})
    if not existing_camera:
        logger.warning(f"Camera not found for update: {camera_id}")
        return None

    update_doc = {}

    # 2. Cập nhật client_id (nếu gửi lên)
    if camera_update.client_id is not None:
        update_doc["client_id"] = camera_update.client_id

    # 3. Cập nhật danh sách cameras (nếu gửi lên)
    if camera_update.cameras:
        # 3.1. Validate area tồn tại cho từng camera
        for cam in camera_update.cameras:
            if not await validate_area_exists(cam.area_id):
                logger.warning(f"Camera update failed: area '{cam.area_id}' does not exist")
                raise ValueError("Area does not exist")

        # 3.2. Check trùng cameraId ở document khác
        for cam in camera_update.cameras:
            existing_id = await cameras.find_one({
                "cameras.cameraId": cam.cameraId,
                "_id": {"$ne": ObjectId(camera_id)}
            })
            if existing_id:
                logger.warning(f"Camera update failed: cameraId '{cam.cameraId}' already exists")
                raise ValueError("Camera ID already exists")

        # 3.3. Build lại mảng cameras theo format đang lưu trong Mongo
        new_cameras = []
        for cam in camera_update.cameras:
            rois_list = []
            if cam.rois:
                for roi in cam.rois:
                    # Schema vào là RoisList(nodeID:int, roi:list[float])
                    rois_list.append({
                        "node_id": str(roi.node_id),  # lưu string node_id trong DB
                        "roi": roi.roi,
                    })

            new_cameras.append({
                "url": cam.url,
                "cameraId": cam.cameraId,
                "area_id": cam.area_id,
                "source_owner": cam.source_owner,
                "type_model": cam.type_model,
                "rois": rois_list,
            })

        update_doc["cameras"] = new_cameras

    # 4. Nếu không có field nào để update → trả về bản cũ
    if not update_doc:
        return CameraOut(**existing_camera, id=str(existing_camera["_id"]))

    # 5. Ghi updated_at và update vào DB
    update_doc["updated_at"] = datetime.utcnow()

    result = await cameras.update_one(
        {"_id": ObjectId(camera_id)},
        {"$set": update_doc}
    )

    if result.modified_count == 0:
        logger.warning(f"No changes made to camera: {camera_id}")

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
    # Xóa camera
    result = await cameras.delete_one({"_id": ObjectId(camera_id)})
    
    if result.deleted_count == 0:
        logger.warning(f"Camera not found for deletion: {camera_id}")
        return False
    return True

async def get_camera_count_by_area(area_id: int) -> int:
    """Lấy số lượng cameras trong area"""
    cameras = get_collection("cameras")
    
    return await cameras.count_documents({"area_id": area_id})

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

async def get_all_bounding_boxes_by_camera():
    cameras = get_collection("cameras")
    cursor = cameras.find()
    documents = await cursor.to_list(length=None)
    result = []

    if not documents:
        logger.warning("No camera configs found in DB")
        return {}

    for doc in documents:
        starts = []
        ends = []

        for cam in doc.get("cameras", []):
            for roi_item in cam.get("rois",[]):
                node_id = roi_item.get("node_id", "").strip()
                roi = roi_item.get("roi", [])

                x, y, w, h = map(float, roi)
                bbox =  [x, y, x+w, y+h]

                if node_id.startwith("start"):
                    starts.append(bbox)
                else:
                    ends.append(bbox)

        result.append({
            "starts": starts,
            "ends": ends
        })
    
    if not result:
        logger.warning("Not found any document in collection `cameras`")

    return result