import requests
import json

# ... phần code chuẩn bị data của bạn ...
url = "http://rcs-server-ip:port/api/..."
payload = {
    "modelProcessCode": "Cap_tra_phu_tung",
    "subTasks": [...] 
}

# Gửi request
response = requests.post(url, json=payload) # Hoặc data=json.dumps(payload)

# --- ĐOẠN SCRIPT LOGGING CẦN THÊM ---
print("----- ACTUAL HEADERS SENT -----")
print(response.request.headers)

print("\n----- ACTUAL BODY SENT -----")
# Đây là chuỗi JSON thực tế được gửi đi. Hãy copy đoạn này bỏ vào Postman xem chạy được không
print(response.request.body) 

print("\n----- SERVER RESPONSE -----")
print(response.status_code)
print(response.text)
# -------------------------------------