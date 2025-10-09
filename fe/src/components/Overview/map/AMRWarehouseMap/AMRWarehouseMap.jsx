// src/components/Overview/map/AMRWarehouseMap.jsx
import React, { useEffect, useState } from 'react';
import { Card, Typography, Tag } from 'antd';
import LeafletMap from '@/components/Overview/map/AMRWarehouseMap/Map.jsx';
import useZipImport from '@/hooks/MapDashboard/useZipImport';
import useLeafletMapControls from '@/hooks/MapDashboard/useMapControl';
import useAGVWebSocket from '@/hooks/MapDashboard/useAGVWebsocket';
import CameraViewer from '@/components/Overview/map/camera/CameraViewer.jsx';
// import MapLegend from '@/components/Overview/map/AMRWarehouseMap/MapLegend';
import MapFilters from '@/components/Overview/map/AMRWarehouseMap/MapFilters';
import MapImport from '@/components/Overview/map/AMRWarehouseMap/MapImport';
import NodeDetailsModal from '@/components/Overview/map/AMRWarehouseMap/NodeDetailsModal';
import SwitchButton from '@/components/Overview/map/AMRWarehouseMap/SwitchButton';
const { Title } = Typography;

const AMRWarehouseMap = () => {
  const [mapData, setMapData] = useState(null);
  const [securityConfig, setSecurityConfig] = useState(null);
  const [selectedAvoidanceMode, setSelectedAvoidanceMode] = useState(1);
  const [showNodes, setShowNodes] = useState(true);
  const [showCameras, setShowCameras] = useState(true);
  const [showPaths, setShowPaths] = useState(true);
  const [showChargeStations, setShowChargeStations] = useState(true);
  const [nodeRadius] = useState(100);
  const [nodeStrokeWidth] = useState(20);
  const [nodeFontSize] = useState(500);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [cameraFilter, setCameraFilter] = useState('');
  const [amrFilter, setAmrFilter] = useState('');

  const { loading: zipLoading, error: zipError, zipFileName, handleZipImport } = useZipImport();
  const { handleMapReady } = useLeafletMapControls();
  const { isConnected, agvData, error: wsError } = useAGVWebSocket();

  // Parse device position function (unchanged)
  const parseDevicePosition = (devicePositionStr, mapData) => {
    if (!devicePositionStr || !mapData || !mapData.nodeArr) {
      return null;
    }
    const nodeId = parseInt(devicePositionStr.toString().replace(/\D/g, ''));
    if (isNaN(nodeId)) {
      console.log('[PARSE] Invalid devicePosition string:', devicePositionStr);
      return null;
    }
    const node = mapData.nodeArr.find((n) => {
      const nodeKey = parseInt(n.key?.toString().replace(/\D/g, ''));
      return nodeKey === nodeId || n.key === nodeId || n.key === devicePositionStr;
    });
    if (node && typeof node.x !== 'undefined' && typeof node.y !== 'undefined') {
      return { x: node.x, y: node.y };
    }
    return null;
  };

  // Load data from localStorage (unchanged)
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

  const handleNodeClick = (nodeInfo) => {
    console.log('Node clicked in AMRWarehouseMap:', nodeInfo);
    setSelectedNode(nodeInfo);
  };

  const handleToggleLock = (nodeId) => {
    console.log('Toggle lock for node:', nodeId);
    setSelectedNode(null);
  };

  return (
    <div className="dashboard-page" style={{ background: 'white', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Title level={1} style={{ color: 'black', fontWeight: 500, fontSize: 32, paddingLeft: 8 }}>
          Bản đồ quan sát AMR
        </Title>
        <MapFilters
          cameraFilter={cameraFilter}
          setCameraFilter={setCameraFilter}
          amrFilter={amrFilter}
          setAmrFilter={setAmrFilter}
        />
        <SwitchButton />
        <MapImport
          zipLoading={zipLoading}
          zipError={zipError}
          zipFileName={zipFileName}
          handleZipImport={handleZipImport}
          setMapData={setMapData}
          setSecurityConfig={setSecurityConfig}
          setSelectedAvoidanceMode={setSelectedAvoidanceMode}
        />
      </div>
      {/* <MapLegend /> */}
      <Card variant="borderless" style={{ borderRadius: 16, color: '#fff' }}>
        <div style={{ padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {agvData && agvData.data && agvData.data.length > 0 && (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>AGV {agvData.data[0].deviceName || 'Unknown'}</span>
                  <Tag color={agvData.data[0].state === 'InTask' ? 'green' : 'orange'}>{agvData.data[0].state || 'Unknown'}</Tag>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#ccc', fontSize: 12 }}>Battery: {agvData.data[0].battery || 'N/A'}%</span>
                  <span style={{ color: '#ccc', fontSize: 12 }}>Speed: {agvData.data[0].speed || 'N/A'} mm/s</span>
                  <span style={{ color: '#ccc', fontSize: 12 }}>
                    Payload: {String(agvData.data[0].payLoad) === '0.0' ? 'Unload' : String(agvData.data[0].payLoad) === '1.0' ? 'Load' : 'N/A'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="map-area-box">
          {(() => {
            const rawList = Array.isArray(agvData) ? agvData : (agvData?.data || []);
            const processedList = rawList
              .map((item) => {
                if (!item) return null;
                const parsedPosition = parseDevicePosition(item.devicePosition, mapData);
                if (parsedPosition) {
                  return {
                    ...item,
                    devicePositionParsed: parsedPosition,
                    devicePositionOriginal: item.devicePosition,
                  };
                }
                if (item.devicePosition && typeof item.devicePosition === 'object') {
                  const pos = item.devicePosition;
                  if (pos.x !== undefined && pos.y !== undefined && pos.x !== null && pos.y !== null && !isNaN(pos.x) && !isNaN(pos.y)) {
                    return item;
                  }
                }
                if (item.devicePositionParsed || item.position || (item.x !== undefined && item.y !== undefined)) {
                  return item;
                }
                return null;
              })
              .filter(Boolean);
            const filteredList = processedList;
            const finalRobotList = [...filteredList];
            return (
              <LeafletMap
                mapData={mapData}
                securityConfig={securityConfig}
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
                onNodeClick={handleNodeClick}
              />
            );
          })()}
          {selectedCamera && <CameraViewer camId={selectedCamera} onClose={() => setSelectedCamera(null)} />}
          <NodeDetailsModal
            selectedNode={selectedNode}
            onClose={() => setSelectedNode(null)}
            onToggleLock={handleToggleLock}
          />
        </div>
      </Card>
    </div>
  );
};

export default AMRWarehouseMap;