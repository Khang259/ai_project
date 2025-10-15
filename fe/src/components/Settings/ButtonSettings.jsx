import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Plus, Grid3x3, User, Upload } from 'lucide-react';
import GridPreview from './GridPreview';
import CellNameEditor from './CellNameEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useUsers } from '../../hooks/Users/useUsers';
import useButtonSettings from '../../hooks/Setting/useButtonSettings';

const ButtonSettings = () => {
  const {users, usersLoading, usersError } = useUsers();
  const [selectedUser, setSelectedUser] = useState({});
  const [selectedNodeType, setSelectedNodeType] = useState('Cap');
  const {
    loading,
    error,
    nodeTypes,
    allNodes,
    setAllNodes,
    totalCellsSelectedType,
    updateCell,
    deleteCell,
    addNode,
    importNodesLocal,
    saveBatch,
    saveBatchWithNodes,
    fetchNodes,
  } = useButtonSettings(selectedUser, selectedNodeType);

  const [newNodeData, setNewNodeData] = useState({
    node_name: "",
    start: 0,
    end: 0,
    next_start: 0,
    next_end: 0
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const MaximumColumnsInPreview = 4;
  const columns = MaximumColumnsInPreview;
  const totalCells = allNodes.length;
  const rows = Math.ceil(totalCells / columns);
  // khi đổi user thì refetch
  useEffect(() => {
    if (selectedUser?.id) fetchNodes();
  }, [selectedUser, fetchNodes]);

  // Cập nhật selectedUser khi users được load từ API ( Khi chưa có dữ liệu gì ?)
  useEffect(() => {
    if (users && users.length > 0 && !selectedUser.id) {
      // Tìm admin user hoặc user đầu tiên làm default
      const adminUser = users.find(user => user.is_superuser) || users[0];
      if (adminUser) {
        setSelectedUser({
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.is_superuser ? "Administrator" : "User",
        });
      }
    }
  }, [users, selectedUser]);
  // Cập nhật lại selectedNodeType khi nodeTypes thay đổi
  useEffect(() => {
    if (Object.keys(nodeTypes).length > 0 && !selectedNodeType) {
      setSelectedNodeType(Object.keys(nodeTypes)[0]);
    }
  }, [nodeTypes, selectedNodeType])


  // Xóa ô có confirm UI, sau đó gọi hook
  const handleDeleteCell = async (cellId) => {
    const nodeToDelete = allNodes.find(node => node.id === cellId);
    if (!nodeToDelete) return;
    if (confirm(`Bạn có chắc chắn muốn xóa ô ${nodeToDelete.node_name}?`)) {
      await deleteCell(cellId);
    }
  };

  // Hiển thị form thêm node
  const showAddNodeForm = () => {
    setShowAddForm(true);
    setNewNodeData({
      node_name: "",
      start: "",
      end: "",
      next_start: "",
      next_end: ""
    });
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
      node_type: selectedNodeType,
      owner: selectedUser.username,
      start: newNodeData.start,
      end: newNodeData.end,
      next_start: newNodeData.next_start || 0,
      next_end: newNodeData.next_end || 0,
    };
    const res = await addNode(payload);
    if (!res?.success) {
      alert(`Tạo node thất bại: ${res?.error || 'Unknown error'}`);
      return;
    }
    
    // Đóng form và reset dữ liệu
    setShowAddForm(false);
    setNewNodeData({
      node_name: "",
      start: 0,
      end: 0,
      next_start: 0,
      next_end: 0
    });

    alert(`Đã thêm node "${newNodeData.node_name}" thành công!`);
  };

  // Tăng số ô (giữ nguyên để tương thích với code cũ)
  const increaseCells = () => {
    showAddNodeForm();
  };
  
  // Chọn người dùng khi đã có dữ liệu cái này tùy vào người bấm
  const handleUserSelect = (userId) => {
    const user = users.find(user => user.id === userId);
    if (user) {
      setSelectedUser({
        id: user.id,
        username: user.username,
        role: user.is_superuser ? "Administrator" : "User",
      });
    }
  };

  // Chọn nodeType khi đã có dữ liệu cái này tùy vào người bấm
  const handleNodeTypeChange = (newNodeType) => {
    setSelectedNodeType(newNodeType);
  };


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
          const existing = allNodes.find((n) => n.node_name === nodeName && n.node_type === nodeType);
          return {
            id: existing ? existing.id : `new_node_${Date.now()}_${idx}`,
            node_name: nodeName,
            node_type: nodeType,
            owner: selectedUser.username,
            start: Number(r.start) || '',
            end: Number(r.end) || '',
            next_start: Number(r.next_start) || '',
            next_end: Number(r.next_end) || '',
          };
        });

        const mergedMap = new Map();
        // Ưu tiên dữ liệu mới: put imported first, then fill others not overridden
        importedNodes.forEach((n) => {
          const key = `${n.node_name}__${n.node_type}`;
          mergedMap.set(key, n);
        });
        allNodes.forEach((n) => {
          const key = `${n.node_name}__${n.node_type}`;
          if (!mergedMap.has(key)) mergedMap.set(key, n);
        });
        const mergedNodes = Array.from(mergedMap.values());

        setAllNodes(mergedNodes);

        // Gọi saveBatchWithNodes để gửi API ngay sau khi import
        const result = await saveBatchWithNodes(mergedNodes);
        if (result?.success) {
          alert(`Đã import và lưu ${importedNodes.length} dòng thành công!`);
        } else {
          alert(`Import thành công nhưng lưu thất bại: ${result?.error || 'Unknown error'}`);
        }

        // Cho phép nhập lại cùng file nếu cần
        event.target.value = '';
      } catch (error) {
        console.error(error);
        alert('Lỗi khi đọc file Excel: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // === 5. Giao diện (UI) ===
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
            {/* Dropdown Menu for quick select user */}
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
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nodeType" className="text-sm font-medium">
              Chế độ chu trình
            </Label>
            <Select value={selectedNodeType} onValueChange={handleNodeTypeChange}>
              <SelectTrigger id="nodeType" className="text-lg">
                <SelectValue placeholder="Chọn chế độ" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(nodeTypes).map((nodeType) => (
                  <SelectItem key={nodeType} value={nodeType}>
                    {nodeType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Tổng Số Ô</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold font-mono text-primary">{totalCellsSelectedType}</div>
              </div>
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
                    Nhập thông tin cho node mới thuộc loại "{selectedNodeType}"
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
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
                    <div className="space-y-2">
                      <Label htmlFor="start" className="text-sm font-medium">
                        Start *
                      </Label>
                      <input
                        id="start"
                        type="number"
                        value={newNodeData.start}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, start: parseInt(e.target.value) || 0 }))}
                        placeholder="Nhập giá trị start..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end" className="text-sm font-medium">
                        End *
                      </Label>
                      <input
                        id="end"
                        type="number"
                        value={newNodeData.end}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, end: parseInt(e.target.value) || 0 }))}
                        placeholder="Nhập giá trị end..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="next_start" className="text-sm font-medium">
                        Next Start (Tùy chọn)
                      </Label>
                      <input
                        id="next_start"
                        type="number"
                        value={newNodeData.next_start}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, next_start: parseInt(e.target.value) || 0 }))}
                        placeholder="Nhập giá trị next_start..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="next_end" className="text-sm font-medium">
                        Next End (Tùy chọn)
                      </Label>
                      <input
                        id="next_end"
                        type="number"
                        value={newNodeData.next_end}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, next_end: parseInt(e.target.value) || 0 }))}
                        placeholder="Nhập giá trị next_end..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddForm(false);
                        setNewNodeData({
                          node_name: "",
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
                      disabled={!newNodeData.node_name || !newNodeData.start || !newNodeData.end}
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
            <GridPreview rows={rows} columns={columns} cells={allNodes} onDeleteCell={handleDeleteCell} />
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
                Format: Cell Name, Start, End, Next Start, Next End
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CellNameEditor cells={allNodes} onUpdateCell={updateCell} />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => {
            // Tạo cấu hình cho tất cả các node types
            const allModeConfigs = {};
            Object.keys(nodeTypes).forEach(nodeType => {
              allModeConfigs[nodeType.toLowerCase()] = {
                totalCells: nodeTypes[nodeType],
                columns: MaximumColumnsInPreview,
                rows: Math.ceil(nodeTypes[nodeType] / MaximumColumnsInPreview)
              };
            });

            const gridConfig = {
              currentMode: selectedNodeType,
              allModeConfigs,
              currentUser: selectedUser,
              lastUpdated: new Date().toISOString(),
            };

            // Lưu cấu hình cell cho từng mode
            const cellConfigsByMode = {};
            Object.keys(nodeTypes).forEach(nodeType => {
              cellConfigsByMode[nodeType.toLowerCase()] = allNodes.filter(node => node.node_type === nodeType);
            });
            saveBatch();
          
            alert(`Cấu hình đã được lưu!\n\nUser: ${selectedUser?.username}\nNode Type: ${selectedNodeType}\nTổng số node: ${allNodes.length}`);
          }}
          size="lg" 
          className="min-w-[150px] bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Grid3x3 className="h-4 w-4 mr-2" />
          Lưu Cấu Hình Nút
        </Button>
      </div>
    </div>
  );
};

export default ButtonSettings;