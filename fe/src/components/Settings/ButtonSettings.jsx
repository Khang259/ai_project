import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Plus, Grid3x3, User, Upload, Settings, Download } from 'lucide-react';
import GridPreview from './GridPreview';
import CellNameEditor from './CellNameEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useUsers } from '../../hooks/Users/useUsers';
import useNodesBySelectedUser from '../../hooks/Setting/useNodesBySelectedUser';
import useNodeSettingsLazy from '../../hooks/Setting/useNodeSettingsLazy';
import { useTranslation } from "react-i18next"; 
const ButtonSettings = () => {
  const { t } = useTranslation();

  const [columnsWantToShow, setColumnsWantToShow] = useState(5); // Cột muốn hiển thị trong Grid Preview có thể tùy chỉnh
  
  // Mapping cho các giá trị node_type
  const nodeTypeMapping = {
    'supply': t('settings.supply'),
    'returns': t('settings.returns'), 
    'both': t('settings.both')
  };
  
  // State cho form thêm node mới
  const [newNodeData, setNewNodeData] = useState({
    node_name: "",
    nodeType: "",
    start: 0,
    end: 0,
    next_start: 0,
    next_end: 0
  });
  const {users, usersLoading, usersError } = useUsers();
  const [selectedUser, setSelectedUser] = useState({});
  const [selectedNodeType, setSelectedNodeType] = useState();
  const [dataFilteredByNodes, setdataFilteredByNodes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    data,
    fetchData,
  } = useNodesBySelectedUser(selectedUser);
  const {
    addNode,
    deleteNode,
    updateBatch,
  } = useNodeSettingsLazy(selectedUser);

  // ===========================================
  // 2. EFFECTS VÀ COMPUTED VALUES
  // ===========================================
  
  // Fetch data khi chọn user
  useEffect(() => {
    if (selectedUser?.id) fetchData();
  }, [selectedUser, fetchData]);

  // Định nghĩa các chế độ cố định
  const fixedNodeTypes = ["Cấp", "Trả", "Cấp&Trả"];
  
  // Tính nodeTypes và tổng số theo loại từ data thô
  const nodeTypes = React.useMemo(() => {
    return (data || []).reduce((acc, n) => {
      const t = n.node_type || 'unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
  }, [data]);

  // Tính tổng số cells của nodeType được chọn
  const totalCellsSelectedType = React.useMemo(() => {
    return nodeTypes[selectedNodeType] || dataFilteredByNodes.length;
  }, [nodeTypes, selectedNodeType, dataFilteredByNodes.length]);

  // Lọc data theo selectedNodeType và cập nhật dữ liệu cho GridPreview
  useEffect(() => {
    if (!selectedNodeType) {
      setdataFilteredByNodes(data); // Hiển thị toàn bộ data khi chưa chọn loại
      return;
    }
    const next = (data || []).filter(n => n.node_type === selectedNodeType);
    setdataFilteredByNodes(next);
  }, [data, selectedNodeType,fetchData]);
  // ===========================================
  // 3. HANDLERS CHO CHỌN USER
  // ===========================================
  
  // Chọn người dùng khi đã có dữ liệu
  const handleUserSelect = (userId) => {
    const user = users.find(user => user.id === userId);
    if (user) {
      setSelectedUser({
        id: userId,
        username: user.username,
        role: user.is_superuser ? "Administrator" : "User",
      });
    }
  };

  // ===========================================
  // 4. HANDLERS CHO CHỌN NODETYPE
  // ===========================================
  
  // Chọn nodeType khi đã có dữ liệu
  const handleNodeTypeChange = (newNodeType) => {
    setSelectedNodeType(newNodeType);
  };

  // ===========================================
  // 5. HANDLERS CHO TÁC VỤ ADD NODE
  // ===========================================
  
  // Hiển thị form thêm node
  const showAddNodeForm = () => {
    setShowAddForm(true);
  };

  // Xác nhận thêm node mới
  const handleConfirmAddNode = async () => {
    if (!newNodeData.node_name || !newNodeData.start || !newNodeData.end) {
      alert(t('settings.pleaseFillInAllRequiredInformation'));
      return;
    }
    
    // Gọi API tạo node qua hook để có id từ server
    const payload = {
      node_name: newNodeData.node_name,
      node_type: selectedNodeType || newNodeData.nodeType,
      owner: selectedUser.username,
      start: newNodeData.start,
      end: newNodeData.end,
      next_start: newNodeData.next_start || 0,
      next_end: newNodeData.next_end || 0,
    };
    console.log("payload", payload);
    const res = await addNode(payload);
    if (!res.success) { 
      console.error(t('settings.errorResponse'), res);
      alert(t('settings.createNodeFailed', {status: res.status, error: res.error || t('settings.unknownError')}))
    }
    if (res.status === 201 || res.status === 200) {
      const newNode = res.data; 
      alert(t('settings.successCreateNode', {nodeName: newNode.node_name, nodeId: newNode.id}));
    }
    
    await fetchData();
    
    // Đóng form và reset dữ liệu
    setShowAddForm(false);
    setNewNodeData({
      node_name: "",
      nodeType: "",
      start: 0,
      end: 0,
      next_start: 0,
      next_end: 0
    });
  };

  // Tăng số ô (giữ nguyên để tương thích với code cũ)
  const increaseCells = () => {
    showAddNodeForm();
  };

  // ===========================================
  // 6. HANDLERS CHO TÁC VỤ DELETE NODE
  // ===========================================
  
  // Xóa ô có confirm UI, sau đó gọi hook
  const handleDeleteCell = async (cellId) => {
    const nodeToDelete = dataFilteredByNodes.find(node => node.id === cellId);
    if (!nodeToDelete) return;
    if (confirm(t('settings.confirmDeleteCell', {nodeName: nodeToDelete.node_name}))) {
      const res = await deleteNode(cellId);
      if (res?.success) {
        fetchData();
      }
    }
  };

  // ===========================================
  // 7. HANDLERS CHO TÁC VỤ UPDATE NODE (IMPORT EXCEL)
  // ===========================================
  
  // Import Excel bằng SheetJS (xlsx)
  const handleExcelImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          alert(t('settings.fileDoesNotHaveAnySheet'));
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        console.log('=== ROWS ===');
        console.log(rows);
        if (!rows || rows.length === 0) {
          alert(t('settings.noDataToImport'));
          return;
        }

        // Chuẩn hóa key header về lowercase, trim
        const normalisedRows = rows.map((row) => {
          const obj = {};
          Object.keys(row).forEach((key) => {
            const normKey = String(key).trim().toLowerCase();
            obj[normKey] = row[key];
          });
          return obj;
        });

        const requiredHeaders = ['node_name', 'node_type', 'start', 'end', 'next_start', 'next_end'];
        const firstRowKeys = Object.keys(normalisedRows[0] || {});
        const isValid = requiredHeaders.every((h) => firstRowKeys.includes(h));
        if (!isValid) {
          alert(t('settings.invalidHeader', {headers: requiredHeaders.join(', ')}));
          return;
        }
        // Tạo danh sách node từ file và hợp nhất vào allNodes
        const importedNodes = normalisedRows.map((r, idx) => {
          const nodeName = String(r.node_name ?? '').trim();
          const nodeType = String(r.node_type ?? '').trim();
          const existing = (data || []).find((n) => n.node_name === nodeName && n.node_type === nodeType);
          const isBoth = nodeType === 'both';
          return {
            id: existing ? existing.id : String(idx),
            node_name: nodeName,
            node_type: nodeType,
            owner: selectedUser?.username,
            start: Number(r.start),
            end: Number(r.end),
            next_start: isBoth ? (Number(r.next_start) || 0) : 0,
            next_end: isBoth ? (Number(r.next_end) || 0) : 0,
          };
        });

        // Merge trên toàn bộ data của user: base = data, import ghi đè
        const mergedMap = new Map();
        (data || []).forEach((n) => {
          const key = `${n.node_name}__${n.node_type}`;
          mergedMap.set(key, n);
        });
        importedNodes.forEach((n) => {
          const key = `${n.node_name}__${n.node_type}`;
          mergedMap.set(key, n);
        });
        const mergedNodes = Array.from(mergedMap.values());

        // Kiểm tra node_type hợp lệ trước khi import
        const validTypes = ['supply', 'returns', 'both'];
        const invalidNode = mergedNodes.find(node => 
          node && node.node_type && !validTypes.includes(node.node_type)
        );
        if (invalidNode) {
          alert(t('settings.invalidNodeType', {nodeType: invalidNode.node_type, nodeName: invalidNode.node_name}));
          event.target.value = '';
          return;
        }

        // Gọi saveBatchWithNodes để gửi API ngay sau khi import
        // Chỉ gửi các trường cần thiết, loại bỏ created_at, updated_at và các trường khác
        const cleanedNodes = mergedNodes
          .filter(node => node && node.node_name && node.node_type) // Lọc bỏ phần tử rỗng/undefined
          .map(node => ({
            id: node.id,
            node_name: node.node_name,
            node_type: node.node_type,
            owner: node.owner,
            start: node.start,
            end: node.end,
            next_start: node.next_start,
            next_end: node.next_end
          }));
        const payload = {'nodes': cleanedNodes};
        console.log("payload", payload);
        const result = await updateBatch(payload);
        if (result?.success) {
          await fetchData();
          alert(t('settings.successImportAndSave', {count: importedNodes.length}));
        } else {
          alert(t('settings.successImportButSaveFailed', {error: result?.error || t('settings.unknownError')}));
        }

        event.target.value = '';
      } catch (error) {
        console.error(error);
        alert(t('settings.errorReadingExcelFile', {error: error.message}));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpdateBatch = async (nodes) => {
    const cleanedNodes = nodes.map(node => ({
      id: node.id,
      node_name: node.node_name,
      node_type: node.node_type,
      owner: node.owner,
      start: node.start,
      end: node.end,
      next_start: node.next_start,
      next_end: node.next_end
    }));
    const payload = {'nodes': cleanedNodes};
    console.log("payload", payload);
    const result = await updateBatch(payload);
    if (result?.success) {
      alert(t('settings.successUpdate'));
      await fetchData();
    }
  };


  const handleExportData = () => {
    let exportData;
    let filename;

    // Nếu có dữ liệu thật, export data
    if (data && data.length > 0) {
      exportData = data.map(node => ({
        node_name: node.node_name,
        node_type: node.node_type,
        start: node.start,
        end: node.end,
        next_start: node.next_start || 0,
        next_end: node.next_end || 0
      }));
      
      const timestamp = new Date().toISOString().split('T')[0];
      filename = `nodes_${selectedUser?.username || 'user'}_${timestamp}.xlsx`;
    } 
    // Nếu không có dữ liệu, export mẫu
    else {
      exportData = [
        {
          node_name: 'Tên ô cấp',
          node_type: 'supply',
          start: "100(Optional)",
          end: 200,
          next_start: "100(Optional)",
          next_end: "100(Optional)"
        },
        {
          node_name: 'Tên ô trả',
          node_type: 'returns',
          start: 300,
          end: 400,
          next_start: 0,
          next_end: 0
        },
        {
          node_name: 'Tên cấp&trả',
          node_type: 'both',
          start: 500,
          end: 600,
          next_start: 700,
          next_end: 800
        }
      ];
      
      filename = 'mau_import_nodes.xlsx';
    }

    // Tạo và tải file
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nodes');
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="space-y-6">
      {/* Grid Configuration */}
      <Card className="border-2 glass">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5 text-primary" />
                {t('settings.buttonSettings')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {/* Dropdown Menu for quick select user */}
              <div className="flex items-center gap-2">
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2 glass">
                  <User className="h-4 w-4 glass" />
                  {selectedUser?.username || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" 
                className="w-64 glass" 
                style={{ 
                  backgroundColor: "rgba(139,92,246,0.25)", 
                  border: "1px solid rgba(255,255,255,0.25)" 
                  }}
                >
                <div className="px-2 py-1.5 text-sm font-semibold text-white">
                  {t('settings.selectUser')}
                </div>
                {usersLoading ? (
                  <div className="px-2 py-1.5 text-sm text-white">
                    {t('settings.loadingUserList')}
                  </div>
                ) : usersError ? (
                  <div className="px-2 py-1.5 text-sm text-red-500">
                    {t('settings.error', {error: usersError})}
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: users.length > 4 ? "200px" : "auto",
                      overflowY: users.length > 4 ? "auto" : "visible",
                      color: "white",
                      backgroundColor: "rgba(255,255,255,0.25)",
                      borderRadius: "8px"
                    }}
                  >
                    {users.map((user) => (
                      <DropdownMenuItem 
                        key={user.id}
                        onClick={() => handleUserSelect(user.id)}
                        className="flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-white" />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.is_superuser ? "Administrator" : "User"}
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
            </div>
          </div>
        </CardHeader>

        {/* Chu trình */}
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nodeType" className="text-sm font-medium">
              {t('settings.cycleMode')}
            </Label>
            <Select value={selectedNodeType} onValueChange={handleNodeTypeChange}>
              <SelectTrigger id="nodeType" className="text-lg">
                <SelectValue placeholder={t('settings.selectCycleMode')}>
                  {selectedNodeType ? nodeTypeMapping[selectedNodeType] || selectedNodeType : "Chọn chế độ"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent 
                className="glass" 
                style={{ 
                backgroundColor: "rgba(139,92,246,0.25)", 
                // border: "1px solid rgba(255,255,255,0.25)" 
                }}>
                {Object.keys(nodeTypes).map((nodeType) => (
                  <SelectItem key={nodeType} value={nodeType}>
                    {nodeTypeMapping[nodeType] }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-3 flex-col">
              <Label className="text-sm font-medium">{t('settings.totalCells')}:</Label>
              <div className="text-4xl font-bold font-mono text-white">{totalCellsSelectedType}</div>
            </div>
            <div className="flex items-center gap-3 flex-col">
              <Label className="text-sm font-medium">{t('settings.createNew')}:</Label>
              <Button variant="ghost" size="icon" onClick={increaseCells}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Form thêm node mới */}
          {showAddForm && (
            <div className="pt-4 border-t">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">{t('settings.addNewNode')}</CardTitle>
                  <CardDescription className="text-blue-600">
                    {t('settings.enterInformationForNewNode')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Chu trình - chỉ hiển thị khi chưa có selectedNodeType */}
                  {!selectedNodeType && (
                    <div className="space-y-2">
                      <Label htmlFor="nodeType" className="text-sm font-medium">
                        {t('settings.cycleMode')} *
                      </Label>
                      <select
                        id="nodeType"
                        value={newNodeData.nodeType || ""}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, nodeType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('settings.selectCycleMode')}</option>
                        <option value="supply">{t('settings.supply')}</option>
                        <option value="returns">{t('settings.returns')}</option>
                        <option value="both">{t('settings.both')}</option>
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 grid-rows-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="node_name" className="text-sm font-medium">
                        {t('settings.nodeName')} *
                      </Label>
                      <input
                        id="node_name"
                        type="text"
                        value={newNodeData.node_name}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, node_name: e.target.value }))}
                        placeholder={t('settings.enterNodeName')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2  row-start-2">
                      <Label htmlFor="start" className="text-sm font-medium">
                        {t('settings.start')} *
                      </Label>
                      <input
                        id="start"
                        type="number"
                        value={newNodeData.start}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, start: parseInt(e.target.value) || null }))}
                        placeholder={t('settings.enterStartValue')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2 row-start-2">
                      <Label htmlFor="end" className="text-sm font-medium">
                        {t('settings.end')} *
                      </Label>
                      <input
                        id="end"
                        type="number"
                        value={newNodeData.end}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, end: parseInt(e.target.value) || null }))}
                        placeholder={t('settings.enterEndValue')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {(selectedNodeType === 'both') && (
                      <>
                        <div className="space-y-2 row-start-3">
                          <Label htmlFor="next_start" className="text-sm font-medium">
                            {t('settings.nextStart')} (Tùy chọn)
                          </Label>
                          <input
                            id="next_start"
                            type="number"
                            value={newNodeData.next_start}
                            onChange={(e) => setNewNodeData(prev => ({ ...prev, next_start: parseInt(e.target.value) || null }))}
                            placeholder={t('settings.enterNextStartValue')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-2 row-start-3">
                          <Label htmlFor="next_end" className="text-sm font-medium">
                            {t('settings.nextEnd')} (Tùy chọn)
                          </Label>
                          <input
                            id="next_end"
                            type="number"
                            value={newNodeData.next_end}
                            onChange={(e) => setNewNodeData(prev => ({ ...prev, next_end: parseInt(e.target.value) || null }))}
                            placeholder={t('settings.enterNextEndValue')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddForm(false);
                        setNewNodeData({
                          node_name: "",
                          nodeType: "",
                          start: 0,
                          end: 0,
                          next_start: 0,
                          next_end: 0
                        });
                      }}
                    >
                      {t('settings.cancel')}
                    </Button>
                    <Button 
                      onClick={handleConfirmAddNode}
                      disabled={!newNodeData.node_name || !newNodeData.start || !newNodeData.end || (!selectedNodeType && !newNodeData.nodeType)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {t('settings.confirm')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="pt-4 border-t">
            <GridPreview columns={columnsWantToShow} cells={dataFilteredByNodes} onDeleteCell={handleDeleteCell} selectedNodeType={selectedNodeType} />
          </div>
        </CardContent>
      </Card>
      {/*Cell Name Configuration */}
      <Card className="border-2 glass">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('settings.cellNameEditor')}</CardTitle>
            </div>
            <div className="flex flex-col items-end gap-2">
              <input
                id="excel-import"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleExcelImport}
              />
              <div className="flex flex-row items-end gap-2">
              {/* Nút Export Excel */}
              <Button
              className="glass"
                onClick={handleExportData}
                size="sm"
                title={data && data.length > 0 ? t('settings.exportCurrentData') : t('settings.downloadTemplate')}
              >
                <Download className="h-4 w-4 mr-2 glass" />
                {data && data.length > 0 ? t('settings.exportExcel') : t('settings.downloadExcelTemplate')}
              </Button>

              {/* Nút Import Excel */}
              {(() => {
                if (!selectedUser?.id) {
                  return (
                    <div className="relative inline-block group">
                      <Button
                        className="glass"
                        disabled
                        onClick={() => {}}
                        size="sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {t('settings.importExcel')}
                      </Button>
                      <div className="pointer-events-none absolute -top-8 left-0 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 transition-opacity group-hover:opacity-100 border shadow-sm">
                        {t('settings.selectUserBeforeImportExcel')}
                      </div>
                    </div>
                  );
                }
                return (
                  <Button
                    className="glass"
                    onClick={() => document.getElementById('excel-import').click()}
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('settings.importExcel')}
                  </Button>
                );
              })()}
              </div>
              <div className="text-xs text-white text-right">
                {t('settings.format')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-white">
          <CellNameEditor 
            cells={dataFilteredByNodes} 
            handleUpdateBatch={handleUpdateBatch} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ButtonSettings;