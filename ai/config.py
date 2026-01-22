# File: config.py
# Configuration file for constants

ICS_URL = "http://example.com/ics/taskOrder/addTask"  # Replace with actual URL
VALIDATE_PAIRS = [
    ("start_10000452", "end_10000557"),
    ("start_10000455", "end_10000558"),
    ("start_10000458", "end_10000559"),
    ("start_10000461", "end_10000560"),
    # Add more pairs as needed
]

# Simulate camera data (rtsp, rois, node_ids) - in real, import from camera_service.py
CAMERAS = [
    {
        "rtsp": "rtsp://127.0.0.1:8554/start",
        "rois": [{"node_id": "start_10000565", "roi": [281, 405, 166, 127]}],
        "rois": [{"node_id": "start_10000570", "roi": [460, 412, 205, 128]}],
    },
    {
        "rtsp": "rtsp://127.0.0.1:8554/end",
        "rois": [
            {"node_id": "start_10000452", "roi": [673, 406, 198, 138]},
            {"node_id": "end_10000557", "roi": [878, 381, 161, 167]},
        ],
    },
    # Add more cameras as needed
]