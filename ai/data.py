from datetime import datetime

now = datetime.now()
formatted_time = now.strftime("%H:%M:%S")

def payload_sent_ICS(start_point, end_point):
    """Convert "start_xxxx" into "xxxx" """
    start_num = ''.join(filter(str.isdigit, str(start_point)))
    end_num = ''.join(filter(str.isdigit, str(end_point)))
    
    data = {
            "modelProcessCode": "moveShelf1",
            "fromSystem": "ICS",
            "orderId": f"{now}",
            "taskOrderDetail": [
                {"taskPath": f"{start_num},{end_num}"}
            ]
        }
    return data