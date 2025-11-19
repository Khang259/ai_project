"""
Script đơn giản để tạo superuser admin với tham số mặc định
Sử dụng: python create_superuser_simple.py
Hoặc: python create_superuser_simple.py <username> <password>
"""

import asyncio
import sys
import os
from datetime import datetime

# Thêm đường dẫn để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import connect_to_mongo, close_mongo_connection, get_collection
from app.core.security import get_password_hash
from app.core.config import settings
from shared.logging import get_logger


async def create_superuser(username: str = "admin", password: str = "123456"):
    """
    Tạo superuser với quyền admin
    
    Args:
        username: Tên đăng nhập (mặc định: admin)
        password: Mật khẩu (mặc định: admin123)
    """
    try:
        # Kết nối database
        await connect_to_mongo(settings.mongo_url, settings.mongo_db)
        
        # Lấy collection users
        users = get_collection("users")
        
        # Kiểm tra xem user đã tồn tại chưa
        existing_user = await users.find_one({"username": username})
        if existing_user:
            print(f"\n❌ User '{username}' đã tồn tại trong database!")
            print(f"   ID: {existing_user['_id']}")
            print(f"   Superuser: {existing_user.get('is_superuser', False)}")
            
            # Hỏi có muốn cập nhật thành superuser không
            if not existing_user.get('is_superuser', False):
                update = input("\nBạn có muốn cập nhật user này thành superuser? (y/n): ").strip().lower()
                if update == 'y':
                    # Cập nhật password và set superuser
                    hashed_password = get_password_hash(password)
                    await users.update_one(
                        {"_id": existing_user["_id"]},
                        {"$set": {
                            "hashed_password": hashed_password,
                            "is_superuser": True,
                            "updated_at": datetime.utcnow()
                        }}
                    )
                    print(f"\n✅ User '{username}' đã được cập nhật thành superuser!")
                    print(f"   Password đã được đổi thành: {password}")
                    return True
            return False
        
        
        # Tạo user data
        user_data = {
            "username": username,
            "hashed_password": password,
            "is_active": True,
            "is_superuser": True,  # Quyền superuser
            "group_id": 0,
            "area_id": 0,
            "roles": [],  # Superuser không cần roles
            "permissions": [],  # Superuser có tất cả quyền
            "route": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None
        }
        
        # Insert vào database
        result = await users.insert_one(user_data)
        user_id = str(result.inserted_id)
        
        print("\n" + "="*50)
        print("✅ SUPERUSER ĐÃ ĐƯỢC TẠO THÀNH CÔNG!")
        print("="*50)
        print(f"Username: {username}")
        print(f"Password: {password}")
        print(f"User ID: {user_id}")
        print(f"Superuser: True")
        print(f"Active: True")
        print("="*50)
        print("\n⚠️  Lưu ý: Hãy lưu lại thông tin đăng nhập này!")
        print("="*50)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Đóng kết nối
        await close_mongo_connection()

async def main():
    """Hàm main để chạy script"""
    # Lấy tham số từ command line hoặc dùng mặc định
    if len(sys.argv) >= 3:
        username = sys.argv[1]
        password = sys.argv[2]
    elif len(sys.argv) == 2:
        username = sys.argv[1]
        password = "123456"
    else:
        username = "admin"
        password = "123456"
    
    print("\n" + "="*50)
    print("TẠO SUPERUSER ADMIN")
    print("="*50)
    print(f"\nSẽ tạo user với thông tin:")
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    
    # Tạo superuser
    success = await create_superuser(username, password)
    
    if success:
        print("\n✅ Hoàn thành!")
    else:
        print("\n❌ Không thể tạo superuser!")

if __name__ == "__main__":
    asyncio.run(main())

