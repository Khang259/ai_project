# File: config.py
# Configuration file for constants

ICS_URL = "http://192.168.1.100:7000/ics/taskOrder/addTask"  # Replace with actual URL
VALIDATE_PAIRS = [
    ("start_10000452", "end_10000202"),
    ("start_10000455", "end_10000558"),
    ("start_10000458", "end_10000559"),
    ("start_10000461", "end_10000560"),
    # Add more pairs as needed
]

# Simulate camera data (rtsp, rois, node_ids) - in real, import from camera_service.py
CAMERAS = [
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.130:554/Streaming/Channels/102",
        "rois": [
            {"node_id": "start_10000452", "roi": [310, 150, 133, 75]},
            # {"node_id": "start_10000453", "roi": [452, 145, 124, 80]},
            # {"node_id": "start_10000454", "roi": [605, 149, 154, 91]},
            # {"node_id": "start_10000455", "roi": [765, 152, 143, 91]},
            # {"node_id": "start_10000201", "roi": [917, 160, 130, 94]}
            ]
    },
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.143:554/Streaming/Channels/102",
        "rois": [
            {"node_id": "end_10000202", "roi": [324, 521, 117, 179]},
            # {"node_id": "end_10000558", "roi": [454, 527, 110, 177]},
            # {"node_id": "end_10000558", "roi": [573, 539, 104, 164]},
            # {"node_id": "end_10000558", "roi": [683, 538, 107, 168]},
            # {"node_id": "end_10000558", "roi": [790, 537, 102, 164]},
            # {"node_id": "end_10000558", "roi": [892, 535, 94, 158]},
            # {"node_id": "end_10000558", "roi": [990, 537, 77, 143]}
        ]
    }
]