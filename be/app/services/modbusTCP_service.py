from pymodbus.client import ModbusTcpClient
from typing import Dict, Any
from shared.logging import get_logger
from dataclasses import dataclass
from app.core.database import get_collection
import asyncio
import time

logger = get_logger("camera_ai_app")

UNIT_ID = 1

@dataclass
class ModbusDeviceConfig:
    """Cấu hình cho một Modbus device (đèn còi)"""
    name: str  # Tên mô tả (ví dụ: "Kho A - Đèn còi")
    host: str  # IP address
    port: int = 502
    timeout: int = 3
    group_id: int = 0


class ModbusDeviceManager:
    """
    Service quản lý cấu hình các Modbus devices (đèn còi)
    - Lưu trữ cấu hình các devices
    - Cung cấp hàm để gửi lệnh đến devices
    - Hỗ trợ gửi đến nhiều devices cùng lúc
    """
    
    def __init__(self):
        self._devices: Dict[str, ModbusDeviceConfig] = {}
    
    async def start(self) -> None:
        """Khởi động service - load cấu hình từ database"""
        logger.info("Starting Modbus Device Manager...")
        await self.load_devices_from_db()
        logger.info(f"Modbus Device Manager started with {len(self._devices)} devices")
    
    async def stop(self) -> None:
        """Dừng service"""
        logger.info("Stopping Modbus Device Manager...")
        # Không cần đóng kết nối vì không giữ kết nối liên tục
        logger.info("Modbus Device Manager stopped")
    
    async def load_devices_from_db(self) -> None:
        """Load danh sách devices từ database"""
        try:
            devices_collection = get_collection("modbus_devices")
            cursor = devices_collection.find({})
            devices = await cursor.to_list(length=None)
            
            self._devices.clear()
            for device_doc in devices:
                config = ModbusDeviceConfig(
                    name=device_doc.get("name", ""),
                    host=device_doc.get("host"),
                    port=device_doc.get("port", 502),
                    timeout=device_doc.get("timeout", 3),
                    group_id=device_doc.get("group_id", 0)
                )
                self._devices[config.name] = config
            
            logger.info(f"Loaded {len(self._devices)} Modbus devices from database")
        except Exception as e:
            logger.error(f"Error loading devices from database: {e}")
    
    async def get_health_summary(self) -> Dict[str, Any]:
        """
        Lấy summary bằng cách so sánh devices trong DB với list hiện tại
        
        Returns:
            Dict với summary và danh sách devices
        """
        try:
            # Lấy danh sách devices từ database
            devices_collection = get_collection("modbus_devices")
            cursor = devices_collection.find({})
            db_devices = await cursor.to_list(length=None)
            
            # Lấy danh sách tên devices từ DB
            db_device_names = {device.get("name", "") for device in db_devices if device.get("name")}
            
            # Lấy danh sách tên devices hiện tại trong memory
            memory_device_names = set(self._devices.keys())
            
            # So sánh
            total = len(db_device_names)
            in_memory = len(memory_device_names)
            missing_in_memory = db_device_names - memory_device_names
            extra_in_memory = memory_device_names - db_device_names
            
            return {
                "summary": {
                    "total_in_db": total,
                    "total_in_memory": in_memory,
                    "missing_in_memory": len(missing_in_memory),
                }
            }
        except Exception as e:
            logger.error(f"Error getting health summary: {e}")
            return {
                "summary": {
                    "total_in_db": 0,
                    "total_in_memory": len(self._devices),
                    "error": str(e)
                }
            }

    async def send_alert_to_group(self, group_id: int) -> bool:
        """Gửi lệnh báo động đến một group"""
        loop = asyncio.get_event_loop()
        
        for device in self._devices.values():
            if device.group_id == group_id:
                try:
                    logger.info(f"Sending alert to device {device.name}")
                    
                    # Tạo client và kết nối trong thread pool
                    client = await loop.run_in_executor(
                        None,
                        lambda: ModbusTcpClient(host=device.host, port=device.port, timeout=device.timeout)
                    )
                    
                    connected = await loop.run_in_executor(None, client.connect)
                    if connected:
                        await loop.run_in_executor(None, lambda: client.write_coil(0, True, slave=UNIT_ID))
                        await asyncio.sleep(3)
                        await loop.run_in_executor(None, lambda: client.write_coil(0, False, slave=UNIT_ID))
                        await loop.run_in_executor(None, client.close)
                        logger.info(f"Horn ring for group {group_id} sent")
                except Exception as e:
                    logger.error(f"Error sending alert to device {device.name}: {e}")
        return True
# Singleton instance
modbus_device_manager = ModbusDeviceManager()