from pymongo import MongoClient

# 1. Kết nối (Nhớ thay đổi port 27017 hoặc 27018 tùy database của bạn)
client = MongoClient('mongodb://localhost:27018/') 
db = client['Honda_AI']
collection = db['nodes'] # Tên collection trong ảnh là 'nodes' phải không?

# 2. Thực hiện update
# {} : Chọn tất cả bản ghi
# $set : Chỉ sửa trường owner, giữ nguyên các trường khác
ket_qua = collection.update_many(
    {}, 
    { "$set": { "owner": "KD_user" } }
)

print(f"Đã cập nhật {ket_qua.modified_count} bản ghi.")