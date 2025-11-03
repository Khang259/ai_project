import React, {useState, useEffect} from 'react';
import { X, Loader2 } from 'lucide-react';
import { getStreamCamera } from '@/services/infocamera-dashboard';

const CameraViewer = ({ cameraData, onClose }) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStreamUrl = async () => {
      if (cameraData?.cameraPath) {
        try {
          const streamUrl = await getStreamCamera(cameraData.cameraPath);
          
          if (streamUrl) {
            setStreamUrl(streamUrl);
            setLoading(false);
          } else {
            setError('Stream URL is empty');
            setLoading(false);
          }
        } catch (error) {
          setError('Không thể tạo stream URL');
          setLoading(false);
        }
      } else {
        console.log('❌ No camera path found');
        setError('Không có camera path');
        setLoading(false);
      }
    };

    fetchStreamUrl();
  }, [cameraData]);

  if (!cameraData) {
    console.log('❌ No cameraData, returning null');
    return null;
  }

  return (
    <div style={{ background: '#0008', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 4px 24px #0006', textAlign: 'center' }}>
        {loading && <div>Đang tải camera...</div>}
        {error && <div style={{ color: 'red', marginBottom: 16 }}>Lỗi: {error}</div>}
        {streamUrl ? (
          <>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
              {cameraData.cameraName || 'Camera Stream'}
            </div>
            <img
              src={streamUrl}
              alt="Camera stream"
              style={{ width: '640px', height: 'auto', border: '2px solid #333' }}
              onLoad={() => {
                setLoading(false);
              }}
              onError={(e) => {
                console.error('❌ Image load error:', e);
                console.error('❌ Failed URL:', streamUrl);
                setError('Không thể tải video stream');
                setLoading(false);
              }}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              <div>RTSP: {cameraData.cameraPath}</div>
              <div>HTTP Stream: {streamUrl}</div>
            </div>
          </>
        ) : (
          <div style={{ color: 'orange', marginBottom: 16 }}>
            ⚠️ Stream URL is empty: "{streamUrl}"
          </div>
        )}
        <br />
        <button
          onClick={onClose}
          className="mt-2 bg-red-500 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default CameraViewer;