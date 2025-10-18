import React, {useState, useEffect} from 'react';
import { getStreamCamera } from '@/services/infocamera-dashboard';

const CameraViewer = ({ cameraData, onClose }) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('streamUrl', streamUrl);

  useEffect(() => {
    console.log('🔄 useEffect triggered with cameraData:', cameraData);
    
    const fetchStreamUrl = async () => {
      console.log('🚀 Starting fetchStreamUrl...');
      
      if (cameraData?.cameraPath) {
        console.log('✅ Camera path exists:', cameraData.cameraPath);
        try {
          console.log('📞 Calling getStreamCamera...');
          const streamUrl = await getStreamCamera(cameraData.cameraPath);
          console.log('✅ getStreamCamera returned:', streamUrl);
          console.log('✅ streamUrl type:', typeof streamUrl);
          console.log('✅ streamUrl length:', streamUrl?.length);
          
          if (streamUrl) {
            setStreamUrl(streamUrl);
            console.log('🔍 Final stream URL set:', streamUrl);
            setLoading(false);
          } else {
            console.error('❌ streamUrl is empty or null');
            setError('Stream URL is empty');
            setLoading(false);
          }
        } catch (error) {
          console.error('❌ Error fetching stream URL:', error);
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

  console.log('🎨 Render - streamUrl:', streamUrl, 'loading:', loading, 'error:', error);

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
                console.log('✅ Image loaded successfully:', streamUrl);
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