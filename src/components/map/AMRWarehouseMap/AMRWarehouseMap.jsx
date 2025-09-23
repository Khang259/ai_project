import React, { useRef, useEffect, useState } from 'react';
import { Row, Col, Card, Button, Checkbox, Typography, Divider, Tag, Alert, Dropdown, Space, Tooltip } from 'antd';
import { FileAddOutlined, EyeOutlined, ShareAltOutlined, ThunderboltOutlined, AimOutlined, ReloadOutlined, WifiOutlined, WifiOutlined as WifiDisconnectedOutlined, SettingOutlined, UploadOutlined, FileZipOutlined } from '@ant-design/icons';
import LeafletMap from '@/components/map/AMRWarehouseMap/Map';
import useZipImport from '@/hooks/MapDashboard/useZipImport';
import useLeafletMapControls from '@/hooks/MapDashboard/useMapControl';
import useAGVWebSocket from '@/hooks/MapDashboard/useAGVWebsocket';
// import thadorobotLogo from '@/assets/images/thadorobot.png';
import CameraViewer from '@/components/map/camera/CameraViewer.jsx';

const { Title } = Typography;

const AMRWarehouseMap = () => {
  const [mapData, setMapData] = useState(null);
  const [securityConfig, setSecurityConfig] = useState(null);
  const [robotPosition, setRobotPosition] = useState({ x: 49043, y: 74172, angle: 0 });
  const [selectedAvoidanceMode, setSelectedAvoidanceMode] = useState(1);
  const [showNodes, setShowNodes] = useState(true);
  const [showPaths, setShowPaths] = useState(true);
  const [showChargeStations, setShowChargeStations] = useState(true);
  // Node customization states
  const [nodeRadius, setNodeRadius] = useState(100);
  const [nodeStrokeWidth, setNodeStrokeWidth] = useState(20);
  const [nodeFontSize, setNodeFontSize] = useState(500);
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Custom hooks
  const { loading: zipLoading, error: zipError, zipFileName, handleZipImport } = useZipImport();
  const { 
    mapInstance,
    handleMapReady,
    handleReset
  } = useLeafletMapControls();
  
  // WebSocket hook cho AGV data
  const { isConnected, agvData, error: wsError } = useAGVWebSocket();

  // Tự động nạp lại dữ liệu từ localStorage khi load trang
  useEffect(() => {
    const mapDataStr = localStorage.getItem('mapData');
    const securityDataStr = localStorage.getItem('securityData');
    if (mapDataStr) {
      try {
        setMapData(JSON.parse(mapDataStr));
      } catch {}
    }
    if (securityDataStr) {
      try {
        setSecurityConfig(JSON.parse(securityDataStr));
      } catch {}
    }
  }, []);

  // Cập nhật vị trí robot từ dữ liệu AGV realtime
  useEffect(() => {
    if (agvData && agvData.data && agvData.data.length > 0) {
      const agv = agvData.data[0]; // Lấy AGV đầu tiên
      if (agv.devicePostionRec && agv.devicePostionRec.length >= 2) {
        const newPosition = {
          x: agv.devicePostionRec[0],
          y: agv.devicePostionRec[1],
          angle: agv.oritation ? (agv.oritation * Math.PI / 180) : 0 // Chuyển độ sang radian
        };
        setRobotPosition(newPosition);
      }
    }
  }, [agvData]);

  // File input refs
  // const zipFileInputRef = useRef(null);

  // const handleZipFileChange = (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     handleZipImport(file, setMapData, setSecurityConfig, setSelectedAvoidanceMode);
  //   }
  // };



  // Dropdown menu items
  // const importMenuItems = [
  //   {
  //     key: 'zip',
  //     icon: <FileZipOutlined />,
  //     label: 'Import ZIP File',
  //     onClick: () => zipFileInputRef.current?.click()
  //   }
  // ];

  const displayMenuItems = [
    {
      key: 'nodes',
      label: (
        <Checkbox checked={showNodes} onChange={e => setShowNodes(e.target.checked)} style={{ color: '#00f2fe' }}>
          Show Waypoints
        </Checkbox>
      )
    },
    {
      key: 'paths',
      label: (
        <Checkbox checked={showPaths} onChange={e => setShowPaths(e.target.checked)} style={{ color: '#00f2fe' }}>
          Show Paths
        </Checkbox>
      )
    },
    {
      key: 'charge',
      label: (
        <Checkbox checked={showChargeStations} onChange={e => setShowChargeStations(e.target.checked)} style={{ color: '#00f2fe' }}>
          Show Charge Stations
        </Checkbox>
      )
    }
  ];

  return (
    <div className="dashboard-page" style={{background: 'white', minHeight: '100vh' }}>
      {/* <img src={thadorobotLogo} alt="THADO ROBOT Logo" style={{ height: 60, margin: '0 auto', display: 'block' }} /> */}
      <Title level={2} style={{ color: 'black', fontWeight: 700, fontSize: 32}}>
        AMR Map View
      </Title>
      
      
      {/* WebSocket Connection Status */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Tag 
          color={isConnected ? 'green' : 'red'} 
          icon={isConnected ? <WifiOutlined /> : <WifiDisconnectedOutlined />}
          style={{ fontSize: 14, padding: '4px 12px' }}
        >
          {isConnected ? 'Connected to AGV Server' : 'Disconnected from AGV Server'}
        </Tag>
        {wsError && (
          <Alert 
            message="WebSocket Error" 
            description={wsError} 
            type="error" 
            showIcon 
            style={{ marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}
          />
        )}
      </div>

      {/* Control buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
        {/* <Tooltip title="Import Map Files">
          <Dropdown menu={{ items: importMenuItems }} placement="bottom">
            <Button 
              icon={<FileAddOutlined />} 
              size="large"
              style={{ 
                background: '#192040', 
                border: '2px solid #00f2fe', 
                color: '#00f2fe',
                borderRadius: '50%',
                width: 60,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          </Dropdown>
        </Tooltip> */}

        <Tooltip title="Display Options">
          <Dropdown menu={{ items: displayMenuItems }} placement="bottom">
            <Button 
              icon={<SettingOutlined />} 
              size="large"
              style={{ 
                background: 'white', 
                border: '2px solid black', 
                color: 'black',
                borderRadius: '50%',
                width: 60,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          </Dropdown>
        </Tooltip>

        {/* {zipLoading && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            padding: '8px 16px', 
            background: 'rgba(0, 242, 254, 0.1)', 
            borderRadius: 20,
            border: '1px solid #00f2fe'
          }}>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span style={{ color: '#00f2fe' }}>Loading...</span>
          </div>
        )} */}

        {/* {zipError && (
          <div style={{ 
            padding: '8px 16px', 
            background: 'rgba(255, 77, 79, 0.1)', 
            borderRadius: 20,
            border: '1px solid #ff4d4f',
            color: '#ff4d4f'
          }}>
            {zipError}
          </div>
        )} */}
{/* 
        {zipFileName && (
          <div style={{ 
            padding: '8px 16px', 
            background: 'rgba(82, 196, 26, 0.1)', 
            borderRadius: 20,
            border: '1px solid #52c41a',
            color: '#52c41a',
            fontSize: 12
          }}>
            ✓ {zipFileName}
          </div>
        )} */}
      </div>

      {/* Map Container */}
      <Card variant="borderless" style={{ borderRadius: 16, background: 'red', color: '#fff', minHeight: 700 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {agvData && agvData.data && agvData.data.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>AGV {agvData.data[0].deviceName || 'Unknown'}</span>
                <Tag color={agvData.data[0].state === 'InTask' ? 'green' : 'orange'}>{agvData.data[0].state || 'Unknown'}</Tag>
                <span style={{ color: '#ccc', fontSize: 12 }}>
                  Battery: {agvData.data[0].battery || 'N/A'}% | 
                  Speed: {agvData.data[0].speed || 'N/A'} mm/s | 
                  Payload: {String(agvData.data[0].payLoad) === '0.0' ? 'Unload' : String(agvData.data[0].payLoad) === '1.0' ? 'Load' : 'N/A'}
                </span>
              </div>
            )}
          </div>
          <Button icon={<ReloadOutlined />} onClick={handleReset} style={{ background: '#00f2fe', color: '#181f36', fontWeight: 600 }}>
            Reset
          </Button>
        </div>
        <div className="map-area-box" style={{ padding: 8 }}>
          <LeafletMap
            mapData={mapData}
            securityConfig={securityConfig}
            robotPosition={robotPosition}
            showNodes={showNodes}
            showPaths={showPaths}
            showChargeStations={showChargeStations}
            selectedAvoidanceMode={selectedAvoidanceMode}
            nodeRadius={nodeRadius}
            nodeStrokeWidth={nodeStrokeWidth}
            nodeFontSize={nodeFontSize}
            onMapReady={handleMapReady}
            onCameraClick={setSelectedCamera}
          />
          {selectedCamera && (
            <CameraViewer camId={selectedCamera} onClose={() => setSelectedCamera(null)} />
          )}
        </div>
      </Card>

      {/* Legend - moved to bottom */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 24, 
        marginTop: 16, 
        padding: '16px 24px', 
        background: '#192040', 
        borderRadius: 12,
        flexWrap: 'wrap'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
          <span className="legend-icon" style={{ background: '#34d399', display: 'inline-block', width: 16, height: 16, borderRadius: 4 }}></span>
          Regular Waypoint
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
          <span className="legend-icon" style={{ background: '#f87171', display: 'inline-block', width: 16, height: 16, borderRadius: 4 }}></span>
          Special Node
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
          <span className="legend-icon" style={{ background: '#fcd34d', display: 'inline-block', width: 16, height: 16, borderRadius: 4 }}></span>
          Charge Station
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
          <span className="legend-icon" style={{ background: '#60a5fa', borderRadius: '0.25em', display: 'inline-block', width: 16, height: 16 }}></span>
          AMR Robot
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
          <ThunderboltOutlined style={{ color: '#fcd34d' }} />
          Charging Symbol
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
          <span className="legend-path" style={{ display: 'inline-block', width: 32, height: 4, background: 'linear-gradient(90deg,#60a5fa,#3b82f6)', borderRadius: 2 }}></span>
          Path
        </span>
      </div>
    </div>
  );
};

export default AMRWarehouseMap; 