import React, { useState } from 'react';
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
import { deleteCamera } from '@/services/camera-settings';
import { useArea } from '@/contexts/AreaContext';
import CameraViewerModal from '../Overview/map/camera/CameraViewerModal';
import { useTranslation } from 'react-i18next';
import { useLoadCameraFromDatabase } from '@/hooks/Setting/Camera/useLoadCameraFromDatabase';
import { useHandleSaveCameras } from '@/hooks/Setting/Camera/usehandleSaveCameras';

const CameraSettings = () => {
  const { t } = useTranslation();
  const { currAreaId, currAreaName } = useArea();
  const { cameras, setCameras, loading, refetch: loadCamerasFromDatabase } = useLoadCameraFromDatabase(currAreaId, t);
  const { handleSaveCameras, saving, validateRTSPUrl, validateROI } = useHandleSaveCameras(cameras, loadCamerasFromDatabase, t);
  const [ healthCheckStatus, setHealthCheckStatus ] = useState([]);
  const [ selectedCamera, setSelectedCamera ] = useState(null);
  const [loadingStream, setLoadingStream] = useState(false);

  // useEffect(() => {
  //   const fetchHealthCheckStatus = async () => {
  //     const status = await healthCheckCamera();
  //     setHealthCheckStatus(status);
  //     console.log('Health check status:', status);
  //   };
  //   fetchHealthCheckStatus();
  // }, []);

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
    const isNewCamera = cameraId.startsWith('temp_');
    if (cameras.length <= 1 && !isNewCamera) return;

    try {
      if (isNewCamera) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('settings.loadingCamerasForArea')}: {currAreaName || t('settings.undetermined')}</span>
      </div>
    );
  }

  const thClass = "py-2 px-2 lg:py-3 lg:px-3 text-sm lg:text-base";
  const tdClass = "py-2 px-2 lg:py-3 lg:px-3 text-sm lg:text-base";

  return (
    <div className="space-y-6 min-w-0">
      <Card className="border-2 glass min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl lg:text-2xl text-white">
            <Video className="h-6 w-6 lg:h-7 lg:w-7" />
            {t('settings.cameraManagement')}
          </CardTitle>
          <CardDescription>
            <span className="text-sm lg:text-base text-white/90">
              {t('settings.cameraRequestFormat')}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2 min-w-0">
            {cameras.map((camera) => {
              const isValidRTSP = camera.camera_path ? validateRTSPUrl(camera.camera_path) : true;
              return (
                <div
                  key={camera.id}
                  className="flex gap-3 items-start p-4 rounded-lg min-w-0"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.25)"
                  }}
                >
                  <div className="flex-1 space-y-4 min-w-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <Label className="text-sm lg:text-base text-black font-medium">{t('settings.cameraName')}</Label>
                        <div className="relative mt-1">
                          <Input
                            placeholder={t('settings.cameraName')}
                            value={camera.camera_name || ''}
                            onChange={(e) => updateCameraField(camera.id, 'camera_name', e.target.value)}
                            className="text-sm lg:text-base pr-10 h-10 lg:h-11 border border-gray-500 rounded-md text-black"
                          />
                          <button
                            type="button"
                            onClick={() => selectCameraForViewing(camera)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-blue-600 p-1.5 rounded"
                            title={t('settings.drawRoiRegion')}
                          >
                            <Video className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm lg:text-base text-black font-medium">{t('settings.rtspUrl')}</Label>
                        <Input
                          placeholder="rtsp://127.0.0.1:554/stream"
                          value={camera.camera_path || ''}
                          onChange={(e) => updateCameraField(camera.id, 'camera_path', e.target.value)}
                          className={`font-mono text-sm lg:text-base h-10 lg:h-11 border border-gray-500 rounded-md text-black min-w-0 ${camera.camera_path && !isValidRTSP ? 'border-red-500' : ''}`}
                        />
                        {camera.camera_path && !isValidRTSP && (
                          <p className="text-sm text-red-500 mt-1">{t('settings.urlMustBeRtsp')}</p>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <Label className="text-sm lg:text-base text-black font-medium">{t('settings.roiRegion')}</Label>
                      {camera.roi && camera.roi.length > 0 ? (
                        <div className="mt-2 border rounded overflow-hidden min-w-0 overflow-x-auto">
                          <Table className="text-sm lg:text-base">
                            <TableHeader>
                              <TableRow>
                                <TableHead className={thClass}>ROI</TableHead>
                                <TableHead className={`${thClass} text-center`}>x</TableHead>
                                <TableHead className={`${thClass} text-center`}>y</TableHead>
                                <TableHead className={`${thClass} text-center`}>w</TableHead>
                                <TableHead className={`${thClass} text-center`}>h</TableHead>
                                <TableHead className={`${thClass} text-center`}>NodeId</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {camera.roi.map((roi, i) => (
                                <TableRow key={i} className="text-black">
                                  <TableCell className={`${tdClass} font-medium`}>{roi.label}</TableCell>
                                  <TableCell className={`${tdClass} text-center`}>{roi.x}</TableCell>
                                  <TableCell className={`${tdClass} text-center`}>{roi.y}</TableCell>
                                  <TableCell className={`${tdClass} text-center`}>{roi.width}</TableCell>
                                  <TableCell className={`${tdClass} text-center`}>{roi.height}</TableCell>
                                  <TableCell className={`${tdClass} text-center`}>{roi.task_path}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1 italic">{t('settings.noRoiYet')}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCamera(camera.id)}
                    disabled={cameras.length === 1 && !camera.id.startsWith('temp_')}
                    className="mt-6 h-10 w-10 lg:h-11 lg:w-11 text-red-600 hover:text-red-800 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            onClick={addNewCamera}
            className="w-full border-dashed border-2 text-base lg:text-lg h-11 lg:h-12"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('settings.addCamera')}
          </Button>

          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={handleSaveCameras}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base lg:text-lg h-11 lg:h-12"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {t('settings.savingCameras')}
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 mr-2" />
                  {t('settings.saveCameraConfiguration')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 glass min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl lg:text-2xl text-white">
            <Video className="h-6 w-6 lg:h-7 lg:w-7" />
            {t('settings.cameraInformationFromDatabase')}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {cameras.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-base lg:text-lg">
              {t('settings.noCamerasConfigured')}
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden min-w-0 overflow-x-auto">
              <Table className="text-base lg:text-lg w-full min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className={`w-14 text-center text-white ${thClass}`}>ID</TableHead>
                    <TableHead className={`text-white ${thClass}`}>{t('settings.cameraName')}</TableHead>
                    <TableHead className={`text-white ${thClass}`}>{t('settings.rtspUrl')}</TableHead>
                    <TableHead className={`text-white ${thClass}`}>{t('settings.area')}</TableHead>
                    <TableHead className={`text-white ${thClass}`}>{t('settings.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cameras.map((camera, index) => {
                    const isConnected = !!camera.camera_path && validateRTSPUrl(camera.camera_path);
                    return (
                      <TableRow key={camera.id}>
                        <TableCell className={`text-center font-medium ${tdClass}`}>{index + 1}</TableCell>
                        <TableCell className={`font-medium ${tdClass}`}>
                          {camera.camera_name || `${t('settings.camera')} ${index + 1}`}
                        </TableCell>
                        <TableCell className={tdClass}>
                          <code className="text-sm lg:text-base font-mono px-1 py-0.5 rounded break-all">
                            {camera.camera_path || (
                              <span className="text-muted-foreground italic">{t('settings.notConfigured')}</span>
                            )}
                          </code>
                        </TableCell>
                        <TableCell className={tdClass}>{camera.area}</TableCell>
                        <TableCell className={tdClass}>
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-3 h-3 rounded-full ${healthCheckStatus.find(h => h.camera_id === camera.camera_id)?.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}
                            />
                            <span className={`text-sm font-medium ${healthCheckStatus.find(h => h.camera_id === camera.camera_id)?.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
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