# File: config.py
# Configuration file for constants

ICS_URL = "http://192.168.1.100:7000/ics/taskOrder/addTask"  # Replace with actual URL
VALIDATE_PAIRS = [
    # ("start_10000989", "end_10000757"),
    # ("start_10001773", "end_10000758"),
    # ("start_10000063", "end_10000268"),
    # ("start_10000784", "end_10000266"),
    # ("start_10000747", "end_10000267"),
    # ("start_10000746", "end_10000274"),
    # ("start_10000745", "end_10000288"),
    # ("start_10000744", "end_10001797"),
    # ("start_10000743", "end_10001793"),
    # ("start_10000743", "end_10001796"),
    # ("start_10000037", "end_10000278"),
    # ("start_10000038", "end_10000280"),
    # ("start_10000039", "end_10000282"),
    # ("start_10000040", "end_10000286"),
    # ("start_10000041", "end_10000290"),
    # ("start_10000042", "end_10000284"),
    # ("start_10000059", "end_10000759"),
    # ("start_10000060", "end_10000760"),
    # ("start_10001759", "end_10000367"),
    # ("start_10001761", "end_10000364"),
    # ("start_10001762", "end_10000379"),
    # ("start_10001763", "end_10000396"),
    # ("start_10000062", "end_10001495"),
    # ("start_10000050", "end_10000761"),
    # ("start_10000051", "end_10000395"),
    # ("start_10000052", "end_10000394"),
    # ("start_10000053", "end_10000391"),
    # ("start_10000054", "end_10000376"),
    # ("start_10000055", "end_10000373"),
    # ("start_10000056", "end_10000370"),
    # ("start_10000057", "end_10000361")
    # ("start_10000060", "end_10000760"),
    # ("start_10000059", "end_10000761"),
    # ("start_10000759", "end_10001384"),
    ("start_10000060","end_10000760"),
    ("start_10000059","end_10000761"),
    ("start_10001050","end_10000759"),
    ("start_10001051","end_10000385"),
    ("start_10001052","end_10000382"),
    ("start_10001053","end_10000376"),
    ("start_10001054","end_10000373"),
    ("start_10001055","end_10000367"),
    ("start_10001056","end_10000394"),
    ("start_10001057","end_10000370")
    #("start_10000063","end_10000970")


]

# Simulate camera data (rtsp, rois, node_ids) - in real, import from camera_service.py
CAMERAS = [
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.130:554/Streaming/Channels/102", #test
    #     "rois": [
    #         {"node_id": "start_10000455", "roi": [444, 100, 93, 73]},
    #         {"node_id": "start_10000456", "roi": [181, 185, 87, 77]},
    #         ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.120:554/Streaming/Channels/102", #trái sang phải
    #     "rois": [
    #         {"node_id": "start_10000455", "roi": [192, 301, 142, 114]},
    #         {"node_id": "start_10000201", "roi": [336, 308, 147, 110]}
    #         ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.101:554/Streaming/Channels/102", #oke
    #     "rois": [
    #         {"node_id": "start_10000059", "roi": [157, 214, 86, 89]}
    #     ]
    # },
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.102:554/Streaming/Channels/102", #oke
        "rois": [
            {"node_id": "start_10000060", "roi": [163, 156, 79, 66]},
            {"node_id": "start_10000059", "roi": [468, 156, 76, 66]}
        ]
    },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.103:554/Streaming/Channels/102", #conf low
    #     "rois": [
    #         {"node_id": "start_10001763", "roi": [200, 217, 45, 90]},
    #         {"node_id": "start_10001762", "roi": [247, 213, 45, 103]},
    #         {"node_id": "start_10001761", "roi": [293, 218, 42, 101]},
    #         {"node_id": "start_10001759", "roi": [336, 222, 50, 99]}
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.104:554/Streaming/Channels/102", #conf low
    #     "rois": [
    #         {"node_id": "start_10000062", "roi": [268, 274, 80, 62]},
    #     ]
    # },
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.105:554/Streaming/Channels/102", # not recognize
        "rois": [
            {"node_id": "start_10001057", "roi": [175, 93, 79, 62]},
            {"node_id": "start_10001056", "roi": [171, 162, 84, 74]},
            {"node_id": "start_10001055", "roi": [164, 233, 89, 75]},
            {"node_id": "start_10001054", "roi": [160, 312, 89, 69]},
           # {"node_id": "start_10001058", "roi": [405, 92, 61, 109]}
        ]
    },
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.106:554/Streaming/Channels/102", #low conf + not recognize
        "rois": [
           # {"node_id": "start_10001059", "roi": [160, 156, 79, 71]},
            {"node_id": "start_10001050", "roi": [403, 77, 87, 65]},
            {"node_id": "start_10001051", "roi": [405, 158, 86, 71]},
            {"node_id": "start_10001052", "roi": [402, 245, 88, 72]},
            {"node_id": "start_10001053", "roi": [399, 326, 99, 72]}
        ]
    },
    # # {
    # #     "rtsp": "rtsp://admin:Thado12@@192.168.1.107:554/Streaming/Channels/102", #trái phải  #can't check
    # #     "rois": [
    # #         {"node_id": "start_10000037", "roi": [151, 249, 45, 114]},
    # #         {"node_id": "start_10000038", "roi": [220, 263, 40, 103]},
    # #         {"node_id": "start_10000039", "roi": [279, 272, 41, 104]},
    # #         {"node_id": "start_10000040", "roi": [330, 273, 45, 107]},
    # #         {"node_id": "start_10000041", "roi": [390, 273, 40, 120]},
    # #         {"node_id": "start_10000042", "roi": [448, 288, 42, 110]}
    # #     ]
    # # },
    # # # {
    # # #     "rtsp": "rtsp://admin:Thado12@@192.168.1.108:554/Streaming/Channels/102",
    # # #     "rois": [
    # # #     ]
    # # # },
    # # {
    # #     "rtsp": "rtsp://admin:Thado12@@192.168.1.109:554/Streaming/Channels/102", # trái phải
    # #     "rois": [
    # #         {"node_id": "end_10000043", "roi": [18, 248, 82, 77]},
    # #         {"node_id": "end_10000044", "roi": [99, 246, 100, 84]},
    # #         {"node_id": "end_10000045", "roi": [201, 243, 100, 91]},
    # #         {"node_id": "end_10000046", "roi": [307, 246, 94, 81]},
    # #         {"node_id": "end_10000047", "roi": [404, 251, 78, 72]}
    # #     ]
    # # },
    # # # {
    # # #     "rtsp": "rtsp://admin:Thado12@@192.168.1.138:554/Streaming/Channels/102", # bỏ qua sửa đổi layout
    # # #     "rois": [
    # # #     ]
    # # # },
    # # # {
    # # #     "rtsp": "rtsp://admin:Thado12@@192.168.1.139:554/Streaming/Channels/102", # ngã tư vào 
    # # #     "rois": [
    # # #         {"node_id": "end_10000558", "roi": [456, 197, 56, 98]},
    # # #         {"node_id": "end_10000558", "roi": [407, 193, 57, 110]},
    # # #         {"node_id": "end_10000558", "roi": [351, 192, 66, 114]},
    # # #         {"node_id": "end_10000558", "roi": [306, 193, 47, 110]},
    # # #         {"node_id": "end_10000558", "roi": [249, 192, 51, 109]},
    # # #         {"node_id": "end_10000558", "roi": [207, 190, 42, 111]}
    # # #     ]
    # # # },
    # # # {
    # # #     "rtsp": "rtsp://admin:Thado12@@192.168.1.140:554/Streaming/Channels/102",
    # # #     "rois": [
    # # #         {"node_id": "end_10000558", "roi": [264, 212, 86, 81]}
    # # #     ]
    # # # },

    # # ### Trả 
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.110:554/Streaming/Channels/102", # trái sang phải
        "rois": [
            {"node_id": "end_10000759", "roi": [89, 158, 108, 148]},
            {"node_id": "end_10000760", "roi": [217, 154, 136, 148]},
            {"node_id": "end_10000761", "roi": [356, 139, 111, 151]}
        ]
    },
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.111:554/Streaming/Channels/102",
        "rois": [
           # {"node_id": "end_10000396", "roi": [157, 198, 97, 56]},
           # {"node_id": "end_10000395", "roi": [257, 192, 108, 59]},
            {"node_id": "end_10000394", "roi": [367, 195, 111, 55]}
        ]
    },
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.112:554/Streaming/Channels/102",
        "rois": [
           # {"node_id": "end_10000391", "roi": [25, 234, 107, 85]},
           # {"node_id": "end_10000388", "roi": [145, 244, 108, 75]},
            {"node_id": "end_10000385", "roi": [258, 235, 121, 76]},
            {"node_id": "end_10000382", "roi": [376, 228, 124, 78]}
        ]
    },
    # # {
    # #     "rtsp": "rtsp://admin:Thado12@@192.168.1.113:554/Streaming/Channels/102", #qr code
    # #     "rois": [
    # #         {"node_id": "start_10001287", "roi": [268, 244, 110, 63]},
    # #     ]
    # # },
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.114:554/Streaming/Channels/102", #qr code
        "rois": [
           # {"node_id": "end_10000379", "roi": [68, 276, 92, 89]},
            {"node_id": "end_10000376", "roi": [163, 199, 122, 164]},
            {"node_id": "end_10000373", "roi": [306, 200, 115, 160]},
            {"node_id": "end_10000370", "roi": [426, 209, 95, 143]}
        ]
    },
    # # {
    # #     "rtsp": "rtsp://admin:Thado12@@192.168.1.115:554/Streaming/Channels/102", #qr_code
    # #     "rois": [
    # #         {"node_id": "start_10001290", "roi": [235, 211, 149, 107]},
    # #     ]
    # # },
    {
        "rtsp": "rtsp://admin:Thado12@@192.168.1.116:554/Streaming/Channels/102", #qr_code
        "rois": [
            {"node_id": "end_10000367", "roi": [193, 108, 63, 86]},
           # {"node_id": "end_10000364", "roi": [259, 106, 61, 92]},
           # {"node_id": "end_10000361", "roi": [313, 98, 69, 92]},
           # {"node_id": "start_10001293", "roi": [207, 352, 188, 125]}
        ]
    },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.117:554/Streaming/Channels/102",
    #     "rois": [
    #         {"node_id": "start_10001299", "roi": [92, 356, 120, 90]},
    #         {"node_id": "start_10001295", "roi": [468, 242, 140, 93]}
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.118:554/Streaming/Channels/102",
    #     "rois": [
    #         {"node_id": "end_10001498", "roi": [83, 148, 116, 81]},
    #         {"node_id": "end_10001495", "roi": [398, 163, 140, 88]}
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.119:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.120:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.121:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.122:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.123:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.124:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # # {
    # #     "rtsp": "rtsp://admin:Thado12@@192.168.1.125:554/Streaming/Channels/102",
    # #     "rois": [
    # #     ]
    # # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.126:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.127:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.128:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.129:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.171:554/Streaming/Channels/102",
    #     "rois": [
    #     ]
    # },
    # {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.194:554/Streaming/Channels/102",
    #     "rois": [
    #         {"node_id": "end_10001384", "roi": [291, 241, 79, 145]}
    #     ]
    # }
    {
    #     "rtsp": "rtsp://admin:Thado12@@192.168.1.140:554/Streaming/Channels/102", # test camera + flag
    #     "rois": [
    #         {"node_id": "start_10000063", "roi": [264, 219, 92, 79]},
    #         {"node_id": "end_10000970", "roi": [285, 320, 63, 57]}
    #     ]
    # }

]