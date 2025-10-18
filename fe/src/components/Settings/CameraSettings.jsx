import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus, Trash2, Video, Loader2 } from 'lucide-react';
import { getCamerasByArea, addCamera, updateCamera, deleteCamera } from '@/services/camera-settings';
import { useArea } from '@/contexts/AreaContext';

const CameraSettings = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { currAreaId, currAreaName } = useArea();

  // Load cameras from database on component mount
  useEffect(() => {
    loadCamerasFromDatabase();
  }, [currAreaId]);

  const loadCamerasFromDatabase = async () => {
    try {
      setLoading(true);
      const camerasData = await getCamerasByArea(currAreaId);
      setCameras(camerasData);
    } catch (error) {
      console.error('Error loading cameras:', error);
      alert('Lỗi khi tải danh sách camera từ database');
    } finally {
      setLoading(false);
    }
  };

  const addNewCamera = () => {
    setCameras([...cameras, { 
      id: `temp_${Date.now()}`,
      camera_id: Date.now(), 
      camera_name: '', 
      camera_path: '', 
      area: currAreaId,
      isNew: true 
    }]);
  };

  const removeCamera = async (cameraId) => {
    if (cameras.length <= 1) return;
    
    try {
      // Nếu là camera mới (chưa lưu vào DB), chỉ xóa khỏi state
      if (cameraId.startsWith('temp_')) {
        setCameras(cameras.filter(cam => cam.id !== cameraId));
        return;
      }

      // Nếu là camera đã lưu trong DB, gọi API xóa
      await deleteCamera(cameraId);
      setCameras(cameras.filter(cam => cam.id !== cameraId));
      alert('Camera đã được xóa thành công!');
    } catch (error) {
      console.error('Error deleting camera:', error);
      alert('Lỗi khi xóa camera');
    }
  };

  const updateCameraField = (cameraId, field, value) => {
    setCameras(cameras.map(cam => 
      cam.id === cameraId ? { ...cam, [field]: value } : cam
    ));
  };

  const validateRTSPUrl = (url) => {
    const rtspRegex = /^rtsp:\/\/[\w\-\.]+(:\d+)?(\/.*)?$/i;
    return rtspRegex.test(url);
  };

  const handleSaveCameras = async () => {
    try {
      setSaving(true);
      
      // Validate all cameras
      const invalidCameras = cameras.filter(camera => 
        camera.camera_path && !validateRTSPUrl(camera.camera_path)
      );
      
      if (invalidCameras.length > 0) {
        alert(`Có ${invalidCameras.length} camera có URL không hợp lệ. Vui lòng kiểm tra lại định dạng RTSP.`);
        return;
      }

      // Process each camera
      for (const camera of cameras) {
        if (camera.isNew) {
          // Thêm camera mới
          if (camera.camera_name && camera.camera_path) {
            await addCamera({
              camera_id: camera.camera_id,
              camera_name: camera.camera_name,
              camera_path: camera.camera_path,
              area: camera.area
            });
          }
        } else {
          // Cập nhật camera hiện có
          if (camera.camera_name || camera.camera_path) {
            await updateCamera({
              id: camera.id,
              camera_name: camera.camera_name,
              camera_path: camera.camera_path,
              area: camera.area
            });
          }
        }
      }

      // Reload cameras from database
      await loadCamerasFromDatabase();
      alert('Cấu hình camera đã được lưu thành công!');
    } catch (error) {
      console.error('Error saving cameras:', error);
      alert('Lỗi khi lưu cấu hình camera');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Đang tải danh sách camera cho khu vực: {currAreaName || 'Không xác định'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Camera Configuration */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Quản Lý Camera
          </CardTitle>
          <CardDescription>
            Thêm và quản lý camera từ database
            <br />
            <span className="text-xs text-muted-foreground">
              Định dạng yêu cầu: rtsp://ip:port/path (ví dụ: rtsp://192.168.1.100:554/stream)
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {cameras.map((camera, index) => {
              const isValidRTSP = camera.camera_path ? validateRTSPUrl(camera.camera_path) : true;
              return (
                <div key={camera.id} className="flex gap-2 items-start p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`name-${camera.id}`} className="text-xs text-muted-foreground">
                          Tên Camera
                        </Label>
                        <Input
                          id={`name-${camera.id}`}
                          type="text"
                          placeholder="Camera 1"
                          value={camera.camera_name}
                          onChange={(e) => updateCameraField(camera.id, 'camera_name', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                      <Label htmlFor={`path-${camera.id}`} className="text-xs text-muted-foreground">
                        Đường Dẫn RTSP
                      </Label>
                      <Input
                        id={`path-${camera.id}`}
                        type="text"
                        placeholder="rtsp://192.168.1.100:554/stream"
                        value={camera.camera_path}
                        onChange={(e) => updateCameraField(camera.id, 'camera_path', e.target.value)}
                        className={`font-mono text-sm ${
                          camera.camera_path && !isValidRTSP 
                            ? 'border-red-500 focus:border-red-500' 
                            : ''
                        }`}
                      />
                      {camera.camera_path && !isValidRTSP && (
                        <p className="text-xs text-red-500 mt-1">
                          URL phải có định dạng RTSP (ví dụ: rtsp://192.168.1.100:554/stream)
                        </p>
                      )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCamera(camera.id)}
                    disabled={cameras.length === 1}
                    className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            onClick={addNewCamera}
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5 bg-transparent"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm Camera
          </Button>

          <div className="mt-4 pt-4 border-t">
            <Button 
              onClick={handleSaveCameras} 
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Lưu Cấu Hình Camera
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Camera Status & Information */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Thông Tin Camera Từ Database
          </CardTitle>
          <CardDescription>
            Xem trạng thái và thông tin chi tiết của các camera từ database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cameras.map((camera, index) => (
              <div key={camera.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div>
                    <p className="font-medium">{camera.camera_name || `Camera ${index + 1}`}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {camera.camera_path || 'Chưa cấu hình'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Khu vực: {camera.area} | ID: {camera.id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Trạng thái</p>
                  <p className="text-sm font-medium text-green-600">Hoạt động</p>
                  <p className="text-xs text-muted-foreground">
                    {camera.created_at ? new Date(camera.created_at).toLocaleDateString('vi-VN') : 'Mới'}
                  </p>
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