# File: pair_manager.py
import requests
from setup_log import setup_logger
from data import payload_sent_ICS

logger = setup_logger("pair_manager", "logs/pair_manager/log")

def get_validate_pairs(config_validate_pairs):
    return set(config_validate_pairs)

def pair_points(ready_starts, ready_ends, validate_pairs):
    """Pair ready starts and ends if valid."""
    payloads = []
    ready_pair = []
    for start_points in ready_starts:
        for end_points in ready_ends:
            if (start_points, end_points) in validate_pairs:
                payload = payload_sent_ICS(start_points, end_points)
                payloads.append(payload)
                ready_pair.append((start_points, end_points))
                logger.info(f"Valid pair found: ({start_points}, {end_points})")
    return ready_pair, payloads

def trigger_post(ICS_URL, payload):  # Thay đổi tham số thành payload (dict một cái)
    """Send POST request với một payload."""
    try:
        response = requests.post(ICS_URL, json=payload, timeout=5)  # Tăng timeout lên 5s
        logger.debug(f"Payload sent: {payload}")
        
        if response.status_code == 200:
            response_from_ics = response.json()
            if response_from_ics.get("code") == 1000:
                logger.info(f"POST success for orderId: {payload['orderId']}")
                return True
            else:
                logger.error(f"ICS error response: {response_from_ics}")
                return False
        else:
            logger.error(f"POST failed - status code: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"POST error: {e}")
        return False