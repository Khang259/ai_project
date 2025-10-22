import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Plus, Grid3x3, User, Upload, Settings } from 'lucide-react';
import GridPreview from './GridPreview';
import CellNameEditor from './CellNameEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useUsers } from '../../hooks/Users/useUsers';
import useNodesBySelectedUser from '../../hooks/Setting/useNodesBySelectedUser';
import useNodeSettingsLazy from '../../hooks/Setting/useNodeSettingsLazy';

const ButtonSettings = () => {
  // ===========================================
  // 1. KHAI BÁO STATE VÀ HOOKS
  // ===========================================
  const [columnsWantToShow, setColumnsWantToShow] = useState(5); // Cột muốn hiển thị trong Grid Preview có thể tùy chỉnh
  
  // Mapping cho các giá trị node_type
  const nodeTypeMapping = {
    'supply': 'Cấp',
    'returns': 'Trả', 
    'both': 'Cấp&Trả'
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
  const [filteredNodes, setFilteredNodes] = useState([]);
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
  useEffect(() => {
    setFilteredNodes(data || []);
  }, [data]);


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
    return nodeTypes[selectedNodeType] || filteredNodes.length;
  }, [nodeTypes, selectedNodeType, filteredNodes.length]);

  // Lọc data theo selectedNodeType và cập nhật dữ liệu cho GridPreview
  useEffect(() => {
    if (!selectedNodeType) {
      setFilteredNodes([]);
      return;
    }
    const next = (data || []).filter(n => n.node_type === selectedNodeType);
    setFilteredNodes(next);
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
      alert("Vui lòng điền đầy đủ thông tin bắt buộc (Tên Node, Start, End)");
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
      console.error("Phản hồi lỗi:", res);
      alert(`Tạo node thất bại (${res.status}): ${res.error || 'Lỗi không xác định'}`)
    }
    if (res.status === 201 || res.status === 200) {
      const newNode = res.data; 
      alert(`Thành công! Đã tạo node "${newNode.node_name}" (ID: ${newNode.id})`);
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
    const nodeToDelete = filteredNodes.find(node => node.id === cellId);
    if (!nodeToDelete) return;
    if (confirm(`Bạn có chắc chắn muốn xóa ô ${nodeToDelete.node_name}?`)) {
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
          alert('File không có sheet nào.');
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        console.log('=== ROWS ===');
        console.log(rows);
        if (!rows || rows.length === 0) {
          alert('Không có dữ liệu để import.');
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
          alert('Header không hợp lệ. Cần các cột: node_name, node_type, start, end, next_start, next_end');
          return;
        }
        // Tạo danh sách node từ file và hợp nhất vào allNodes
        const importedNodes = normalisedRows.map((r, idx) => {
          const nodeName = String(r.node_name ?? '').trim();
          const nodeType = String(r.node_type ?? '').trim();
          const existing = filteredNodes.find((n) => n.node_name === nodeName && n.node_type === nodeType);
          return {
            id: existing ? existing.id : String(idx) ,
            node_name: nodeName,
            node_type: nodeType,
            owner:  r.owner || selectedUser.username ,
            start: Number(r.start) ,
            end: Number(r.end),
            next_start: Number(r.next_start) || 0,
            next_end: Number(r.next_end) || 0,
          };
        });

        const mergedMap = new Map();
        // Ưu tiên dữ liệu mới: put imported first, then fill others not overridden
        importedNodes.forEach((n) => {
          const key = `${n.node_name}__${n.node_type}`;
          mergedMap.set(key, n);
        });
        filteredNodes.forEach((n) => {
          const key = `${n.node_name}__${n.node_type}`;
          if (!mergedMap.has(key)) mergedMap.set(key, n);
        });
        const mergedNodes = Array.from(mergedMap.values());

        // Gọi saveBatchWithNodes để gửi API ngay sau khi import
        // Chỉ gửi các trường cần thiết, loại bỏ created_at, updated_at và các trường khác
        const cleanedNodes = mergedNodes.map(node => ({
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
        console.log("result", result);
        console.log("result.data", result.data);
        if (result?.success) {
          setFilteredNodes(mergedNodes);
          alert(`Đã import và lưu ${importedNodes.length} dòng thành công!`);
          await fetchData();
        } else {
          alert(`Import thành công nhưng lưu thất bại: ${result?.error || 'Unknown error'}`);
        }

        event.target.value = '';
      } catch (error) {
        console.error(error);
        alert('Lỗi khi đọc file Excel: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpdateBatch = async (nodes) => {
    // Chỉ gửi các trường cần thiết, loại bỏ created_at, updated_at và các trường khác
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
    const result = await updateBatch(payload);
    if (result?.success) {
      alert("Cập nhật thành công");
      await fetchData();
    }
  };

  // ===========================================
  // 8. GIAO DIỆN NGƯỜI DÙNG (UI)
  // ===========================================
  return (
    <div className="space-y-6">
      {/* Grid Configuration */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5 text-primary" />
                Cấu Hình Nút
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {/* Dropdown Menu for quick select user */}
              <div className="flex items-center gap-2">
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {selectedUser?.username || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  Chọn User
                </div>
                {usersLoading ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Đang tải danh sách người dùng...
                  </div>
                ) : usersError ? (
                  <div className="px-2 py-1.5 text-sm text-red-500">
                    Lỗi: {usersError}
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: users.length > 4 ? "200px" : "auto",
                      overflowY: users.length > 4 ? "auto" : "visible",
                    }}
                  >
                    {users.map((user) => (
                      <DropdownMenuItem 
                        key={user.id}
                        onClick={() => handleUserSelect(user.id)}
                        className="flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-muted-foreground">
                              {user?.roles}
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
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Cài đặt
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  Cài đặt hiển thị
                </div>
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Số ô trên 1 hàng:</Label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={columnsWantToShow}
                      onChange={(e) => setColumnsWantToShow(parseInt(e.target.value) || 5)}
                      className="w-16 px-1 py-0.5 text-xs border rounded text-center"
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
            </div>
        </CardHeader>


        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nodeType" className="text-sm font-medium">
              Chế độ chu trình
            </Label>
            <Select value={selectedNodeType} onValueChange={handleNodeTypeChange}>
              <SelectTrigger id="nodeType" className="text-lg">
                <SelectValue placeholder="Chọn chế độ">
                  {selectedNodeType ? nodeTypeMapping[selectedNodeType] || selectedNodeType : "Chọn chế độ"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
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
              <Label className="text-sm font-medium">Tổng Số ô :</Label>
              <div className="text-4xl font-bold font-mono text-primary">{totalCellsSelectedType}</div>
            </div>
            <div className="flex items-center gap-3 flex-col">
              <Label className="text-sm font-medium">Tạo mới:</Label>
              <Button variant="outline" size="icon" onClick={increaseCells}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Form thêm node mới */}
          {showAddForm && (
            <div className="pt-4 border-t">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">Thêm Node Mới</CardTitle>
                  <CardDescription className="text-blue-600">
                    Nhập thông tin cho node mới
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Chu trình - chỉ hiển thị khi chưa có selectedNodeType */}
                  {!selectedNodeType && (
                    <div className="space-y-2">
                      <Label htmlFor="nodeType" className="text-sm font-medium">
                        Chu trình *
                      </Label>
                      <select
                        id="nodeType"
                        value={newNodeData.nodeType || ""}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, nodeType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Chọn loại chu trình...</option>
                        <option value="supply">Cấp</option>
                        <option value="returns">Trả</option>
                        <option value="both">Cấp&Trả</option>
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 grid-rows-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="node_name" className="text-sm font-medium">
                        Tên Node *
                      </Label>
                      <input
                        id="node_name"
                        type="text"
                        value={newNodeData.node_name}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, node_name: e.target.value }))}
                        placeholder="Nhập tên node..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2  row-start-2">
                      <Label htmlFor="start" className="text-sm font-medium">
                        Start *
                      </Label>
                      <input
                        id="start"
                        type="number"
                        value={newNodeData.start}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, start: parseInt(e.target.value) || null }))}
                        placeholder="Nhập giá trị start..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2 row-start-2">
                      <Label htmlFor="end" className="text-sm font-medium">
                        End *
                      </Label>
                      <input
                        id="end"
                        type="number"
                        value={newNodeData.end}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, end: parseInt(e.target.value) || null }))}
                        placeholder="Nhập giá trị end..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {(selectedNodeType === 'both') && (
                      <>
                        <div className="space-y-2 row-start-3">
                          <Label htmlFor="next_start" className="text-sm font-medium">
                            Next Start (Tùy chọn)
                          </Label>
                          <input
                            id="next_start"
                            type="number"
                            value={newNodeData.next_start}
                            onChange={(e) => setNewNodeData(prev => ({ ...prev, next_start: parseInt(e.target.value) || null }))}
                            placeholder="Nhập giá trị next_start..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-2 row-start-3">
                          <Label htmlFor="next_end" className="text-sm font-medium">
                            Next End (Tùy chọn)
                          </Label>
                          <input
                            id="next_end"
                            type="number"
                            value={newNodeData.next_end}
                            onChange={(e) => setNewNodeData(prev => ({ ...prev, next_end: parseInt(e.target.value) || null }))}
                            placeholder="Nhập giá trị next_end..."
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
                      Hủy
                    </Button>
                    <Button 
                      onClick={handleConfirmAddNode}
                      disabled={!newNodeData.node_name || !newNodeData.start || !newNodeData.end || (!selectedNodeType && !newNodeData.nodeType)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Xác Nhận
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="pt-4 border-t">
            <GridPreview columns={columnsWantToShow} cells={filteredNodes} onDeleteCell={handleDeleteCell} selectedNodeType={selectedNodeType} />
          </div>
        </CardContent>
      </Card>
{/*   Cell Name Configuration */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tùy Chỉnh Ô</CardTitle>
              <CardDescription>Đặt tên cho từng ô trong lưới hiển thị</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <input
                id="excel-import"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleExcelImport}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('excel-import').click()}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
              <div className="text-xs text-muted-foreground text-right">
                Format: node_name, node_type, owner, start, end, next_start, next_end
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CellNameEditor 
            cells={filteredNodes} 
            handleUpdateBatch={handleUpdateBatch} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ButtonSettings;
