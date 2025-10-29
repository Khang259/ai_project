import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCaption,
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

const CameraSettings = () => {
  const { t } = useTranslation();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { currAreaId, currAreaName } = useArea();

  const [selectedCamera, setSelectedCamera] = useState(null);
  // Load cameras from database on component mount
  useEffect(() => {
    loadCamerasFromDatabase();
  }, [currAreaId]);

  const loadCamerasFromDatabase = async () => {
    try {
      setLoading(true);
      const camerasData = await getCamerasByArea(currAreaId);
      // Ensure b_box is an array
      const formattedCameras = camerasData.map(cam => ({
        ...cam,
        b_box: cam.b_box ? (Array.isArray(cam.b_box) ? cam.b_box : [cam.b_box]) : [''],
        showPath: false
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
      b_box: camera.b_box || [],
    });
  };

  const handleSaveBBoxes = (newBBoxes) => {
    if (!selectedCamera) return;
  
    setCameras(prev =>
      prev.map(cam =>
        cam.id === selectedCamera.id
          ? { ...cam, b_box: newBBoxes } // Lưu dạng x1,y1,x2,y2
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
      b_box: [''],
      area: currAreaId,
      isNew: true
    }]);
  };

  const addBoundingBox = (cameraId) => {
    setCameras(cameras.map(cam =>
      cam.id === cameraId ? { ...cam, b_box: [...cam.b_box, ''] } : cam
    ));
  };

  const removeBoundingBox = (cameraId, bboxIndex) => {
    setCameras(cameras.map(cam => {
      if (cam.id === cameraId && cam.b_box.length > 1) {
        return {
          ...cam,
          b_box: cam.b_box.filter((_, index) => index !== bboxIndex)
        };
      }
      return cam;
    }));
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

  const updateCameraField = (cameraId, field, value, bboxIndex = null) => {
    setCameras(cameras.map(cam => {
      if (cam.id === cameraId) {
        if (field === 'b_box' && bboxIndex !== null) {
          const newBbox = [...cam.b_box];
          newBbox[bboxIndex] = value;
          return { ...cam, b_box: newBbox };
        }
        return { ...cam, [field]: value };
      }
      return cam;
    }));
  };

  const validateRTSPUrl = (url) => {
    const rtspRegex = /^rtsp:\/\/[\w\-\.]+(:\d+)?(\/.*)?$/i;
    return rtspRegex.test(url);
  };

  const validateBBox = (bbox) => {
    const bboxRegex = /^\d+,\d+,\d+,\d+$/;
    return bboxRegex.test(bbox);
  };

  const handleSaveCameras = async () => {
    try {
      setSaving(true);

      // Validate all cameras
      const invalidCameras = cameras.filter(camera =>
        (camera.camera_path && !validateRTSPUrl(camera.camera_path)) ||
        camera.b_box.some(bbox => bbox && !validateBBox(bbox))
      );

      if (invalidCameras.length > 0) {
        alert(t('settings.invalidRTSPUrlsOrBbox'));
        return;
      }

      // Process each camera
      for (const camera of cameras) {
        const cameraData = {
          camera_id: camera.camera_id,
          camera_name: camera.camera_name,
          camera_path: camera.camera_path,
          b_box: camera.b_box.filter(bbox => bbox !== ''), // Remove empty bboxes
          area: camera.area
        };

        if (camera.isNew) {
          if (camera.camera_name && camera.camera_path) {
            await addCamera(cameraData);
          }
        } else {
          if (camera.camera_name || camera.camera_path || camera.b_box.length > 0) {
            await updateCamera({ ...cameraData, id: camera.id });
          }
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
              Định dạng yêu cầu: rtsp://ip:port/path (ví dụ: rtsp://192.168.1.100:554/stream) | Bounding box: x,y,w,h (ví dụ: 0,0,100,100)
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {cameras.map((camera, index) => {
              const isValidRTSP = camera.camera_path ? validateRTSPUrl(camera.camera_path) : true;
              return (
                <div key={camera.id} className="flex gap-2 items-start p-3 rounded-lg "
                  style={{ 
                    backgroundColor:"rgba(139,92,246,0.25)",
                    border: "1px solid rgba(255,255,255,0.25)"
                  }}
                >
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor={`name-${camera.id}`} className="text-xs text-muted-foreground">
                          {t('settings.cameraName')}
                        </Label>
                        <div className="relative">
                          <Input
                            id={`name-${camera.id}`}
                            type="text"
                            placeholder={t('settings.cameraName')}
                            value={camera.camera_name}
                            onChange={(e) => updateCameraField(camera.id, 'camera_name', e.target.value)}
                            className="text-sm pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => selectCameraForViewing(camera)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                            title="Xem stream + vẽ bounding box"
                          >
                            <Video className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* RTSP url settings */}
                      <div>
                        <Label htmlFor={`path-${camera.id}`} className="text-xs text-muted-foreground">
                          {t('settings.rtspUrl')}
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

                      {/* BBox settings */}
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t('settings.bBoxSettings')}
                        </Label>
                        {camera.b_box.map((bbox, bboxIndex) => (
                          <div key={`${camera.id}-bbox-${bboxIndex}`} className="flex items-center gap-2 mb-2">
                            <Input
                              id={`bbox-${camera.id}-${bboxIndex}`}
                              type="text"
                              placeholder="0,0,0,0"
                              value={bbox}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*,\d*,\d*,\d*$/.test(value)) {
                                  updateCameraField(camera.id, 'b_box', value, bboxIndex);
                                }
                              }}
                              className={`font-mono text-sm ${
                                bbox && !/^\d+,\d+,\d+,\d+$/.test(bbox)
                                  ? 'border-red-500 focus:border-red-500'
                                  : ''
                              }`}
                            />
                            {camera.b_box.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBoundingBox(camera.id, bboxIndex)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {camera.b_box.some(bbox => bbox && !validateBBox(bbox)) && (
                          <p className="text-xs text-red-500 mt-1">
                            {t('settings.invalidBBoxFormat')}
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
            className="w-full border-dashed border-2 hover:bg-red-50 bg-transparent"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('settings.addCamera')}
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
      {/* Camera Status & Information - Bảng */}
      <Card className="border-2 glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
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
                                isConnected ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                            <span
                              className={`text-xs font-medium ${
                                isConnected ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {isConnected ? t('settings.active') : t('settings.inactive')}
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

      {/* Nhận props từ CameraViewer */}
      {selectedCamera && (
        <CameraViewerModal
          cameraData={selectedCamera}
          onClose={() => setSelectedCamera(null)}
          onSaveBBoxes={handleSaveBBoxes}
        />
      )}
    </div>
  );
};

export default CameraSettings;