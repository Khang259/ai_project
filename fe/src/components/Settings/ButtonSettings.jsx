import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Plus, Minus, Grid3x3, Settings2, User, Upload } from 'lucide-react';
import GridPreview from './GridPreview';
import CellNameEditor from './CellNameEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useUsers } from '../../hooks/Users/useUsers';

const ButtonSettings = () => {
  const [mode, setMode] = useState("cap");

  //Lấy tổng số ô theo collection trong useGridConfig
  const [modeConfigs, setModeConfigs] = useState({
    cap: { totalCells: 8 },
    tra: { totalCells: 6 },
    "cap-tra": { totalCells: 12 },
  });

  const MaximumColumnsInPreview = 4;
  const columns =  MaximumColumnsInPreview;
  const totalCells = modeConfigs[mode].totalCells;
  const rows = Math.ceil(totalCells / columns);

  const [cellConfigs, setCellConfigs] = useState([]);
  const [currentUser, setCurrentUser] = useState({ username: "admin", role: "Administrator" });
  
  // Sử dụng hook useUsers để lấy dữ liệu từ API
  const { users, loading, error } = useUsers();

  useEffect(() => {
    const newCells = [];
    for (let i = 1; i <= totalCells; i++) {
      const existingCell = cellConfigs.find((c) => c.id === `cell-${i}`);
      newCells.push({
        id: `cell-${i}`,
        name: existingCell?.name || `Cell ${i}`,
      });
    }
    setCellConfigs(newCells);
  }, [totalCells]);

  // Load saved configurations on component mount
  useEffect(() => {
    const loadConfigurations = () => {
      // Load grid config (cấu trúc mới)
      const savedGridConfig = localStorage.getItem("gridConfig");
      if (savedGridConfig) {
        try {
          const gridData = JSON.parse(savedGridConfig);
          
          // Load current mode
          if (gridData.currentMode) setMode(gridData.currentMode);
          
          // Load all mode configs
          if (gridData.allModeConfigs) {
            const loadedModeConfigs = {};
            Object.keys(gridData.allModeConfigs).forEach(modeKey => {
              loadedModeConfigs[modeKey] = {
                totalCells: gridData.allModeConfigs[modeKey].totalCells
              };
            });
            setModeConfigs(loadedModeConfigs);
          }
          
          // Load current user
          if (gridData.currentUser) setCurrentUser(gridData.currentUser);
        } catch (error) {
          console.warn("Lỗi khi parse gridConfig:", error);
        }
      }

      // Load cell configs by mode (cấu trúc mới)
      const savedCellConfigsByMode = localStorage.getItem("cellConfigsByMode");
      if (savedCellConfigsByMode) {
        try {
          const cellDataByMode = JSON.parse(savedCellConfigsByMode);
          // Load cells cho mode hiện tại
          const currentModeCells = cellDataByMode[mode];
          if (currentModeCells && Array.isArray(currentModeCells)) {
            setCellConfigs(currentModeCells);
          }
        } catch (error) {
          console.warn("Lỗi khi parse cellConfigsByMode:", error);
        }
      }

      // Fallback: Load cell config cũ (để tương thích ngược)
      const savedCellConfig = localStorage.getItem("cellConfig");
      if (savedCellConfig && cellConfigs.length === 0) {
        try {
          const cellData = JSON.parse(savedCellConfig);
          if (cellData.cells && Array.isArray(cellData.cells)) {
            setCellConfigs(cellData.cells);
          }
        } catch (error) {
          console.warn("Lỗi khi parse cellConfig:", error);
        }
      }
    };

    loadConfigurations();
  }, [mode]); // Thêm mode vào dependency để load lại khi mode thay đổi

  // Cập nhật currentUser khi users được load từ API
  useEffect(() => {
    if (users && users.length > 0 && !currentUser.id) {
      // Tìm admin user hoặc user đầu tiên làm default
      const adminUser = users.find(user => user.is_superuser) || users[0];
      if (adminUser) {
        setCurrentUser({
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.is_superuser ? "Administrator" : "User",
        });
      }
    }
  }, [users, currentUser.id]);

  // Cập nhật tên ô
  const updateCellName = (id, name) => {
    setCellConfigs(cellConfigs.map((cell) => (cell.id === id ? { ...cell, name } : cell)));
  };

  // Xóa ô
  const deleteCell = (cellId) => {
    if (confirm(`Bạn có chắc chắn muốn xóa ô ${cellId}?`)) {
      setCellConfigs(cellConfigs.filter((cell) => cell.id !== cellId));
      // Cập nhật totalCells nếu cần
      const newTotalCells = cellConfigs.length - 1;
      if (newTotalCells > 0) {
        setModeConfigs({
          ...modeConfigs,
          [mode]: { totalCells: newTotalCells },
        });
      }
    }
  };
  // Import Excel
  const handleExcelImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        // Giả sử file Excel có format: Cell ID, Cell Name
        const lines = data.split('\n');
        const importedCells = [];
        
        lines.forEach((line, index) => {
          if (index === 0) return; // Skip header
          const [cellId, cellName] = line.split(',');
          if (cellId && cellName) {
            importedCells.push({
              id: cellId.trim(),
              name: cellName.trim()
            });
          }
        });

        if (importedCells.length > 0) {
          setCellConfigs(importedCells);
          setModeConfigs({
            ...modeConfigs,
            [mode]: { totalCells: importedCells.length },
          });
          alert(`Đã import thành công ${importedCells.length} ô từ file Excel!`);
        }
      } catch (error) {
        alert('Lỗi khi đọc file Excel: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  // Tăng số ô
  const increaseCells = () => {
    setModeConfigs({
      ...modeConfigs,
      [mode]: { totalCells: modeConfigs[mode].totalCells + 1 },
    });
  };

  // Giảm số ô
  const decreaseCells = () => {
    if (modeConfigs[mode].totalCells > 1) {
      setModeConfigs({
        ...modeConfigs,
        [mode]: { totalCells: modeConfigs[mode].totalCells - 1 },
      });
    }
  };

  // Chọn người dùng
  const handleUserSelect = (userId) => {
    const selectedUser = users.find(user => user.id === userId);
    if (selectedUser) {
      setCurrentUser({
        id: selectedUser.id,
        username: selectedUser.username,
        role: selectedUser.is_superuser ? "Administrator" : "User",
        totalCells: selectedUser.totalCells || 8
      });
      // Cập nhật totalCells cho user được chọn
      setModeConfigs({
        ...modeConfigs,
        [mode]: { totalCells: selectedUser.totalCells || 8 },
      });
    }
  };

  // Tự động lưu cấu hình khi chuyển đổi mode
  const handleModeChange = (newMode) => {
    // Lưu cells hiện tại cho mode cũ
    const currentModeCells = cellConfigs.slice(0, modeConfigs[mode].totalCells);
    
    // Cập nhật mode
    setMode(newMode);
    
    // Load cells cho mode mới từ localStorage
    const savedCellConfigsByMode = localStorage.getItem("cellConfigsByMode");
    if (savedCellConfigsByMode) {
      try {
        const cellDataByMode = JSON.parse(savedCellConfigsByMode);
        const newModeCells = cellDataByMode[newMode];
        if (newModeCells && Array.isArray(newModeCells)) {
          setCellConfigs(newModeCells);
        }
      } catch (error) {
        console.warn("Lỗi khi load cells cho mode mới:", error);
      }
    }
  };

  // Cập nhật số ô cho người dùng để lại để kiểm tra sau
  const updateUserCells = (userId, newTotalCells) => {
    // Cập nhật currentUser nếu đang chọn user này
    if (currentUser?.id === userId) {
      setCurrentUser(prev => ({
        ...prev,
        totalCells: newTotalCells
      }));
      setModeConfigs({
        ...modeConfigs,
        [mode]: { totalCells: newTotalCells },
      });
    }
  };

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
                  {currentUser?.username || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  Chọn User
                </div>
                {loading ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Đang tải danh sách người dùng...
                  </div>
                ) : error ? (
                  <div className="px-2 py-1.5 text-sm text-red-500">
                    Lỗi: {error}
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
            <Label htmlFor="mode" className="text-sm font-medium">
              Chế độ chu trình
            </Label>
            <Select value={mode} onValueChange={handleModeChange}>
              <SelectTrigger id="mode" className="text-lg">
                <SelectValue placeholder="Chọn chế độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cap">Cấp</SelectItem>
                <SelectItem value="tra">Trả</SelectItem>
                <SelectItem value="cap-tra">Cấp & Trả</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Tổng Số Ô</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={decreaseCells}
                disabled={modeConfigs[mode].totalCells <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold font-mono text-primary">{totalCells}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {rows} hàng x {columns} cột
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={increaseCells}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <GridPreview rows={rows} columns={columns} cells={cellConfigs} onDeleteCell={deleteCell} />
          </div>
        </CardContent>
      </Card>

      {/* Cell Name Configuration */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tùy Chỉnh Ô</CardTitle>
              <CardDescription>Đặt tên cho từng ô trong lưới hiển thị</CardDescription>
            </div>
            {/* Nút Import Excel */}
            <div className="flex flex-col items-end gap-2">
              <input
                id="excel-import"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleExcelImport}
                className="hidden"
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
                Format: Cell ID, Cell Name
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CellNameEditor cells={cellConfigs} onUpdateCell={updateCellName} />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => {
            // Tạo cấu hình cho tất cả 3 mode
            const allModeConfigs = {
              cap: { 
                totalCells: modeConfigs.cap.totalCells,
                columns: MaximumColumnsInPreview,
                rows: Math.ceil(modeConfigs.cap.totalCells / MaximumColumnsInPreview)
              },
              tra: { 
                totalCells: modeConfigs.tra.totalCells,
                columns: MaximumColumnsInPreview,
                rows: Math.ceil(modeConfigs.tra.totalCells / MaximumColumnsInPreview)
              },
              "cap-tra": { 
                totalCells: modeConfigs["cap-tra"].totalCells,
                columns: MaximumColumnsInPreview,
                rows: Math.ceil(modeConfigs["cap-tra"].totalCells / MaximumColumnsInPreview)
              }
            };

            const gridConfig = {
              currentMode: mode,
              allModeConfigs,
              currentUser: currentUser,
              lastUpdated: new Date().toISOString(),
            };

            // Lưu cấu hình cell cho từng mode
            const cellConfigsByMode = {
              cap: cellConfigs.filter((_, index) => index < modeConfigs.cap.totalCells),
              tra: cellConfigs.filter((_, index) => index < modeConfigs.tra.totalCells),
              "cap-tra": cellConfigs.filter((_, index) => index < modeConfigs["cap-tra"].totalCells)
            };

            // lưu thông tin tại local
            localStorage.setItem("gridConfig", JSON.stringify(gridConfig));
            localStorage.setItem("cellConfigsByMode", JSON.stringify(cellConfigsByMode));
            
            alert(`Cấu hình nút đã được lưu cho ${currentUser?.username}!\n\nCấu hình các mode:\n- Cấp: ${modeConfigs.cap.totalCells} ô\n- Trả: ${modeConfigs.tra.totalCells} ô\n- Cấp & Trả: ${modeConfigs["cap-tra"].totalCells} ô`);
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
