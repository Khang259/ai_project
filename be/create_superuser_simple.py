import asyncio
from pymodbus.client import AsyncModbusTcpClient
import logging

# Cấu hình Logging để nhìn thấy lỗi nếu có
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ModbusSimulator")

async def test_simulator():
    # 1. Cấu hình kết nối đến GIẢ LẬP (Localhost)
    host = '127.0.0.1'
    port = 5020  # Trùng với port bạn cài ở bước F3
    
    logger.info(f"Đang kết nối đến giả lập {host}:{port}...")

    # 2. Khởi tạo Client
    async with AsyncModbusTcpClient(host, port=port) as client:
        # Kết nối
        connected = await client.connect()
        if not connected:
            logger.error("❌ Không thể kết nối! Kiểm tra lại F3 trong Modbus Slave.")
            return

        logger.info("✅ Kết nối thành công! Hãy nhìn màn hình Modbus Slave.")

        # 3. Gửi lệnh Bật Relay 1 (Address 0)
        logger.info(">> BẬT Relay 1 (Address 0)")
        # slave=1 cho khớp với bước F2
        await client.write_coil(0, True, slave=1) 
        
        # Hãy nhìn màn hình phần mềm, dòng đầu tiên sẽ nhảy số 1 (hoặc tích xanh)
        await asyncio.sleep(2)

        # 4. Gửi lệnh Tắt Relay 1
        logger.info(">> TẮT Relay 1")
        await client.write_coil(0, False, slave=1)
        
        # 5. Test thử bật Relay 8 (Address 7)
        logger.info(">> BẬT Relay 8 (Address 7)")
        await client.write_coil(7, True, slave=1)
        await asyncio.sleep(1)
        await client.write_coil(7, False, slave=1)

        logger.info("Hoàn tất test.")

if __name__ == "__main__":
    asyncio.run(test_simulator())