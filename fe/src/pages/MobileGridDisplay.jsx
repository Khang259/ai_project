// src/pages/MobileGridDisplay.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/GridManagement/useAuth';
import useNodesBySelectedUser from '@/hooks/Setting/useNodesBySelectedUser';
import { useCreateTask } from '@/hooks/MobileGrid/useCreateTask';

const MobileGridDisplay = () => {
  const { currentUser, logout } = useAuth();
  const { data: nodesData, fetchData: fetchNodesData } = useNodesBySelectedUser(currentUser);
  const { createTaskHandler } = useCreateTask();

  const [selectedNodeType, setSelectedNodeType] = useState('');
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [columnsPerRow, setColumnsPerRow] = useState(4);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const nodeTypeMapping = {
    'supply': 'Cấp',
    'returns': 'Trả', 
    'both': 'Cấp&Trả'
  };

  useEffect(() => {
    if (currentUser?.username) {
      fetchNodesData();
    }
  }, [currentUser, fetchNodesData]);

  const nodeTypes = React.useMemo(() => {
    return (nodesData || []).reduce((acc, node) => {
      const type = node.node_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }, [nodesData]);

  useEffect(() => {
    if (!selectedNodeType) {
      setFilteredNodes([]);
      return;
    }
    const filtered = (nodesData || []).filter(node => node.node_type === selectedNodeType);
    setFilteredNodes(filtered);
  }, [nodesData, selectedNodeType]);

  const handleNodeTypeSelect = (nodeType) => {
    setSelectedNodeType(nodeType);
    setSelectedNode(null);
  };

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    setShowConfirmModal(true);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const handleColumnsChange = (newColumns) => {
    setColumnsPerRow(newColumns);
  };

  const getGridClasses = () => {
    const gridMap = {
      2: 'grid-cols-1 xs:grid-cols-2',
      3: 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3',
      4: 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
      5: 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
      6: 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    };
    return gridMap[columnsPerRow] || gridMap[4];
  };

  const handleConfirmSend = async () => {
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
      alert(`✅ Gửi lệnh thành công!\nNode: ${selectedNode.node_name}\nStart: ${selectedNode.start} → End: ${selectedNode.end}`);
      setShowConfirmModal(false);
      setSelectedNode(null);
    } else {
      alert(`❌ Gửi lệnh thất bại: ${result.error || 'Lỗi không xác định'}`);
    }
  };

  const handleCancelSend = () => {
    setShowConfirmModal(false);
    setSelectedNode(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
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
              <div className="flex justify-center sm:justify-end">
                <button 
                  className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors duration-200"
                  onClick={toggleSettings}
                >
                  ⚙️ Cài đặt
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-3 sm:p-6">
            {showSettings && (
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-200">
                <h3 className="text-sm sm:text-base font-semibold text-blue-800 mb-3">Cài đặt hiển thị</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="text-sm text-blue-700 font-medium">Số ô trên 1 hàng:</label>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
                          columnsPerRow === num
                            ? 'bg-[#016B61] text-white'
                            : 'bg-white text-[#016B61] border border-[#016B61] hover:bg-[#016B61] hover:text-white'
                        }`}
                        onClick={() => handleColumnsChange(num)}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Chọn loại chu trình:</h2>
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start">
                {Object.keys(nodeTypes).map((nodeType) => (
                  <button
                    key={nodeType}
                    className={`px-3 py-2 sm:px-4 sm:py-2 rounded font-medium transition-colors duration-200 text-sm sm:text-base ${
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

            {selectedNodeType && (
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
                      <div className="text-center">
                        <h3 className="font-bold text-gray-800 text-xs sm:text-sm mb-1 sm:mb-2 truncate">
                          {node.node_name || `Node ${index + 1}`}
                        </h3>
                        <div className="space-y-3 text-xs text-gray-600">
                          <div className="flex justify-center">
                            <span className="font-bold bg-primary/20 text-[#016B61]">{node.start || 0} → {node.end || 0}</span>
                          </div>
                          {node.next_start > 0 && node.next_end > 0 && (
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
          </div>
        </div>
      </div>

      {showConfirmModal && selectedNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#016B61]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận gửi lệnh</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
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