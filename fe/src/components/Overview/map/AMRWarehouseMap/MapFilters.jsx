
import React, {useEffect, useState} from 'react';
import { Input, AutoComplete } from 'antd';
import { getCamerasByArea } from '@/services/camera-settings';
import { useArea } from '@/contexts/AreaContext';

const MapFilters = ({ cameraFilter, setCameraFilter}) => {
  const [cameras, setCameras] = useState([]);
  const { currAreaId } = useArea();
  const [open, setOpen] = useState(false);

  // Tải danh sách camera theo area hiện tại
  useEffect(() => {
    const load = async () => {
      if (!currAreaId) return;
      try {
        const data = await getCamerasByArea(currAreaId);
        setCameras(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('[MapFilters] Lỗi tải camera:', e);
        setCameras([]);
      }
    };
    load();
  }, [currAreaId]);

  const options = cameras.map((c) => ({
    value: c.camera_name, // hiển thị tên trong input khi chọn
    label: `${c.camera_name} — ${c.camera_path || 'N/A'}`, // label trong dropdown
    key: c.id || c.camera_name, // đảm bảo unique
  }));

  const handleSelect = (value) => {
    setCameraFilter(value);
    setOpen(false); // Đóng dropdown sau khi chọn
  };

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, border: '1px #333', borderRadius: 10, boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)', padding: 10 }}>
     {/* Filter Camera ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'white' }}>
        <span style={{ fontWeight: 500 }}>Camera ID:</span>
        <AutoComplete
          value={cameraFilter || ''}
          options={options}
          open={open}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(val) => {
            setCameraFilter(val);
          }}
          onSelect={handleSelect}
          style={{ width: 220 }}
        >
        <Input
          placeholder="Nhập Camera ID"
          value={cameraFilter || ''}
          onChange={(e) => {
            setCameraFilter(e.target.value);
          }}
          style={{ width: 120}}
          allowClear
          size="middle"
        />
        </AutoComplete>
      </div>
    </div>
  );
};

export default MapFilters;