// src/pages/MobileGridDisplay.jsx
import React, { useState, useCallback } from 'react';
import { Card } from 'react-bootstrap';
import '../styles/bootstrap-scoped.css';

// Import custom hooks
import { useGridConfig } from '@/hooks/GridManagement/useGridConfig';
import { useTaskData } from '@/hooks/GridManagement/useTaskData';
import { useTaskManagement } from '@/hooks/GridManagement/useTaskManagement';
import { useAuth } from '@/hooks/GridManagement/useAuth';
import { useArea } from '@/contexts/AreaContext';

// Import components
import GridArea from '@/components/GridManagement/GridArea';
import DropdownMenu from '@/components/GridManagement/DropdownMenu';
import ConfirmationModal from '@/components/GridManagement/ConfirmationModal';
import KhuAreaSelector from '@/components/GridManagement/KhuAreaSelector';
import ServerInfo from '@/components/GridManagement/ServerInfo';
import useButtonSettings from '@/hooks/Setting/useButtonSettings';
import NodeTypeCells from '@/components/GridManagement/NodeTypeCells';

const SERVER_URL = import.meta.env.VITE_API_URL;
const SERVER_ICS_URL = import.meta.env.VITE_ICS_API_URL;

const MobileGridDisplay = () => {
  // Authentication hook (chỉ dùng để lấy currentUser và logout, không xử lý phân quyền tại đây)
  const { currentUser, logout } = useAuth();
  const { currAreaName, currAreaId } = useArea();
  
  // Bỏ useSettings: sử dụng serverIPs cục bộ từ biến môi trường
  const serverIPs = [SERVER_URL, SERVER_ICS_URL].filter(Boolean);
  
  // State management
  const [selectedKhu, setSelectedKhu] = useState('');
  const [selectedCell, setSelectedCell] = useState('');
  const [selectedSupplyCell, setSelectedSupplyCell] = useState('');
  const [selectedDemandCell, setSelectedDemandCell] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cellStates, setCellStates] = useState({});

  // Custom hooks
  const { gridConfig, isConfigLoading, error: configError } = useGridConfig(serverIPs, currentUser?.username);
  const { supplyTaskData, demandTaskData, loading: taskLoading, error: taskError } = useTaskData(
    serverIPs,
    selectedKhu,
    currentUser?.username
  );
  const { isSending, sendResult, setSendResult, handleSendSignalGrid, handleSendDoubleTask } = useTaskManagement(
    serverIPs,
    setCellStates
  );

  // Lấy nodeTypes và danh sách nodes từ ButtonSettings để dùng làm danh sách khu (node types)
  const { nodeTypes, allNodes, selectedNodeType, setSelectedNodeType } = useButtonSettings(currentUser, null);
  console.log('[MobileGridDisplay] nodeTypes:', nodeTypes);
  console.log('[MobileGridDisplay] selectedNodeType:', selectedNodeType);
  // Computed values
  const effectiveServerIP = serverIPs && Array.isArray(serverIPs) && serverIPs.length > 0 ? serverIPs[0] : SERVER_URL;
  const currentKhuConfig = gridConfig && selectedKhu ? gridConfig[selectedKhu + 'Config'] : null;
  const totalCells = currentKhuConfig ? currentKhuConfig.cells : 0;
  // Đồng bộ selectedKhu với selectedNodeType trong hook ButtonSettings
  React.useEffect(() => {
    if (selectedKhu) {
      setSelectedNodeType(selectedKhu);
    }
  }, [selectedKhu, setSelectedNodeType]);
  // Chuyển allNodes -> cấu trúc taskData mà GridCell kỳ vọng
  const unifiedTaskData = React.useMemo(() => {
    if (!Array.isArray(allNodes)) return [];
    return allNodes.map((n, idx) => ({
      cell: `cell-${idx + 1}`,
      value: {
        taskOrderDetail: [
          {
            taskPath: n.node_name || `${n.start ?? ''}${n.start && n.end ? ' → ' : ''}${n.end ?? ''}`
          }
        ]
      }
    }));
  }, [allNodes]);
  const displayTotalCells = currentKhuConfig ? totalCells : (Array.isArray(allNodes) ? allNodes.length : 0);
  console.log('[MobileGridDisplay] selectedKhu:', selectedKhu, 'allNodes.length:', Array.isArray(allNodes) ? allNodes.length : 'n/a', 'displayTotalCells:', displayTotalCells);
  console.log('[MobileGridDisplay] unifiedTaskData sample:', unifiedTaskData?.[0]);

  // Helper functions
  const checkSetup = useCallback(() => {
    return selectedSupplyCell && selectedDemandCell;
  }, [selectedSupplyCell, selectedDemandCell]);

  const addHistoryRecord = useCallback(() => {
    // Placeholder function for history recording
    console.log('History record added');
  }, []);

  // Event handlers
  const handleCellClick = useCallback(
    (cellNumber) => {
      console.log(`🖱️ Ô được chọn: cell-${cellNumber} cho khu ${selectedKhu}`);
      setSelectedCell(cellNumber);
      setSendResult(null);
      setShowSuccessModal(true);
    },
    [selectedKhu]
  );

  const handleSupplyCellSelect = useCallback((cell) => {
    setSelectedSupplyCell(cell);
    setSelectedCell(cell);
  }, []);

  const handleDemandCellSelect = useCallback((cell) => {
    setSelectedDemandCell(cell);
    setSelectedCell(cell);
  }, []);

  const handleKhuSelect = useCallback((khu) => {
    setSelectedKhu(khu);
  }, []);

  const handleConfirmSend = useCallback(async () => {
    const taskData = selectedKhu === 'Supply' ? supplyTaskData : demandTaskData;
    const result = await handleSendSignalGrid(selectedCell, selectedKhu, taskData, addHistoryRecord);
    
    if (result.success) {
      setTimeout(() => {
        setShowSuccessModal(false);
        setSendResult(null);
      }, 2000);
    }
  }, [selectedCell, selectedKhu, supplyTaskData, demandTaskData, handleSendSignalGrid, addHistoryRecord]);

  const handleSendDoubleTaskWrapper = useCallback(async () => {
    await handleSendDoubleTask(
      selectedSupplyCell,
      selectedDemandCell,
      supplyTaskData,
      demandTaskData,
      checkSetup,
      addHistoryRecord
    );
  }, [
    selectedSupplyCell,
    selectedDemandCell,
    supplyTaskData,
    demandTaskData,
    checkSetup,
    handleSendDoubleTask,
    addHistoryRecord
  ]);
  const renderGridContent = useCallback(() => {
    if (selectedKhu === 'SupplyAndDemand') {
      return (
        <DropdownMenu
          gridConfig={gridConfig}
          supplyTaskData={supplyTaskData}
          demandTaskData={demandTaskData}
          selectedSupplyCell={selectedSupplyCell}
          selectedDemandCell={selectedDemandCell}
          onSupplyCellSelect={handleSupplyCellSelect}
          onDemandCellSelect={handleDemandCellSelect}
          checkSetup={checkSetup}
          onSendDoubleTask={handleSendDoubleTaskWrapper}
          isSending={isSending}
          sendResult={sendResult}
        />
      );
    }

    return (
      <GridArea
        selectedKhu={selectedKhu}
        currentKhuConfig={currentKhuConfig}
        totalCells={displayTotalCells}
        supplyTaskData={supplyTaskData}
        demandTaskData={unifiedTaskData}
        cellStates={cellStates}
        onCellClick={handleCellClick}
        isConfigLoading={false}
        taskLoading={false}
        configError={null}
        taskError={null}
      />
    );
  }, [
    selectedKhu,
    gridConfig,
    supplyTaskData,
    demandTaskData,
    selectedSupplyCell,
    selectedDemandCell,
    handleSupplyCellSelect,
    handleDemandCellSelect,
    checkSetup,
    handleSendDoubleTaskWrapper,
    isSending,
    sendResult,
    currentKhuConfig,
    totalCells,
    cellStates,
    handleCellClick,
    isConfigLoading,
    taskLoading,
    configError,
    taskError
  ]);

  // Bỏ gating theo đăng nhập: PrivateRoute đã xử lý bên ngoài

  return (
    <div className="mobile-grid-bootstrap">
      <div className="d-flex flex-column min-vh-100 w-100">
        <div className="container-fluid main-container flex-grow-1 py-3">
          <div className="container">
            <div className="w-100">
              <Card className="w-100">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">CHỌN KHU VỰC VÀ TASK PATH</h5>
                  <div className="mt-2">
                    <span className="badge bg-info text-dark">
                      Khu vực hiện tại: {currAreaName} (ID: {currAreaId})
                    </span>
                  </div>
                </Card.Header>
                <Card.Body>
                  <ServerInfo
                    effectiveServerIP={effectiveServerIP}
                    currentUser={currentUser}
                    selectedKhu={selectedKhu}
                    currentKhuConfig={currentKhuConfig}
                    totalCells={totalCells}
                    onLogout={logout}
                  />

                  <KhuAreaSelector
                    selectedKhu={selectedKhu}
                    onKhuSelect={handleKhuSelect}
                    nodeTypeKeys={Object.keys(nodeTypes || {})}
                  />

                  {selectedKhu && (
                    <div className="bg-light p-3 rounded">
                      {/* Hiển thị dạng nút theo nodeType (log khi ấn) */}
                      <NodeTypeCells
                        cells={allNodes}
                        onCellPress={(cell) => console.log('[MobileGridDisplay] Pressed node:', cell)}
                      />
                    </div>
                  )}

                  <ConfirmationModal
                    show={showSuccessModal}
                    onHide={() => setShowSuccessModal(false)}
                    selectedCell={selectedCell}
                    sendResult={sendResult}
                    isSending={isSending}
                    onConfirm={handleConfirmSend}
                  />
                </Card.Body>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileGridDisplay;