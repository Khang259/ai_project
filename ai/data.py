from datetime import datetime

def payload_sent_ICS(start_point, end_point):
    now = datetime.now()
    start_num = ''.join(filter(str.isdigit, str(start_point)))
    end_num = ''.join(filter(str.isdigit, str(end_point)))
    
    data = {
            "modelProcessCode": "moveShelfLimit",
            "fromSystem": "ICS",
            "orderId": f"{now}_{start_num}-{end_num}",
            "taskOrderDetail": [
                {"taskPath": f"{start_num},{end_num}"}
            ]
        }
    return data