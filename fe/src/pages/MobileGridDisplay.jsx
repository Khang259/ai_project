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
  const [selectedLine, setSelectedLine] = useState('');
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const nodeTypeMapping = {
    'supply': 'Cấp',
    'returns': 'Trả', 
    'both': 'Cấp&Trả'
  };

  // Color palette cho các lines (10 màu khác nhau)
  const LINE_COLORS = {
    'Line 1': '#016B61',   // Teal Green (hiện tại)
    'Line 2': '#2563EB',   // Blue
    'Line 3': '#DC2626',   // Red
    'Line 4': '#9333EA',   // Purple
    'Line 5': '#EA580C',   // Orange
    'Line 6': '#059669',   // Emerald
    'Line 7': '#DB2777',   // Pink
    'Line 8': '#7C3AED',   // Violet
    'Line 9': '#0891B2',   // Cyan
    'Line 10': '#CA8A04',  // Yellow
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

  const lines = React.useMemo(() => {
    // Filter nodes theo selectedNodeType trước
    const filteredByType = selectedNodeType 
      ? (nodesData || []).filter(n => n.node_type === selectedNodeType)
      : (nodesData || []);
    
    // Sau đó count lines
    return filteredByType.reduce((acc, node) => {
      if (node.line) {
        acc[node.line] = (acc[node.line] || 0) + 1;
      }
      return acc;
    }, {});
  }, [nodesData, selectedNodeType]);

  useEffect(() => {
    if (!selectedNodeType || !selectedLine) {
      setFilteredNodes([]);
      return;
    }
    const filtered = (nodesData || []).filter(node => {
      const matchNodeType = node.node_type === selectedNodeType;
      const matchLine = node.line === selectedLine;
      return matchNodeType && matchLine;
    });
    setFilteredNodes(filtered);
  }, [nodesData, selectedNodeType, selectedLine]);

  const handleNodeTypeSelect = (nodeType) => {
    setSelectedNodeType(nodeType);
    setSelectedLine('');
    setSelectedNode(null);
  };

  const handleLineSelect = (line) => {
    setSelectedLine(line);
    setSelectedNode(null);
  };

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    setShowConfirmModal(true);
  };

  

  const getGridClasses = () => {
    // Mapping cột: <350px: 1; ≥350px: 2; ≥730px: 3; ≥1024px (lg): 4; ≥1280px (xl): 5
    return 'grid-cols-1 min-[350px]:grid-cols-2 min-[730px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  };

  const handleConfirmSend = async () => {
    if (!selectedNode) return;
    
    const taskData = {
      node_name: selectedNode.node_name,
      node_type: selectedNode.node_type,
      owner: currentUser?.username,
      line: selectedNode.line,  // ← BẮT BUỘC: Field line cho backend
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
              <div className="flex flex-wrap justify-between w-full ">
                {Object.keys(nodeTypes).map((nodeType) => (
                  <button
                    key={nodeType}
                    className={`px-3 py-2 sm:px-4 sm:py-2 rounded font-medium transition-colors duration-200 text-sm sm:text-base w-2/7 ${
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

            {selectedNodeType && Object.keys(lines).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Chọn Line:</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(lines).sort().map((line) => {
                    const lineColor = LINE_COLORS[line] || '#016B61';
                    return (
                      <button
                        key={line}
                        className={`px-3 py-2 sm:px-4 sm:py-2 rounded font-medium transition-colors duration-200 text-sm sm:text-base ${
                          selectedLine === line 
                            ? 'text-white' 
                            : 'bg-white border-2 hover:text-white'
                        }`}
                        style={
                          selectedLine === line
                            ? { backgroundColor: lineColor }
                            : { color: lineColor, borderColor: lineColor }
                        }
                        onMouseEnter={(e) => {
                          if (selectedLine !== line) {
                            e.currentTarget.style.backgroundColor = lineColor;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedLine !== line) {
                            e.currentTarget.style.backgroundColor = 'white';
                          }
                        }}
                        onClick={() => handleLineSelect(line)}
                      >
                        {line} ({lines[line]})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedNodeType && selectedLine && (
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
                  {selectedNode.line && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Line:</span>
                      <span className="font-bold text-blue-600">{selectedNode.line}</span>
                    </div>
                  )}
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