import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { getStreamCamera } from '@/services/infocamera-dashboard';
import StreamWithBoundingBox from './StreamWithBoundingBox';

const CameraViewerModal = ({ cameraData, onClose, onSaveROIs }) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ROIs, setROIs] = useState(cameraData.roi || []);

  useEffect(() => {
    const fetchStream = async () => {
      if (!cameraData?.cameraPath) {
        setError('Không có đường dẫn camera');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const url = await getStreamCamera(cameraData.cameraPath);
        setStreamUrl(url || '');
      } catch (err) {
        console.error('getStreamCamera error:', err);
        setError('Không thể tải stream');
      } finally {
        setLoading(false);
      }
    };

    fetchStream();
  }, [cameraData]);

  const handleSave = () => {
    // Format là x,y,w,h để đồng bộ backend
    const convertedROIs = ROIs.map(roi => {
      const { x, y, width, height, label } = roi;
      return { x, y, width, height, label };
    });

    onSaveROIs?.(convertedROIs);
    onClose();
  };

  const handleDeleteZone = (index) => {
    setROIs(prev => prev.filter((_, i) => i !== index));
  };

  if (!cameraData) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">
            {cameraData.cameraName} - Vẽ vùng
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              <Save className="h-4 w-4" /> Lưu
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition"
            >
              <X className="h-5 w-5 text-black" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Stream + Canvas */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="ml-2 text-gray-600">Đang tải stream...</p>
            </div>
          )}
          {error && (
            <div className="text-red-600 text-center py-8">
              Lỗi: {error}
              <p className="text-sm mt-2 text-gray-500">RTSP: {cameraData.cameraPath}</p>
            </div>
          )}
          {streamUrl && !loading && (
            <StreamWithBoundingBox
              streamUrl={streamUrl}
              initialROIs={ROIs}
              onROIsChange={setROIs}
              cameraName={cameraData.cameraName}
            />
          )}

          {/* Bảng tọa độ */}
          <div className="border rounded-lg overflow-hidden text-black">
            <div className="bg-gray-50 px-4 py-2 font-medium text-sm border-b">
              Tọa độ các vùng (x, y, w, h)
            </div>
            {ROIs.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Chưa có vùng nào. Kéo chuột trên ảnh để vẽ.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">ROI</th>
                    <th className="px-3 py-2 text-center">x1</th>
                    <th className="px-3 py-2 text-center">y1</th>
                    <th className="px-3 py-2 text-center">w</th>
                    <th className="px-3 py-2 text-center">h</th>
                    <th className="px-3 py-2 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {ROIs.map((roi, i) => {
                    const { x, y, width, height } = roi;
                    return (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">ROI {i + 1}</td>
                        <td className="px-3 py-2 text-center">{Math.round(x)}</td>
                        <td className="px-3 py-2 text-center">{Math.round(y)}</td>
                        <td className="px-3 py-2 text-center">{Math.round(width)}</td>
                        <td className="px-3 py-2 text-center">{Math.round(height)}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleDeleteZone(i)}
                            className="text-red-600 hover:text-red-800 transition"
                            title="Xóa vùng"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraViewerModal;