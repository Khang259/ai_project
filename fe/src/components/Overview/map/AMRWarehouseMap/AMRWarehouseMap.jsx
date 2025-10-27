// src/components/Overview/map/AMRWarehouseMap.jsx
import React, { useEffect, useState } from 'react';
import { Card, Typography, Tag } from 'antd';
import LeafletMap from '@/components/Overview/map/AMRWarehouseMap/Map.jsx';
import useZipImport from '@/hooks/MapDashboard/useZipImport';
import useLeafletMapControls from '@/hooks/MapDashboard/useMapControl';
import useAGVWebSocket from '@/hooks/MapDashboard/useAGVWebsocket';
import CameraViewer from '@/components/Overview/map/camera/CameraViewer.jsx';
import MapFilters from '@/components/Overview/map/AMRWarehouseMap/MapFilters';
// import MapImport from '@/components/Overview/map/AMRWarehouseMap/MapImport';
import NodeDetailsModal from '@/components/Overview/map/AMRWarehouseMap/NodeDetailsModal';
import SwitchButton from '@/components/Overview/map/AMRWarehouseMap/SwitchButton';
import { useArea } from '@/contexts/AreaContext';
import { getMapFromBackend } from '@/services/mapService';
import { useTranslation } from 'react-i18next';
const { Title } = Typography;

const AMRWarehouseMap = () => {
  const { t } = useTranslation();
  // Area context
  const { currAreaId, currAreaName } = useArea();
  
  // Map data states
  const [mapData, setMapData] = useState(null);
  const [securityConfig, setSecurityConfig] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  
  // UI states
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

  const { loading: zipLoading, error: zipError, zipFileName, handleZipImport, saveToBackendLoading, saveToBackendError } = useZipImport();
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

  // Load map data from backend based on current area_id
  useEffect(() => {
    const loadMapFromBackend = async () => {
      if (!currAreaId) {
        console.log('[AMRWarehouseMap] No currAreaId, skipping map load');
        return;
      }
      
      setMapLoading(true);
      setMapError(null);
      
      try {
        const result = await getMapFromBackend(currAreaId);
        
        if (result.success && result.data) {
          setMapData(result.data);
          
          // Also save to localStorage as backup
          localStorage.setItem('mapData', JSON.stringify(result.data));
          localStorage.setItem('currentAreaId', currAreaId.toString());
        } else {
          throw new Error('No map data received from backend');
        }
      } catch (error) {
        console.error(`[AMRWarehouseMap] ❌ Error loading map for area_id ${currAreaId}:`, error);
        setMapError(error.message);
      } finally {
        setMapLoading(false);
      }
    };

    loadMapFromBackend();
  }, [currAreaId]); // Dependency on currAreaId

  // Load security config from localStorage (unchanged)
  useEffect(() => {
    const securityDataStr = localStorage.getItem('securityData');
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
    <div className="dashboard-page" style={{minHeight: '75vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '20%', flexWrap: 'wrap' }}>
        <Title level={1} style={{ fontWeight: 500, fontSize: 32, paddingLeft: 24, paddingRight: 24, color: 'white' }}>
          {t('map.map')}
        </Title>
        <MapFilters className='glass'
          cameraFilter={cameraFilter}
          setCameraFilter={(value) => {
            setCameraFilter(value);
          }}
          amrFilter={amrFilter}
          setAmrFilter={setAmrFilter}
        />
        <div className='items-center justify-center'>
          <SwitchButton/>
        </div>
      </div>
      {/* <MapLegend /> */}
      {/* <Card variant="borderless" style={{ borderRadius: 16, color: '#fff' }}> */}
      <div className="map-area-box">
        {/* Map Loading State */}
        {mapLoading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '600px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '8px',
            border: '2px dashed #d9d9d9'
          }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <div style={{ color: '#1890ff', fontSize: '16px', fontWeight: '500' }}>
              {t('map.loading')} {currAreaName || 'Unknown'}
            </div>
            <div style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
              Area ID: {currAreaId}
            </div>
          </div>
        )}

        {/* Map Error State */}
        {mapError && !mapLoading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '600px',
            background: 'rgba(255, 245, 245, 0.9)',
            borderRadius: '8px',
            border: '2px dashed #ff4d4f',
            padding: '20px'
          }}>
            <div style={{ color: '#ff4d4f', fontSize: '24px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ color: '#ff4d4f', fontSize: '16px', fontWeight: '500', textAlign: 'center' }}>
              Không thể tải bản đồ cho khu vực: {currAreaName || 'Unknown'}
            </div>
            <div style={{ color: '#666', fontSize: '14px', marginTop: '8px', textAlign: 'center' }}>
              Area ID: {currAreaId}
            </div>
            <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '12px', textAlign: 'center', maxWidth: '400px' }}>
              Lỗi: {mapError}
            </div>
          </div>
        )}

        {/* Map Content */}
        {!mapLoading && !mapError && (() => {
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
              cameraFilter={cameraFilter}
            />
          );
        })()}
        {selectedCamera && <CameraViewer cameraData={selectedCamera} onClose={() => setSelectedCamera(null)} />}
        <NodeDetailsModal
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onToggleLock={handleToggleLock}
        />
      </div>
    </div>
  );
};

export default AMRWarehouseMap;