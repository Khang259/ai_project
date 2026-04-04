// services/fakeWebSocket.js   (chỉ bật khi đang dev)
let fakeInterval = null;

export function startFakeWebSocket(onMessage) {
    if (fakeInterval) return; // tránh chạy nhiều lần

    //console.log("Fake WebSocket STARTED - sẽ đẩy alarm mỗi 8-15s");

    fakeInterval = setInterval(() => {
        const fakeAlarms = [
            {
                alarm_code: "RobotBlockedAlarm_0",
                device_name: "DJ62271AAK00001",
                alarm_grade: 10,
                alarm_status: 4,
                area_id: 1,
                alarm_source: "rcs",
                status: null,
                alarm_date: new Date().toISOString(),
                group_id: "1",
                route_name: "KD",
            },
            {
                alarm_code: "LowBatteryAlarm",
                device_name: "DJ62271AAK00023",
                alarm_grade: 6,
                alarm_status: 1,
                area_id: 2,
                alarm_source: "robot",
                alarm_date: new Date().toISOString(),
                group_id: "2",
                route_name: "HB",
            },
            {
                alarm_code: "EmergencyStopPressed",
                device_name: "DJ62271AAK99999",
                alarm_grade: 10,
                alarm_status: 4,
                area_id: 1,
                alarm_source: "manual",
                alarm_date: new Date().toISOString(),
                group_id: "1",
                route_name: "TEST",
            },
        ];

        // Random 1 alarm mỗi lần
        const randomAlarm = fakeAlarms[Math.floor(Math.random() * fakeAlarms.length)];

        // Thêm chút ngẫu nhiên cho thời gian & device
        randomAlarm.alarm_date = new Date(Date.now() - Math.random() * 60000).toISOString();
        randomAlarm.device_name = `DJ62271AAK${String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0")}`;

        // Giả lập event từ server
        const fakeEvent = {
            data: JSON.stringify(randomAlarm), // backend thật cũng gửi JSON string
        };

        onMessage(fakeEvent); // đẩy vào callback
        //console.log("Fake alarm pushed:", randomAlarm.alarm_code, randomAlarm.device_name);
    }, 8000 + Math.random() * 7000); // 8-15 giây/lần
}

export function stopFakeWebSocket() {
    if (fakeInterval) {
        clearInterval(fakeInterval);
        fakeInterval = null;
        //console.log("Fake WebSocket STOPPED");
    }
}