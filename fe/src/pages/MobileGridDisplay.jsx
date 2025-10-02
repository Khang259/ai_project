// src/pages/MobileGridDisplay.jsx
import React, { useState, useCallback } from 'react';
import { Card } from 'react-bootstrap';
import '../styles/bootstrap-scoped.css';

// Import custom hooks
import { useGridConfig } from '@/hooks/GridManagement/useGridConfig';
import { useTaskData } from '@/hooks/GridManagement/useTaskData';
import { useTaskManagement } from '@/hooks/GridManagement/useTaskManagement';
import { useAuth } from '@/hooks/GridManagement/useAuth';

// Import components
import GridArea from '@/components/GridManagement/GridArea';
import DropdownMenu from '@/components/GridManagement/DropdownMenu';
import ConfirmationModal from '@/components/GridManagement/ConfirmationModal';
import KhuAreaSelector from '@/components/GridManagement/KhuAreaSelector';
import ServerInfo from '@/components/GridManagement/ServerInfo';
import LoginPrompt from '@/components/GridManagement/LoginPrompt';

const SERVER_URL = import.meta.env.VITE_API_URL;
const SERVER_ICS_URL = import.meta.env.VITE_ICS_API_URL;

const MobileGridDisplay = () => {
  // Authentication hook
  const { currentUser, isAdmin, isUserAE3, isUserAE4, isUserMainOvh, logout } = useAuth();
  
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

  // Computed values
  const effectiveServerIP = serverIPs && Array.isArray(serverIPs) && serverIPs.length > 0 ? serverIPs[0] : SERVER_URL;
  const currentKhuConfig = gridConfig && selectedKhu ? gridConfig[selectedKhu + 'Config'] : null;
  const totalCells = currentKhuConfig ? currentKhuConfig.cells : 0;

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

  // Render functions
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
          isUserAE3={isUserAE3}
          isUserAE4={isUserAE4}
          isUserMainOvh={isUserMainOvh}
        />
      );
    }

    return (
      <GridArea
        selectedKhu={selectedKhu}
        currentKhuConfig={currentKhuConfig}
        totalCells={totalCells}
        supplyTaskData={supplyTaskData}
        demandTaskData={demandTaskData}
        cellStates={cellStates}
        onCellClick={handleCellClick}
        isConfigLoading={isConfigLoading}
        taskLoading={taskLoading}
        configError={configError}
        taskError={taskError}
        isUserAE3={isUserAE3}
        isUserAE4={isUserAE4}
        isUserMainOvh={isUserMainOvh}
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
    isUserAE3,
    isUserAE4,
    isUserMainOvh,
    currentKhuConfig,
    totalCells,
    cellStates,
    handleCellClick,
    isConfigLoading,
    taskLoading,
    configError,
    taskError
  ]);

  // Hiển thị LoginPrompt nếu user chưa đăng nhập
  if (!currentUser) {
    return (
      <div className="mobile-grid-bootstrap">
        <div className="d-flex flex-column min-vh-100 w-100">
          <div className="container-fluid main-container flex-grow-1 py-3">
            <div className="container">
              <div className="w-100">
                <Card className="w-100">
                  <Card.Header className="bg-light">
                    <h5 className="mb-0">CHỌN KHU VỰC VÀ TASK PATH</h5>
                  </Card.Header>
                  <Card.Body>
                    <LoginPrompt />
                  </Card.Body>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-grid-bootstrap">
      <div className="d-flex flex-column min-vh-100 w-100">
        <div className="container-fluid main-container flex-grow-1 py-3">
          <div className="container">
            <div className="w-100">
              <Card className="w-100">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">CHỌN KHU VỰC VÀ TASK PATH</h5>
                </Card.Header>
                <Card.Body>
                  <ServerInfo
                    effectiveServerIP={effectiveServerIP}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    selectedKhu={selectedKhu}
                    currentKhuConfig={currentKhuConfig}
                    totalCells={totalCells}
                    onLogout={logout}
                  />

                  <KhuAreaSelector
                    selectedKhu={selectedKhu}
                    onKhuSelect={handleKhuSelect}
                  />

                  {selectedKhu && (
                    <div className="bg-light p-3 rounded">
                      {renderGridContent()}
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