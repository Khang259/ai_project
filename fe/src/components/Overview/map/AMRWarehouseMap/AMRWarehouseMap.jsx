import React, { useRef, useEffect, useState } from 'react';
import { Card, Button, Typography, Tag, Dropdown, Tooltip } from 'antd';
import { FileAddOutlined, ThunderboltOutlined, WifiOutlined, DisconnectOutlined, FileZipOutlined } from '@ant-design/icons';
import LeafletMap from '@/components/Overview/map/AMRWarehouseMap/Map';
import useZipImport from '@/hooks/MapDashboard/useZipImport';
import useLeafletMapControls from '@/hooks/MapDashboard/useMapControl';
import useAGVWebSocket from '@/hooks/MapDashboard/useAGVWebsocket';
import CameraViewer from '@/components/Overview/map/camera/CameraViewer.jsx';

const { Title } = Typography;

const AMRWarehouseMap = () => {
  const [mapData, setMapData] = useState(null);
  const [securityConfig, setSecurityConfig] = useState(null);
  const [selectedAvoidanceMode, setSelectedAvoidanceMode] = useState(1);
  
  // Chỉ giữ lại các state cần thiết
  const [showNodes, setShowNodes] = useState(false);
  const [showCameras, setShowCameras] = useState(true);
  const [showPaths, setShowPaths] = useState(true);
  const [showChargeStations, setShowChargeStations] = useState(true);
  
  // Node customization states
  const [nodeRadius] = useState(100);
  const [nodeStrokeWidth] = useState(20);
  const [nodeFontSize] = useState(500);
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Custom hooks
  const { loading: zipLoading, error: zipError, zipFileName, handleZipImport } = useZipImport();
  const { 
    mapInstance,
    handleMapReady,
    handleReset,
    setOffset
  } = useLeafletMapControls();
  
  // WebSocket hook cho AGV data
  const { isConnected, agvData, error: wsError } = useAGVWebSocket();

  // Function to parse devicePosition string and map to node coordinates
  const parseDevicePosition = (devicePositionStr, mapData) => {
    if (!devicePositionStr || !mapData || !mapData.nodeArr) {
      return null;
    }

    // Convert string to number (remove any non-numeric characters)
    const nodeId = parseInt(devicePositionStr.toString().replace(/\D/g, ''));
    
    if (isNaN(nodeId)) {
      console.log('[PARSE] Invalid devicePosition string:', devicePositionStr);
      return null;
    }

    // Find node in mapData by key
    const node = mapData.nodeArr.find(n => {
      // Try different ways to match the node
      const nodeKey = parseInt(n.key?.toString().replace(/\D/g, ''));
      return nodeKey === nodeId || n.key === nodeId || n.key === devicePositionStr;
    });

    if (node && typeof node.x !== 'undefined' && typeof node.y !== 'undefined') {
      console.log(`[PARSE] Found node for devicePosition "${devicePositionStr}":`, {
        nodeId: node.key,
        x: node.x,
        y: node.y
      });
      return { x: node.x, y: node.y };
    }

    console.log(`[PARSE] No node found for devicePosition "${devicePositionStr}" (nodeId: ${nodeId})`);
    return null;
  };

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
  // useEffect(() => {
  //   if (agvData && agvData.data && agvData.data.length > 0) {
  //     const agv = agvData.data[0]; // Lấy AGV đầu tiên
  //     if (agv.devicePostionRec && agv.devicePostionRec.length >= 2) {
  //       const newPosition = {
  //         x: agv.devicePostionRec[0],
  //         y: agv.devicePostionRec[1],
  //         angle: agv.oritation ? (agv.oritation * Math.PI / 180) : 0 // Chuyển độ sang radian
  //       };
  //       setRobotPosition(newPosition);
  //     }
  //   }
  // }, [agvData]);

  // File input refs
  const zipFileInputRef = useRef(null);

  const handleZipFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleZipImport(file, setMapData, setSecurityConfig, setSelectedAvoidanceMode);
    }
  };

  // Dropdown menu items - chỉ giữ Import
  const importMenuItems = [
    {
      key: 'zip',
      icon: <FileZipOutlined />,
      label: 'Import Map File',
      onClick: () => zipFileInputRef.current?.click()
    }
  ];

  return (
    <div className="dashboard-page" style={{background: 'white', minHeight: '100vh' }}>
      {/* Header Section - Horizontal Layout */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        {/* Title */}
        <Title level={2} style={{ color: 'black', fontWeight: 700, fontSize: 32, padding: 10 }}>
          Bản đồ quan sát AMR
        </Title>
        {/* Status Connection to AGV Server */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Tag 
            color={isConnected ? 'green' : 'red'} 
            icon={isConnected ? <WifiOutlined /> : <DisconnectOutlined />}
            style={{ fontSize: 14, padding: '4px 12px' }}
          >
            {isConnected ? 'Kết nối đến RCS' : 'Mất kết nối đến RCS'}
          </Tag>
        </div> 

        {/* Nhóm nút điều khiển - Chỉ giữ Import */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, minWidth: 180 }}>
          <div style={{ display: 'flex', gap: 16, marginRight: 10}}>
            <Tooltip title="Import Map Files">
              <Dropdown menu={{ items: importMenuItems }} placement="bottom">
                <Button 
                  icon={<FileAddOutlined />} 
                  size="large"
                  style={{ 
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
          </div>

          {/* Trạng thái import file */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {zipLoading && (
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
                <span style={{ color: '#00f2fe' }}>Đang tải...</span>
              </div>
            )}

            {zipError && (
              <div style={{ 
                padding: '8px 16px', 
                background: 'rgba(255, 77, 79, 0.1)', 
                borderRadius: 20,
                border: '1px solid #ff4d4f',
                color: '#ff4d4f'
              }}>
                {zipError}
              </div>
            )}

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
            )}
          </div>
        </div>
      </div>

      {/* Chú thích */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderRadius: 12,
        flexWrap: 'wrap',
        marginLeft: 16,
        marginRight: 16
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
          <span className="legend-icon" style={{ background: '#f87171', display: 'inline-block', width: 16, height: 16, borderRadius: 4 }}></span>
          Vị trí camera
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
          <span className="legend-icon" style={{ background: 'green', display: 'inline-block', width: 16, height: 16, borderRadius: 4 }}></span>
          Điểm sạc
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
          <span className="legend-icon" style={{ background: '#60a5fa', borderRadius: '0.25em', display: 'inline-block', width: 16, height: 16 }}></span>
          Robot AMR
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
          <ThunderboltOutlined style={{ color: '#fcd34d' }} />
          Đang sạc
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
          <span className="legend-path" style={{ display: 'inline-block', width: 32, height: 4, background: 'linear-gradient(90deg,#60a5fa,#3b82f6)', borderRadius: 2 }}></span>
          Khu vực đường đi AMR
        </span>
      </div>

      {/* Map Container */}
      <Card variant="borderless" style={{ borderRadius: 16, color: '#fff' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {agvData && agvData.data && agvData.data.length > 0 && (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>AGV {agvData.data[0].deviceName || 'Unknown'}</span>
                  <Tag color={agvData.data[0].state === 'InTask' ? 'green' : 'orange'}>{agvData.data[0].state || 'Unknown'}</Tag>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#ccc', fontSize: 12 }}>
                    Battery: {agvData.data[0].battery || 'N/A'}%
                  </span>
                  <span style={{ color: '#ccc', fontSize: 12 }}>
                    Speed: {agvData.data[0].speed || 'N/A'} mm/s
                  </span>
                  <span style={{ color: '#ccc', fontSize: 12 }}>
                    Payload: {String(agvData.data[0].payLoad) === '0.0' ? 'Unload' : String(agvData.data[0].payLoad) === '1.0' ? 'Load' : 'N/A'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="map-area-box" style={{ padding: 4}}>
          {(() => {
            const rawList = Array.isArray(agvData) ? agvData : (agvData?.data || []);
            
            // Process robots and add parsed positions
            const processedList = rawList.map(item => {
              if (!item) return null;
              
              // Parse devicePosition string to get node coordinates
              const parsedPosition = parseDevicePosition(item.devicePosition, mapData);
              
              if (parsedPosition) {
                // Add parsed position to robot data
                return {
                  ...item,
                  devicePositionParsed: parsedPosition,
                  devicePositionOriginal: item.devicePosition
                };
              }
              
              // Fallback to existing position fields
              if (item.devicePosition && typeof item.devicePosition === 'object') {
                const pos = item.devicePosition;
                if (pos.x !== undefined && pos.y !== undefined && 
                    pos.x !== null && pos.y !== null &&
                    !isNaN(pos.x) && !isNaN(pos.y)) {
                  return item;
                }
              }
              
              // Other fallbacks
              if (item.devicePositionParsed || item.position || 
                  (item.x !== undefined && item.y !== undefined)) {
                return item;
              }
              
              return null;
            }).filter(Boolean);
            
            const filteredList = processedList;
            
            // Always add test robot for debugging - but position it differently
            const testRobot = {
              device_name: 'TEST_AGV_001',
              devicePosition: { x: 1000, y: 1000 },
              devicePositionParsed: { x: 1000, y: 1000 },
              battery: '85%',
              speed: '2.5 m/s',
              angle: 0
            };
            
            // Combine real robots with test robot
            const finalRobotList = [...filteredList, testRobot];
            
            try {
              console.log('[AMR MAP] robots total:', rawList.length, 'visible (has position):', filteredList.length);
              console.log('[AMR MAP] final robot list (with test):', finalRobotList.length);
              console.log('[AMR MAP] agvData type:', typeof agvData, agvData ? 'exists' : 'null');
              console.log('[AMR MAP] WebSocket connected:', isConnected);
              
              // Debug panel in console
              window.debugAGV = {
                rawList,
                filteredList,
                finalRobotList,
                agvData,
                isConnected,
                timestamp: new Date().toISOString()
              };
              
              // Log detailed robot position info
              if (filteredList.length > 0) {
                console.log('[AMR MAP] First 3 real robots with positions:');
                filteredList.slice(0, 3).forEach((robot, idx) => {
                  console.log(`[AMR MAP] Robot ${idx}:`, {
                    name: robot.device_name || robot.deviceName,
                    devicePositionOriginal: robot.devicePositionOriginal,
                    devicePositionParsed: robot.devicePositionParsed,
                    x: robot.devicePositionParsed?.x || robot.devicePosition?.x,
                    y: robot.devicePositionParsed?.y || robot.devicePosition?.y
                  });
                });
              }
              
              // Log invalid robots for debugging
              const invalidRobots = rawList.filter(item => {
                if (!item) return false;
                if (item.devicePosition && typeof item.devicePosition === 'object') {
                  const pos = item.devicePosition;
                  return !(pos.x !== undefined && pos.y !== undefined && 
                          pos.x !== null && pos.y !== null &&
                          !isNaN(pos.x) && !isNaN(pos.y));
                }
                return true;
              });
              
              if (invalidRobots.length > 0) {
                console.log('[AMR MAP] Invalid robots (no valid position):', invalidRobots.length);
                console.log('[AMR MAP] Sample invalid robot:', invalidRobots[0]);
              }
            } catch {}
            return (
              <LeafletMap
            mapData={mapData}
            securityConfig={securityConfig}
            // robotPosition={robotPosition}
            robotList={finalRobotList}
            showNodes={showNodes}
            showCameras={showCameras}
            showPaths={showPaths}
            showChargeStations={showChargeStations}
            selectedAvoidanceMode={selectedAvoidanceMode}
            nodeRadius={nodeRadius}
            nodeStrokeWidth={nodeStrokeWidth}
            nodeFontSize={nodeFontSize}
            onMapReady={handleMapReady}
            onCameraClick={setSelectedCamera}
            />
            );
          })()}
          {selectedCamera && (
            <CameraViewer camId={selectedCamera} onClose={() => setSelectedCamera(null)} />
          )}
        </div>
      </Card>
      <input
        ref={zipFileInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleZipFileChange}
      />
    </div>
  );
};

export default AMRWarehouseMap; 