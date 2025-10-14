import json
import copy

def generate_amr_catalog():
    # Đọc file hiện tại
    with open('json/parts_catalog.json', 'r', encoding='utf-8') as f:
        current_data = json.load(f)
    
    print(f"File hiện tại có {len(current_data)} documents")
    
    # Lấy template từ 44 linh kiện của amr001
    amr001_parts = [part for part in current_data if part.get("amr_id") == "amr001"]
    print(f"Tìm thấy {len(amr001_parts)} linh kiện của amr001")
    
    # Tạo danh sách mới với tất cả AMR
    all_parts = []
    
    # Thêm 80 AMR (amr001 đến amr080)
    for amr_num in range(1, 81):
        amr_id = f"amr{amr_num:03d}"  # Format: amr001, amr002, ..., amr080
        
        # Copy 44 linh kiện cho mỗi AMR
        for part in amr001_parts:
            new_part = copy.deepcopy(part)
            new_part["amr_id"] = amr_id
            all_parts.append(new_part)
        
        if amr_num % 10 == 0:
            print(f"Đã tạo xong AMR {amr_id}")
    
    # Ghi file mới
    with open('json/parts_catalog.json', 'w', encoding='utf-8') as f:
        json.dump(all_parts, f, ensure_ascii=False, indent=4)
    
    print(f"Đã tạo thành công {len(all_parts)} documents cho 80 AMR")
    print(f"Mỗi AMR có {len(amr001_parts)} linh kiện")
    print(f"Tổng số AMR: 80 (amr001 đến amr080)")

if __name__ == "__main__":
    generate_amr_catalog()
