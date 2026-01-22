from datetime import datetime

now = datetime.now()
formatted_time = now.strftime("%H:%M:%S")

def payload_sent_ICS(start_point, end_point):
    data = {
            "modelProcessCode": "test",
            "fromSystem": "ICS",
            "orderId": f"thaod_1_3_{formatted_time}",
            "taskOrderDetail": [
                {"taskPath": f"{start_point},{end_point}"}
            ]
        }