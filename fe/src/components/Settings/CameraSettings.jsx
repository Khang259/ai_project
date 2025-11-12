import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus, Trash2, Video, Loader2 } from 'lucide-react';
import { getCamerasByArea, addCamera, updateCamera, deleteCamera } from '@/services/camera-settings';
import { useArea } from '@/contexts/AreaContext';
import CameraViewerModal from '../Overview/map/camera/CameraViewerModal';
import { useTranslation } from 'react-i18next';
import { healthCheckCamera } from '@/services/health-check-camera';

const CameraSettings = () => {
  const { t } = useTranslation();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { currAreaId, currAreaName } = useArea();
  const [healthCheckStatus, setHealthCheckStatus] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);

  useEffect(() => {
    loadCamerasFromDatabase();
  }, [currAreaId]);

  useEffect(() => {
    const fetchHealthCheckStatus = async () => {
      const status = await healthCheckCamera();
      setHealthCheckStatus(status);
      console.log('Health check status:', status);
    };
    fetchHealthCheckStatus();
  }, []);

  const loadCamerasFromDatabase = async () => {
    try {
      setLoading(true);
      const camerasData = await getCamerasByArea(currAreaId);
      const formattedCameras = camerasData.map(cam => ({
        ...cam,
        roi: cam.roi && Array.isArray(cam.roi) && cam.roi.length > 0
          ? cam.roi.map((r, i) => {
              // Hỗ trợ string cũ: "100,200,300,400"
              if (typeof r === 'string') {
                const [x, y, w, h] = r.split(',').map(Number);
                if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
                  return { x, y, width: w, height: h, label: `ROI ${i + 1}` };
                }
              }
              // Hỗ trợ object: { x, y, w, h } hoặc { x, y, width, height }
              return {
                x: r.x || 0,
                y: r.y || 0,
                width: r.width || r.w || 0,
                height: r.height || r.h || 0,
                label: r.label || `ROI ${i + 1}`
              };
            }).filter(roi => roi.width > 0 && roi.height > 0)
          : [] // Không để mảng rỗng có phần tử lỗi
      }));
      setCameras(formattedCameras);
    } catch (error) {
      console.error('Error loading cameras:', error);
      alert(t('settings.errorLoadingCameras'));
    } finally {
      setLoading(false);
    }
  };

  const selectCameraForViewing = (camera) => {
    if (!camera.camera_path) {
      alert(t('settings.noRtspPath'));
      return;
    }

    setSelectedCamera({
      id: camera.id,
      cameraName: camera.camera_name || `Camera ${camera.camera_id}`,
      cameraPath: camera.camera_path,
      roi: camera.roi || []
    });
  };

  const handleSaveROIs = (newROIs) => {
    if (!selectedCamera) return;

    setCameras(prev =>
      prev.map(cam =>
        cam.id === selectedCamera.id
          ? { ...cam, roi: newROIs }
          : cam
      )
    );

    setSelectedCamera(null);
  };

  const addNewCamera = () => {
    setCameras([...cameras, {
      id: `temp_${Date.now()}`,
      camera_id: Date.now(),
      camera_name: '',
      camera_path: '',
      roi: [],
      area: currAreaId,
      isNew: true
    }]);
  };

  const removeCamera = async (cameraId) => {
    if (cameras.length <= 1) return;

    try {
      if (cameraId.startsWith('temp_')) {
        setCameras(cameras.filter(cam => cam.id !== cameraId));
        return;
      }

      await deleteCamera(cameraId);
      setCameras(cameras.filter(cam => cam.id !== cameraId));
      alert(t('settings.cameraDeletedSuccessfully'));
    } catch (error) {
      console.error('Error deleting camera:', error);
      alert(t('settings.errorDeletingCamera'));
    }
  };

  const updateCameraField = (cameraId, field, value) => {
    setCameras(cameras.map(cam => {
      if (cam.id === cameraId) {
        return { ...cam, [field]: value };
      }
      return cam;
    }));
  };

  const validateRTSPUrl = (url) => {
    const rtspRegex = /^rtsp:\/\/[\w\-\.]+(:\d+)?(\/.*)?$/i;
    return rtspRegex.test(url);
  };

  const validateROI = (roi) => {
    return (
      roi &&
      typeof roi === 'object' &&
      typeof roi.x === 'number' && roi.x >= 0 &&
      typeof roi.y === 'number' && roi.y >= 0 &&
      typeof roi.width === 'number' && roi.width > 0 &&
      typeof roi.height === 'number' && roi.height > 0
    );
  };

  const handleSaveCameras = async () => {
    try {
      setSaving(true);

      const invalidCameras = cameras.filter(camera =>
        (camera.camera_path && !validateRTSPUrl(camera.camera_path)) ||
        camera.roi.some(roi => !validateROI(roi))
      );

      if (invalidCameras.length > 0) {
        alert(t('settings.invalidRTSPUrlsOrBbox'));
        return;
      }

      for (const camera of cameras) {
        const cameraData = {
          camera_id: camera.camera_id,
          camera_name: camera.camera_name,
          camera_path: camera.camera_path,
          roi: camera.roi.filter(validateROI), // Chỉ gửi ROI hợp lệ
          area: camera.area
        };

        if (camera.isNew) {
          if (camera.camera_name && camera.camera_path) {
            await addCamera(cameraData);
          }
        } else {
          await updateCamera({ ...cameraData, id: camera.id });
        }
      }

      await loadCamerasFromDatabase();
      alert(t('settings.cameraConfigurationSavedSuccessfully'));
    } catch (error) {
      console.error('Error saving cameras:', error);
      alert(t('settings.errorSavingCameraConfiguration'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('settings.loadingCamerasForArea')}: {currAreaName || t('settings.undetermined')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Camera Configuration */}
      <Card className="border-2 glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {t('settings.cameraManagement')}
          </CardTitle>
          <CardDescription>
            <span className="text-xs text-white">
              Định dạng yêu cầu: rtsp://ip:port/path | Vùng ROI được vẽ trực tiếp trên stream
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {cameras.map((camera) => {
              const isValidRTSP = camera.camera_path ? validateRTSPUrl(camera.camera_path) : true;
              return (
                <div
                  key={camera.id}
                  className="flex gap-3 items-start p-4 rounded-lg"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.25)"
                  }}
                >
                  <div className="flex-1 space-y-4">
                    {/* Tên & RTSP */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-black">{t('settings.cameraName')}</Label>
                        <div className="relative">
                          <Input
                            placeholder={t('settings.cameraName')}
                            value={camera.camera_name || ''}
                            onChange={(e) => updateCameraField(camera.id, 'camera_name', e.target.value)}
                            className="text-sm pr-10 border border-gray-500 rounded-md text-black"
                          />
                          <button
                            type="button"
                            onClick={() => selectCameraForViewing(camera)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-blue-600 p-1 rounded"
                            title="Vẽ vùng ROI"
                          >
                            <Video className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-black">{t('settings.rtspUrl')}</Label>
                        <Input
                          placeholder="rtsp://192.168.1.100:554/stream"
                          value={camera.camera_path || ''}
                          onChange={(e) => updateCameraField(camera.id, 'camera_path', e.target.value)}
                          className={`font-mono text-sm border border-gray-500 rounded-md text-black ${
                            camera.camera_path && !isValidRTSP ? 'border-red-500' : ''
                          }`}
                        />
                        {camera.camera_path && !isValidRTSP && (
                          <p className="text-xs text-red-500 mt-1">
                            URL phải có định dạng RTSP
                          </p>
                        )}
                      </div>
                    </div>

                    {/* BẢNG ROI*/}
                    <div>
                      <Label className="text-xs text-black">Vùng ROI</Label>
                      {camera.roi && camera.roi.length > 0 ? (
                        <div className="mt-2 border rounded overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">ROI</TableHead>
                                <TableHead className="text-xs text-center">x</TableHead>
                                <TableHead className="text-xs text-center">y</TableHead>
                                <TableHead className="text-xs text-center">w</TableHead>
                                <TableHead className="text-xs text-center">h</TableHead>
                                <TableHead className="text-xs text-center">TaskPath</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {camera.roi.map((roi, i) => (
                                <TableRow key={i} className="text-xs text-black">
                                  <TableCell className="font-medium">{roi.label}</TableCell>
                                  <TableCell className="text-center">{roi.x}</TableCell>
                                  <TableCell className="text-center">{roi.y}</TableCell>
                                  <TableCell className="text-center">{roi.width}</TableCell>
                                  <TableCell className="text-center">{roi.height}</TableCell>
                                  <TableCell className="text-center">{roi.task_path}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Chưa có vùng ROI. Nhấn biểu tượng video để vẽ.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Xóa camera */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCamera(camera.id)}
                    disabled={cameras.length === 1}
                    className="mt-6 text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Thêm camera */}
          <Button
            onClick={addNewCamera}
            // variant="outline"
            className="w-full border-dashed border-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('settings.addCamera')}
          </Button>

          {/* Lưu */}
          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={handleSaveCameras}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('settings.savingCameras')}
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  {t('settings.saveCameraConfiguration')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Camera Status & Information */}
      <Card className="border-2 glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-white" />
            {t('settings.cameraInformationFromDatabase')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cameras.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('settings.noCamerasConfigured')}
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-center text-white">ID</TableHead>
                    <TableHead className="text-white">{t('settings.cameraName')}</TableHead>
                    <TableHead className="text-white">{t('settings.rtspUrl')}</TableHead>
                    <TableHead className="text-white">{t('settings.area')}</TableHead>
                    <TableHead className="text-white">{t('settings.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cameras.map((camera, index) => {
                    const isConnected = !!camera.camera_path && validateRTSPUrl(camera.camera_path);
                    return (
                      <TableRow key={camera.id} className="text-sm">
                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {camera.camera_name || `${t('settings.camera')} ${index + 1}`}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono px-1 py-0.5 rounded">
                            {camera.camera_path || (
                              <span className="text-muted-foreground italic">
                                {t('settings.notConfigured')}
                              </span>
                            )}
                          </code>
                        </TableCell>
                        <TableCell>{camera.area}</TableCell>

                        {/* Check online status */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${
                                healthCheckStatus.find(h => h.camera_id === camera.camera_id)?.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                            <span
                              className={`text-xs font-medium ${
                                healthCheckStatus.find(h => h.camera_id === camera.camera_id)?.status === 'online' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {healthCheckStatus.find(h => h.camera_id === camera.camera_id)?.status === 'online' ? t('settings.active') : t('settings.inactive')}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal vẽ ROI */}
      {selectedCamera && (
        <CameraViewerModal
          cameraData={selectedCamera}
          onClose={() => setSelectedCamera(null)}
          onSaveROIs={handleSaveROIs}
        />
      )}
    </div>
  );
};

export default CameraSettings;