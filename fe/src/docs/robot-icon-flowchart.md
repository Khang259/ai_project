# Robot Icon Display Flowchart

## 🔄 Data Flow Process

```
Backend Server
    ↓
[AGV Dashboard API]
    ↓ devicePosition: "10003018"
[WebSocket Broadcast]
    ↓ JSON data
Frontend WebSocket Hook
    ↓ agvData state
AMRWarehouseMap Component
    ↓ parseDevicePosition()
Node Mapping Process
    ↓ find matching node in mapData.nodeArr
Position Parsing
    ↓ {x: node.x, y: node.y}
Map Component
    ↓ create SVG icon
Leaflet Marker
    ↓ display on map
```

## 📋 Detailed Steps

### 1. Backend Data Source
- **File**: `be/app/services/agv_dashboard_service.py`
- **Function**: `get_agv_position()`
- **Output**: `devicePosition: "10003018"` (string format)

### 2. WebSocket Communication
- **File**: `be/app/api/agv_dashboard.py`
- **Endpoint**: `/robot-data`
- **Broadcast**: JSON data to WebSocket clients

### 3. Frontend WebSocket Hook
- **File**: `fe/src/hooks/MapDashboard/useAGVWebsocket.jsx`
- **Function**: `useAGVWebSocket()`
- **State**: `agvData` with robot information

### 4. Position Parsing
- **File**: `fe/src/components/Overview/map/AMRWarehouseMap/AMRWarehouseMap.jsx`
- **Function**: `parseDevicePosition(devicePositionStr, mapData)`
- **Process**: 
  - Convert "10003018" → 10003018
  - Find matching node in mapData.nodeArr
  - Extract coordinates {x, y}

### 5. Robot Processing
- **Filter**: Robots with valid positions
- **Enhance**: Add parsed coordinates
- **Combine**: Real robots + test robot

### 6. Map Rendering
- **File**: `fe/src/components/Overview/map/AMRWarehouseMap/Map.jsx`
- **Icon**: SVG from `/assets/agv-icon-simple.svg`
- **Position**: [y, x] coordinates from node
- **Tooltip**: Robot info + original node ID

## 🎯 Key Components

### Icon System
- **Primary**: SVG icon (vector, scalable)
- **Fallback**: PNG icons from assets
- **Location**: `/public/assets/agv-icon-simple.svg`

### Position Mapping
- **Input**: `devicePosition` string
- **Process**: Parse and match with mapData nodes
- **Output**: Pixel coordinates {x, y}

### Debug Tools
- **Console logs**: Detailed position parsing
- **Tooltip**: Original node ID + coordinates
- **Debug panel**: `window.debugAGV` object

## ✅ Success Indicators

1. **WebSocket Connected**: Green status indicator
2. **Robots Visible**: Icons appear on map
3. **Position Accurate**: Robots at correct node locations
4. **Tooltip Working**: Hover shows robot info
5. **Console Clean**: No parsing errors

## 🔧 Troubleshooting

### Common Issues
- **No robots visible**: Check WebSocket connection
- **Wrong positions**: Verify node mapping in mapData
- **Icon not loading**: Check SVG file in public/assets
- **Parsing errors**: Validate devicePosition format

### Debug Commands
```javascript
// Check WebSocket data
console.log(window.debugAGV);

// Verify map data
console.log(mapData.nodeArr);

// Test position parsing
parseDevicePosition("10003018", mapData);
```
