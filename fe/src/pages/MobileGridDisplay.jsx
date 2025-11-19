// src/pages/MobileGridDisplay.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/GridManagement/useAuth';
import useNodesBySelectedUser from '@/hooks/Setting/useNodesBySelectedUser';
import { useCreateTask } from '@/hooks/MobileGrid/useCreateTask';
import { useRequestEndSlot } from '@/hooks/MobileGrid/useRequestEndSlot';
import { clearMonitor } from '@/services/taskStatus';

const MobileGridDisplay = () => {
  const { currentUser, logout } = useAuth();
  const { data: nodesData, fetchData: fetchNodesData } = useNodesBySelectedUser(currentUser);
  const { createTaskHandler } = useCreateTask();
  const { requestEndSlotHandler } = useRequestEndSlot();

  const [selectedNodeType, setSelectedNodeType] = useState('');
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEndQr, setSelectedEndQr] = useState(null);
  const [autoNodes, setAutoNodes] = useState([]);

  const nodeTypeMapping = {
    'supply': 'Cấp',
    'returns': 'Trả', 
    'both': 'Cấp&Trả',
    'auto': 'Lệnh vật liệu'
  };

  useEffect(() => {
    if (currentUser?.username) {
      fetchNodesData();
    }
  }, [currentUser, fetchNodesData]);

  // Define fixed order of node types
  const orderedNodeTypes = ['supply', 'returns', 'both', 'auto'];

  const nodeTypes = React.useMemo(() => {
    const types = (nodesData || []).reduce((acc, node) => {
      const type = node.node_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    // Ensure all standard types exist in the correct order
    const orderedTypes = {};
    orderedNodeTypes.forEach(type => {
      orderedTypes[type] = types[type] || 0;
    });
    
    return orderedTypes;
  }, [nodesData]);

  useEffect(() => {
    if (!selectedNodeType) {
      setFilteredNodes([]);
      setAutoNodes([]);
      return;
    }
    
    // For 'auto' type, filter auto nodes
    if (selectedNodeType === 'auto') {
      const autoFiltered = (nodesData || []).filter(node => node.node_type === 'auto');
      setAutoNodes(autoFiltered);
      setFilteredNodes([]);
      return;
    }
    
    // For other types, filter normally
    const filtered = (nodesData || []).filter(node => node.node_type === selectedNodeType);
    setFilteredNodes(filtered);
    setAutoNodes([]);
  }, [nodesData, selectedNodeType]);

  const sendClearMonitor = useCallback(
    async (nodePayload) => {
      if (!nodePayload) {
        console.log("[MobileGridDisplay] sendClearMonitor - nodePayload is empty");
        return;
      }
      
      const groupId = currentUser?.group_id ?? localStorage.getItem("group_id");
      console.log("[MobileGridDisplay] sendClearMonitor - group_id:", groupId);
      
      if (!groupId) {
        console.warn("[MobileGridDisplay] Missing group_id, skip clear-monitor");
        return;
      }
      
      const payload = {
        group_id: String(groupId),
        ...nodePayload,
      };
      
      console.log("[MobileGridDisplay] sendClearMonitor - Sending payload:", payload);

      try {
        const result = await clearMonitor(payload);
        console.log("[MobileGridDisplay] sendClearMonitor - Result:", result);
        
        if (!result.success) {
          console.error("[MobileGridDisplay] clearMonitor failed", result.error);
        } else {
          console.log("[MobileGridDisplay] clearMonitor SUCCESS - WebSocket should broadcast now");
        }
      } catch (error) {
        console.error("[MobileGridDisplay] clearMonitor error", error);
      }
    },
    [currentUser?.group_id]
  );

  const handleNodeTypeSelect = (nodeType) => {
    setSelectedNodeType(nodeType);
    setSelectedNode(null);
    setSelectedEndQr(null);
  };

  const handleNodeSelect = (node) => {
    console.log("[MobileGridDisplay] handleNodeSelect - Selected node:", node);
    setSelectedNode(node);
    setShowConfirmModal(true);
    setSelectedEndQr(null);
  };

  const handleAutoQrSelect = (autoNode) => {
    console.log("[MobileGridDisplay] handleAutoQrSelect - Selected auto node:", autoNode);
    // Store both the node info and end_qr for display and API call
    setSelectedNode(autoNode);
    setSelectedEndQr(autoNode.end);
    setShowConfirmModal(true);
  };

  

  const getGridClasses = () => {
    // Mapping cột: <350px: 1; ≥350px: 2; ≥730px: 3; ≥1024px (lg): 4; ≥1280px (xl): 5
    return 'grid-cols-1 min-[350px]:grid-cols-2 min-[730px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  };

  const handleConfirmSend = async () => {
    // Handle Auto QR selection
    if (selectedEndQr !== null) {
      if (selectedNode) {
        await sendClearMonitor(selectedNode);
      }
      const result = await requestEndSlotHandler(selectedEndQr, "manual_request");
      
      if (result.success) {
        alert(`Yêu cầu thành công!`);
        setShowConfirmModal(false);
        setSelectedEndQr(null);
      } else {
        alert(`Yêu cầu thất bại!\n${result.error || 'Lỗi không xác định'}`);
      }
      return;
    }

    // Handle normal node selection
    if (!selectedNode) return;
    
    const taskData = {
      node_name: selectedNode.node_name,
      node_type: selectedNode.node_type,
      owner: currentUser?.username,
      start: selectedNode.start,
      end: selectedNode.end,
      next_start: selectedNode.next_start || 0,
      next_end: selectedNode.next_end || 0
    };
    console.log('taskData', taskData);
    const result = await createTaskHandler(taskData);
    
    if (result.success) {
      alert(` Gửi lệnh thành công!\nNode: ${selectedNode.node_name}\nStart: ${selectedNode.start} → End: ${selectedNode.end}`);
      setShowConfirmModal(false);
      setSelectedNode(null);
    } else {
      alert(` Gửi lệnh thất bại: ${result.error || 'Lỗi không xác định'}`);
    }
  };

  const handleCancelSend = () => {
    setShowConfirmModal(false);
    setSelectedNode(null);
    setSelectedEndQr(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4">
      <div className=" mx-auto">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-4 sm:mb-6">
          <div className="bg-[#016B61] px-3 py-3 sm:px-6 sm:py-4 text-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <h1 className="text-lg sm:text-xl font-bold text-center sm:text-left">MOBILE GRID DISPLAY</h1>
              <button 
                className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3 py-2 sm:px-4 rounded font-medium transition-colors duration-200 text-sm sm:text-base"
                onClick={logout}
              >
                Đăng xuất
              </button>
            </div>
            
            <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="text-center sm:text-left">
                <span className="bg-white/20 border border-white/30 px-2 py-1 sm:px-3 rounded text-xs sm:text-sm font-medium">
                  User: {currentUser?.username || 'Chưa đăng nhập'}
                </span>
              </div>
              
            </div>
          </div>
          
          <div className="p-3 sm:p-6">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Chọn loại chu trình:</h2>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {Object.keys(nodeTypes)
                  .filter(nodeType => nodeType === 'auto' || nodeTypes[nodeType] > 0)
                  .map((nodeType) => (
                    <button
                      key={nodeType}
                      className={`px-3 py-2 sm:px-4 sm:py-2 rounded font-medium transition-colors duration-200 text-sm sm:text-base flex-1 min-w-[100px] ${
                        selectedNodeType === nodeType 
                          ? 'bg-[#016B61] text-white' 
                          : 'bg-white text-[#016B61] border-2 border-[#016B61] hover:bg-[#016B61] hover:text-white'
                      }`}
                      onClick={() => handleNodeTypeSelect(nodeType)}
                    >
                      {nodeTypeMapping[nodeType] || nodeType} ({nodeTypes[nodeType]})
                    </button>
                  ))}
              </div>
            </div>

            {selectedNodeType && selectedNodeType !== 'auto' && (
              <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                  Danh sách nodes ({filteredNodes.length}):
                </h2>
                <div className={`grid gap-2 sm:gap-3 ${getGridClasses()}`}>
                  {filteredNodes.map((node, index) => (
                    <div 
                      key={node.id || index}
                      className={`bg-gray-50 rounded-lg p-2 sm:p-3 cursor-pointer transition-colors duration-200 border-2 ${
                        selectedNode?.id === node.id 
                          ? 'border-[#016B61] bg-[#016B61]/10' 
                          : 'border-gray-200 hover:border-[#016B61] hover:bg-gray-100'
                      }`}
                      onClick={() => handleNodeSelect(node)}
                    >
                      <div className="text-center h-[180px]">
                        <h3 className="font-bold text-gray-800 text-xl sm:text-2xl mb-1 sm:mb-2 truncate">
                          {node.node_name || `Node ${index + 1}`}
                        </h3>
                        <div className="space-y-3 text-3xl text-gray-600">
                          <div className="flex justify-center">
                            <span className="font-bold bg-primary/20 text-[#016B61]">{node.start || 0} → {node.end || 0}</span>
                          </div>
                          
                          {selectedNodeType === 'both' && (
                            <div className="flex justify-center">
                              <span className="font-bold text-[#016B61]">{node.next_start} → {node.next_end}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedNodeType === 'auto' && (
              <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                  Danh sách lệnh vật liệu ({autoNodes.length}):
                </h2>
                <div className={`grid gap-2 sm:gap-3 ${getGridClasses()}`}>
                  {autoNodes.map((node, index) => (
                    <div 
                      key={node.id || index}
                      className={`bg-gray-50 rounded-lg p-3 sm:p-4 cursor-pointer transition-colors duration-200 border-2 ${
                        selectedEndQr === node.end && selectedNode?.id === node.id
                          ? 'border-[#016B61] bg-[#016B61]/10' 
                          : 'border-gray-200 hover:border-[#016B61] hover:bg-gray-100'
                      }`}
                      onClick={() => handleAutoQrSelect(node)}
                    >
                      <div className="text-center">
                        <h3 className="font-bold text-gray-800 text-xl sm:text-2xl">
                          {node.node_name || `Node ${index + 1}`}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          End: {node.end || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirmModal && (selectedNode || selectedEndQr !== null) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#016B61]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl"></span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {selectedEndQr !== null ? 'Xác nhận yêu cầu cấp hàng' : 'Xác nhận gửi lệnh'}
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                {selectedEndQr !== null && selectedNode ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Node:</span>
                      <span className="font-bold text-gray-800">{selectedNode.node_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">End QR:</span>
                      <span className="font-bold text-gray-800">{selectedEndQr}</span>
                    </div>
                    {/* <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Trạng thái:</span>
                      <span className="font-bold text-green-600">Empty (Sẵn sàng nhận hàng)</span>
                    </div> */}
                  </div>
                ) : selectedNode ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Node:</span>
                      <span className="font-bold text-gray-800">{selectedNode.node_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Loại:</span>
                      <span className="font-bold text-gray-800">{nodeTypeMapping[selectedNode.node_type] || selectedNode.node_type}</span>
                    </div>
                    <div className="flex justify-center">
                      <span className="font-bold text-[#016B61] text-lg">{selectedNode.start} → {selectedNode.end}</span>
                    </div>
                    {selectedNode.next_start > 0 && selectedNode.next_end > 0 && (
                      <div className="flex justify-center">
                        <span className="font-bold text-[#016B61] text-lg">{selectedNode.next_start} → {selectedNode.next_end}</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded font-medium transition-colors duration-200"
                  onClick={handleCancelSend}
                >
                  Hủy
                </button>
                <button
                  className="flex-1 bg-[#016B61] hover:bg-[#014d47] text-white py-2 px-4 rounded font-medium transition-colors duration-200"
                  onClick={handleConfirmSend}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileGridDisplay;