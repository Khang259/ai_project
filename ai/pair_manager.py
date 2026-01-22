# File: pair_manager.py
import requests
from setup_log import setup_logger
from data import payload_sent_ICS

logger = setup_logger("pair_manager", "logs/pair_manager/log")

def get_validate_pairs(config_validate_pairs):
    """
    Return validate pairs from config.
    Validate pairs get from MongoDB

    """
    return set(config_validate_pairs)

def pair_points(ready_starts, ready_ends, validate_pairs):
    """Pair ready starts and ends if valid."""
    pairs = []
    for start in ready_starts:
        for end in ready_ends:
            if (start, end) in validate_pairs:
                pairs.append((start, end))
                logger.info(f"Valid pair found: ({start}, {end})")
    return pairs

def trigger_post(ics_url, payload_sent_ICS):
    """Send POST request."""
    try:
        response = requests.post(ics_url, json=payload_sent_ICS, timeout=1)
        if response.status_code == 1000:
            logger.info(f"POST success for {payload_sent_ICS['orderId']}")
            return True
        else:
            logger.error(f"POST failed: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"POST error: {e}")
        return False