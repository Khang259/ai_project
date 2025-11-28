import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/GridManagement/useAuth';
import useNodesBySelectedUser from '@/hooks/Setting/useNodesBySelectedUser';
import { useCreateTask } from '@/hooks/MobileGrid/useCreateTask';
import { useRequestEndSlot } from '@/hooks/MobileGrid/useRequestEndSlot';
import { clearMonitor } from '@/services/taskStatus';

const RETURN_MATERIAL_TYPE = 'return_vl';
const RETURN_SPARE_TYPE = 'return_pt';
const hasNumericSuffix = (value = '') => /\d$/.test((value || '').trim());

const MobileGridDisplay = () => {
  const { currentUser, logout } = useAuth();
  const { data: nodesData, fetchData: fetchNodesData } = useNodesBySelectedUser(currentUser);
  const { createTaskHandler } = useCreateTask();
  const { requestEndSlotHandler } = useRequestEndSlot();

  const [selectedNodeType, setSelectedNodeType] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [commandLogs, setCommandLogs] = useState([]);
  const [selectedEndQr, setSelectedEndQr] = useState(null);
  const [autoNodes, setAutoNodes] = useState([]);

  const getNodeTypeLabel = (nodeType) => nodeTypeMapping[nodeType] || nodeType;
  
  const nodeTypeMapping = {
    supply: 'Trả phụ tùng',
    [RETURN_MATERIAL_TYPE]: 'Cấp phụ tùng',
    [RETURN_SPARE_TYPE]: 'Vật liệu',
    both: 'Cấp và trả hàng',
    auto: 'Tự động'
  };

  // Normalized nodes với logic chuyển đổi returns
  const normalizedNodes = React.useMemo(() => {
    return (nodesData || []).map((node) => {
      if (node?.node_type !== 'returns') return node;
      const nodeName = (node?.node_name || '').trim();
      const hasNumberEnding = hasNumericSuffix(nodeName);
      return {
        ...node,
        node_type: hasNumberEnding ? RETURN_MATERIAL_TYPE : RETURN_SPARE_TYPE
      };
    });
  }, [nodesData]);

  const LINE_COLORS = {
    'Line 1': '#5C9A94',
    'Line 2': '#5E8CCF',
    'Line 3': '#C26A6A',
    'Line 4': '#A879D9',
    'Line 5': '#D9895E',
    'Line 6': '#5CA382',
    'Line 7': '#CF6A9B',
    'Line 8': '#9A6ACF',
    'Line 9': '#5E9ECF',
    'Line 10': '#CFAF5C'
  };

  useEffect(() => {
    if (currentUser?.username) {
      fetchNodesData();
    }
  }, [currentUser, fetchNodesData]);

  const nodeTypes = React.useMemo(() => {
    return normalizedNodes.reduce((acc, node) => {
      const type = node?.node_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }, [normalizedNodes]);

  const lines = React.useMemo(() => {
    // Filter nodes theo selectedNodeType trước
    const filteredByType = selectedNodeType 
      ? normalizedNodes.filter(n => n.node_type === selectedNodeType)
      : normalizedNodes;
    
    // Sau đó count lines
    return filteredByType.reduce((acc, node) => {
      if (node.line) {
        acc[node.line] = (acc[node.line] || 0) + 1;
      }
      return acc;
    }, {});
  }, [normalizedNodes, selectedNodeType]);

  useEffect(() => {
    if (!selectedNodeType) {
      setFilteredNodes([]);
      setAutoNodes([]);
      return;
    }

    // Xử lý riêng cho auto type
    if (selectedNodeType === 'auto') {
      const autoFiltered = normalizedNodes.filter(node => node.node_type === 'auto');
      setAutoNodes(autoFiltered);
      setFilteredNodes([]);
      return;
    }

    // Xử lý cho các type khác
    const filtered = normalizedNodes.filter((node) => {
      if (node.node_type !== selectedNodeType) return false;
      return selectedLine ? node.line === selectedLine : true;
    });
    setFilteredNodes(filtered);
    setAutoNodes([]);
  }, [normalizedNodes, selectedNodeType, selectedLine]);

  const nodesByLine = React.useMemo(() => {
    return filteredNodes.reduce((acc, node) => {
      const line = node.line || 'Line khác';
      if (!acc[line]) acc[line] = [];
      acc[line].push(node);
      return acc;
    }, {});
  }, [filteredNodes]);

  const autoNodesByLine = React.useMemo(() => {
    return autoNodes.reduce((acc, node) => {
      const line = node.line;
      if (line && ['Line 2', 'Line 3', 'Line 4'].includes(line)) {
        if (!acc[line]) {
          acc[line] = [];
        }
        acc[line].push(node);
      }
      return acc;
    }, {});
  }, [autoNodes]);

  // Clear Monitor function
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
    setSelectedLine('');
    setSelectedNode(null);
    setSelectedEndQr(null);
  };

  const handleLineSelect = (line) => {
    setSelectedLine(line);
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
    setSelectedNode(autoNode);
    setSelectedEndQr(autoNode.end);
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    // Xử lý Auto QR selection
    if (selectedEndQr !== null) {
      if (selectedNode) {
        await sendClearMonitor(selectedNode);
      }
      const result = await requestEndSlotHandler(selectedEndQr, "manual_request");
      
      const logEntry = {
        id: Date.now(),
        nodeName: selectedNode?.node_name || 'Auto Node',
        line: selectedNode?.line || '-',
        typeLabel: 'auto',
        status: result.success ? 'Thành công' : 'Lỗi'
      };
      setCommandLogs((prev) => [logEntry, ...prev]);

      if (result.success) {
        setShowConfirmModal(false);
        setSelectedNode(null);
      } else {
        console.error("Gửi lệnh thất bại:", result.error || "Lỗi không xác định");
      }      
      return;
    }

    // Xử lý normal node selection
    if (!selectedNode) return;
    
    // Chuyển đổi node_type trước khi gửi
    let nodeType = selectedNode.node_type;
    if (nodeType === 'return_vl' || nodeType === 'return_pt') {
        nodeType = 'returns';
    }

    const taskData = {
      node_name: selectedNode.node_name,
      node_type: nodeType,
      owner: currentUser?.username,
      process_code: selectedNode.process_code,
      line: selectedNode.line,
      start: selectedNode.start,
      end: selectedNode.end,
      next_start: selectedNode.next_start || 0,
      next_end: selectedNode.next_end || 0
    };
    
    console.log('taskData', taskData);
    const result = await createTaskHandler(taskData);
    
    const logEntry = {
      id: Date.now(),
      nodeName: selectedNode.node_name,
      line: selectedNode.line,
      typeLabel: selectedNode.node_type,
      status: result.success ? 'Thành công' : 'Lỗi'
    };
    setCommandLogs((prev) => [logEntry, ...prev]);

    if (result.success) {
      setShowConfirmModal(false);
      setSelectedNode(null);
    } else {
      console.error(` Gửi lệnh thất bại: ${result.error || 'Lỗi không xác định'}`);
    }
  };

  const handleCancelSend = () => {
    setShowConfirmModal(false);
    setSelectedNode(null);
    setSelectedEndQr(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className=" mx-auto">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-4 sm:mb-6">
          <div className="bg-[#016B61] px-3 py-3 sm:px-6 sm:py-4 text-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <h1 className="text-lg sm:text-xl font-bold text-center sm:text-left">CALL AMR SYSTEM</h1>
              <button 
                className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3 py-2 sm:px-4 rounded font-medium transition-colors duration-200 text-sm sm:text-base"
                onClick={logout}
              >
                Đăng xuất
              </button>
            </div>
            
            <div className=" flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="text-center sm:text-left">
                <span className="bg-white/20 border border-white/30 px-2 py-1 sm:px-3 rounded text-xs sm:text-sm font-medium">
                  User: {currentUser?.username || 'Chưa đăng nhập'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-1">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-2 border border-gray-200">
              <div className="flex flex-wrap justify-between w-full ">
                {Object.keys(nodeTypes).map((nodeType) => (
                  <button
                    key={nodeType}
                    className={`px-3 py-2 sm:px-4 sm:py-2 rounded font-medium transition-colors duration-200 text-sm sm:text-base w-1/${Object.keys(nodeTypes).length} ${
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

            {selectedNodeType && selectedNodeType !== 'auto' && Object.keys(lines).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200 sm:hidden">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Chọn Line:</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(lines).sort().map((line) => {
                    const lineColor = LINE_COLORS[line];
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

            {selectedNodeType && selectedNodeType !== 'auto' && filteredNodes.length > 0 && (
              <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
                {Object.keys(nodesByLine)
                  .sort()
                  .map((line) => (
                    <div key={line} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs sm:text-base font-semibold text-white p-1 rounded-lg" style={{ backgroundColor: LINE_COLORS[line] || '#5C9A94' }}>
                          {line} 
                        </h3>
                      </div>
                      <div className="grid gap-1 max-sm:grid-cols-3 sm:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10">
                        {nodesByLine[line].map((node, index) => {
                          const backgroundcolor = LINE_COLORS[node.line] || '#5C9A94';
                          return (
                            <div
                              key={node.id || `${line}-${index}`}
                              className="rounded-lg cursor-pointer transition-colors duration-200 border-2 hover:border-[#016B61] text-white h-[80px] flex items-center justify-center w-full"
                              style={{ backgroundColor: backgroundcolor }}
                              onClick={() => handleNodeSelect(node)}
                            >
                              <div className="text-center">
                                <p className="text-xs sm:text-xl font-semibold truncate">{node.node_name}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {selectedNodeType === 'auto' && autoNodes.length > 0 && (
              <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
                {/* <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                  Danh sách lệnh tự động ({autoNodes.length}):
                </h2> */}
                <div className="space-y-4">
                  {Object.keys(autoNodesByLine)
                    .sort()
                    .map((line) => (
                      <div key={line}>
                        <h3
                          className="text-sm sm:text-base font-semibold text-white py-1 px-3 rounded-md inline-block mb-2"
                          style={{ backgroundColor: LINE_COLORS[line] || '#5C9A94' }}
                        >
                          {line}
                        </h3>
                        <div className="grid gap-1 max-sm:grid-cols-3 sm:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10">
                          {autoNodesByLine[line].map((node, index) => {
                            const isSelected = selectedEndQr === node.end && selectedNode?.id === node.id;
                            const backgroundColor = LINE_COLORS[line] || '#5C9A94';
                            return (
                              <div
                                key={node.id || `${line}-${index}`}
                                className={`rounded-lg cursor-pointer transition-all duration-200 border-2 h-[80px] flex items-center justify-center text-white ${
                                  isSelected ? 'ring-4 ring-offset-2 ring-yellow-400' : 'hover:opacity-80'
                                }`}
                                style={{ backgroundColor }}
                                onClick={() => handleAutoQrSelect(node)}
                              >
                                <div className="text-center p-1">
                                  <p className="text-xs sm:text-xl font-semibold truncate">{node.node_name}</p>
                                  {/* <p className="text-xs opacity-90">End: {node.end || 0}</p> */}
                                </div>
                              </div>
                            );
                          })}
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
                    {selectedNode.line && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Line:</span>
                        <span className="font-bold text-blue-600">{selectedNode.line}</span>
                      </div>
                    )}
                  </div>
                ) : selectedNode ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Node:</span>
                      <span className="font-bold text-gray-800">{selectedNode.node_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Loại:</span>
                      <span className="font-bold text-gray-800">{nodeTypeMapping[selectedNode.node_type]}</span>
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

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Lịch sử gửi lệnh</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên lệnh</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhiệm vụ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tình trạng</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commandLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                    Chưa có lệnh nào được gửi
                  </td>
                </tr>
              ) : (
                commandLogs.map((log, idx) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{log.nodeName}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{log.line || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{getNodeTypeLabel(log.typeLabel)}</td>
                    <td className="px-4 py-2 text-sm font-semibold">
                      {log.status === 'Thành công' ? (
                        <span className="text-green-600">Thành công</span>
                      ) : (
                        <span className="text-red-600">Lỗi</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MobileGridDisplay;