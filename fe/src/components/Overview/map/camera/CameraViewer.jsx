import React from 'react';

const CameraViewer = ({ camId, onClose }) => {
  if (!camId) return null;
  return (
    <div style={{ background: '#0008', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 4px 24px #0006', textAlign: 'center' }}>
        <img
          src={`http://localhost:8000/video_feed/1`}
          alt="Camera stream"
          style={{ width: '640px', height: 'auto', border: '2px solid #333' }}
        />
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