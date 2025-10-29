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

const ButtonSettings = () => {
  // ===========================================
  // 1. KHAI BÁO STATE VÀ HOOKS
  // ===========================================
  const [columnsWantToShow, setColumnsWantToShow] = useState(5); // Cột muốn hiển thị trong Grid Preview có thể tùy chỉnh
  
  // Mapping cho các giá trị node_type
  const nodeTypeMapping = {
    'supply': 'Cấp hàng',
    'returns': 'Trả hàng', 
    'both': 'Cấp và trả hàng',
    'auto': 'Tự động'
  };
  
  // Line options (10 lines)
  const LINE_OPTIONS = ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6', 'Line 7', 'Line 8', 'Line 9', 'Line 10'];
  
  // Color palette cho các lines
  const LINE_COLORS = {
    'Line 1': '#016B61',   // Teal Green
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
  
  // State cho form thêm node mới
  const [newNodeData, setNewNodeData] = useState({
    node_name: "",
    nodeType: "",
    line: "",
    process_name: "",
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
  const [selectedLine, setSelectedLine] = useState();

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

  // Tính tổng số cells theo selectedNodeType và selectedLine
  const totalCellsSelectedType = React.useMemo(() => {
    let filteredData = data || [];
    
    // Filter theo node type
    if (selectedNodeType) {
      filteredData = filteredData.filter(n => n.node_type === selectedNodeType);
    }
    
    // Filter theo line
    if (selectedLine) {
      filteredData = filteredData.filter(n => n.line === selectedLine);
    }
    
    return filteredData.length;
  }, [data, selectedNodeType, selectedLine]);

  // Lọc data theo selectedNodeType và selectedLine
  useEffect(() => {
    let filteredData = data || [];
    
    // Filter theo node type
    if (selectedNodeType) {
      filteredData = filteredData.filter(n => n.node_type === selectedNodeType);
    }
    
    // Filter theo line
    if (selectedLine) {
      filteredData = filteredData.filter(n => n.line === selectedLine);
    }
    
    setdataFilteredByNodes(filteredData);
  }, [data, selectedNodeType, selectedLine, fetchData]);
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
    
    if (!newNodeData.line || !newNodeData.node_name || !newNodeData.process_name || !newNodeData.start || !newNodeData.end) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc (Tên Node, Tên Line, Process Name, Start, End)");
      return;
    }
    
    // Gọi API tạo node qua hook để có id từ server
    const payload = {
      node_name: newNodeData.node_name,
      node_type: selectedNodeType || newNodeData.nodeType,
      owner: selectedUser.username,
      line: selectedLine || newNodeData.line,
      process_name: newNodeData.process_name || "",
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
      line: "",
      process_name: "",
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

        const requiredHeaders = ['node_name', 'node_type', 'line', 'process_name', 'start', 'end', 'next_start', 'next_end'];
        const firstRowKeys = Object.keys(normalisedRows[0] || {});
        const isValid = requiredHeaders.every((h) => firstRowKeys.includes(h));
        if (!isValid) {
          alert('Header không hợp lệ. Cần các cột: node_name, node_type, line, process_name, start, end, next_start, next_end');
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
            line: selectedLine || String(r.line ?? ''),
            process_name: String(r.process_name ?? '').trim(),
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
        const validTypes = ['supply', 'returns', 'both', 'auto'];
        const invalidNode = mergedNodes.find(node => 
          node && node.node_type && !validTypes.includes(node.node_type)
        );
        if (invalidNode) {
          alert(`❌ Phát hiện node_type không hợp lệ: "${invalidNode.node_type}" tại node "${invalidNode.node_name}".\n\nChỉ chấp nhận: supply, returns, both, auto.\n\nImport đã bị hủy.`);
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
            line: node.line,
            process_name: node.process_name || "",
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
          alert(`Đã import và lưu ${importedNodes.length} dòng thành công!`);
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
    const cleanedNodes = nodes.map(node => ({
      id: node.id,
      node_name: node.node_name,
      node_type: node.node_type,
      owner: node.owner,
      line: node.line,
      process_name: node.process_name || "",
      start: node.start,
      end: node.end,
      next_start: node.next_start,
      next_end: node.next_end
    }));
    const payload = {'nodes': cleanedNodes};
    console.log("payload", payload);
    const result = await updateBatch(payload);
    if (result?.success) {
      alert("Cập nhật thành công");
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
        owner: node.owner,
        line: node.line,
        process_name: node.process_name || "",
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
          line: 'Line 1',
          process_name: 'PROC_A',
          start: 100,
          end: 200,
          next_start: 0,
          next_end: 0
        },
        {
          node_name: 'Tên ô trả',
          node_type: 'returns',
          line: 'Line 2',
          process_name: 'PROC_B',
          start: 300,
          end: 400,
          next_start: 0,
          next_end: 0
        },
        {
          node_name: 'Tên cấp&trả',
          node_type: 'both',
          line: 'Line 3',
          process_name: 'PROC_C',
          start: 500,
          end: 600,
          next_start: 700,
          next_end: 800
        },
        {
          node_name: 'Tên tự động',
          node_type: 'auto',
          line: 'Line 4',
          process_name: 'PROC_AUTO',
          start: 900,
          end: 1000,
          next_start: 0,
          next_end: 0
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
          {/* Line Selection */}
          <div className="space-y-2">
            <Label htmlFor="line" className="text-sm font-medium">
              Chọn Line *
            </Label>
            <Select 
              value={selectedLine || ""} 
              onValueChange={(value) => {
                setSelectedLine(value);
                setNewNodeData(prev => ({ ...prev, line: value }));
              }}
            >
              <SelectTrigger id="line" className="text-lg">
                <SelectValue placeholder="Chọn line">
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LINE_OPTIONS.map((lineOption) => (
                  <SelectItem key={lineOption} value={lineOption}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: LINE_COLORS[lineOption] }}
                      />
                      <span>{lineOption}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                {!selectedLine && (
                    <div className="space-y-2">
                      <Label htmlFor="nodeType" className="text-sm font-medium">
                        Line *
                      </Label>
                      <select
                        id="line"
                        value={newNodeData.line || ""}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, line: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Chọn Line...</option>
                        <option value="Line 1">Line 1</option>
                        <option value="Line 2">Line 2</option>
                        <option value="Line 3">Line 3</option>
                        <option value="Line 4">Line 4</option>
                        <option value="Line 5">Line 5</option>
                        <option value="Line 6">Line 6</option>
                        <option value="Line 7">Line 7</option>
                        <option value="Line 8">Line 8</option>
                        <option value="Line 9">Line 9</option>
                        <option value="Line 10">Line 10</option>
                      </select>
                    </div>
                  )}
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
                        <option value="auto">Tự động</option>
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
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="process_name" className="text-sm font-medium">
                        Process Name
                      </Label>
                      <input
                        id="process_name"
                        type="text"
                        value={newNodeData.process_name}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, process_name: e.target.value }))}
                        placeholder="Nhập process_name (tùy chọn)"
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
                    {(selectedNodeType === 'both' ||newNodeData.nodeType === 'both') && (
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
                          line: "",
                          process_name: "",
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
                      disabled={(!newNodeData.line && !selectedLine) || !newNodeData.node_name || !newNodeData.process_name || !newNodeData.start || !newNodeData.end || (!selectedNodeType && !newNodeData.nodeType)}
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
            <GridPreview columns={columnsWantToShow} cells={dataFilteredByNodes} onDeleteCell={handleDeleteCell} selectedNodeType={selectedNodeType} />
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
              <div className="flex flex-row items-end gap-2">
              {/* Nút Export Excel */}
              <Button
                variant="outline"
                onClick={handleExportData}
                size="sm"
                title={data && data.length > 0 ? 'Export dữ liệu hiện có' : 'Tải file mẫu'}
              >
                <Download className="h-4 w-4 mr-2" />
                {data && data.length > 0 ? 'Export Excel' : 'Tải Mẫu Excel'}
              </Button>

              {/* Nút Import Excel */}
              {(() => {
                if (!selectedUser?.id) {
                  return (
                    <div className="relative inline-block group">
                      <Button
                        variant="outline"
                        disabled
                        onClick={() => {}}
                        size="sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import Excel
                      </Button>
                      <div className="pointer-events-none absolute -top-8 left-0 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 transition-opacity group-hover:opacity-100 border shadow-sm">
                        Chọn user trước khi import bằng Excel
                      </div>
                    </div>
                  );
                }
                return (
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('excel-import').click()}
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Excel
                  </Button>
                );
              })()}
              </div>
              <div className="text-xs text-muted-foreground text-right">
                Format: node_name, node_type, line, process_name, start, end, next_start, next_end
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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