import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus, Trash2, Video } from 'lucide-react';

const CameraSettings = () => {
  const [cameraIPs, setCameraIPs] = useState([{ id: "1", address: "" }]);

  // Load saved camera configurations on component mount
  useEffect(() => {
    const loadCameraConfigurations = () => {
      const savedCameraConfig = localStorage.getItem("cameraConfig");
      if (savedCameraConfig) {
        const cameraData = JSON.parse(savedCameraConfig);
        if (cameraData.cameras) setCameraIPs(cameraData.cameras);
      }
    };

    loadCameraConfigurations();
  }, []);

  const addCameraIP = () => {
    setCameraIPs([...cameraIPs, { id: Date.now().toString(), address: "" }]);
  };

  const removeCameraIP = (id) => {
    if (cameraIPs.length > 1) {
      setCameraIPs(cameraIPs.filter((cam) => cam.id !== id));
    }
  };

  const updateCameraIP = (id, address) => {
    setCameraIPs(cameraIPs.map((cam) => (cam.id === id ? { ...cam, address } : cam)));
  };

  const validateRTSPUrl = (url) => {
    // Kiểm tra định dạng RTSP URL
    const rtspRegex = /^rtsp:\/\/[\w\-\.]+(:\d+)?(\/.*)?$/i;
    return rtspRegex.test(url);
  };

  const handleSaveCameraConfig = () => {
    // Kiểm tra validation trước khi lưu
    const invalidCameras = cameraIPs.filter(camera => 
      camera.address && !validateRTSPUrl(camera.address)
    );
    
    if (invalidCameras.length > 0) {
      alert(`Có ${invalidCameras.length} camera có URL không hợp lệ. Vui lòng kiểm tra lại định dạng RTSP.`);
      return;
    }

    const cameraConfig = {
      cameras: cameraIPs,
    };
    console.log("Camera configuration saved:", cameraConfig);
    localStorage.setItem("cameraConfig", JSON.stringify(cameraConfig));
    alert("Cấu hình camera đã được lưu!");
  };

  return (
    <div className="space-y-6">
      {/* Camera IP Configuration */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Địa Chỉ IP Camera
          </CardTitle>
          <CardDescription>
            Thêm và quản lý địa chỉ IP của các camera
            <br />
            <span className="text-xs text-muted-foreground">
              Định dạng yêu cầu: rtsp://ip:port/path (ví dụ: rtsp://192.168.1.100:554/stream)
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {cameraIPs.map((camera, index) => {
              const isValidRTSP = camera.address ? validateRTSPUrl(camera.address) : true;
              return (
                <div key={camera.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`camera-${camera.id}`} className="text-xs text-muted-foreground">
                      Camera {index + 1}
                    </Label>
                    <Input
                      id={`camera-${camera.id}`}
                      type="text"
                      placeholder="rtsp://192.168.1.100:554/stream"
                      value={camera.address}
                      onChange={(e) => updateCameraIP(camera.id, e.target.value)}
                      className={`font-mono text-sm ${
                        camera.address && !isValidRTSP 
                          ? 'border-red-500 focus:border-red-500' 
                          : ''
                      }`}
                    />
                    {camera.address && !isValidRTSP && (
                      <p className="text-xs text-red-500">
                         URL phải có định dạng RTSP (ví dụ: rtsp://192.168.1.100:554/stream)
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCameraIP(camera.id)}
                    disabled={cameraIPs.length === 1}
                    className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            onClick={addCameraIP}
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5 bg-transparent"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm Camera
          </Button>

          {/* Nút lưu riêng cho Camera Configuration */}
          <div className="mt-4 pt-4 border-t">
            <Button 
              onClick={handleSaveCameraConfig} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Video className="h-4 w-4 mr-2" />
              Lưu Cấu Hình Camera
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Camera Status & Information */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Thông Tin Camera
          </CardTitle>
          <CardDescription>
            Xem trạng thái và thông tin chi tiết của các camera
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cameraIPs.map((camera, index) => (
              <div key={camera.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div>
                    <p className="font-medium">Camera {index + 1}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {camera.address || 'Chưa cấu hình'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Trạng thái</p>
                  <p className="text-sm font-medium text-green-600">Hoạt động</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraSettings;
