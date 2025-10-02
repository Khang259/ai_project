import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus, Trash2, Grid3x3, Settings2, Video, Minus, Upload, User } from 'lucide-react';
import GridPreview from './GridPreview';
import CellNameEditor from './CellNameEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

const CameraSettings = () => {
  const [mode, setMode] = useState("cap");
  const [modeConfigs, setModeConfigs] = useState({
    cap: { totalCells: 8 },
    tra: { totalCells: 6 },
    "cap-tra": { totalCells: 12 },
  });
  const columns = 4; // Fixed to 4 columns
  const totalCells = modeConfigs[mode].totalCells;
  const rows = Math.ceil(totalCells / columns);

  const [cameraIPs, setCameraIPs] = useState([{ id: "1", address: "" }]);
  const [cellConfigs, setCellConfigs] = useState([]);
  const [currentUser, setCurrentUser] = useState({ username: "admin", role: "Administrator" });
  const [users, setUsers] = useState([
    { id: "1", username: "admin", role: "Administrator", totalCells: 8 },
    { id: "2", username: "user1", role: "User", totalCells: 6 },
    { id: "3", username: "user2", role: "User", totalCells: 4 },
  ]);

  useEffect(() => {
    const newCells = [];
    for (let i = 1; i <= totalCells; i++) {
      const existingCell = cellConfigs.find((c) => c.id === `cell-${i}`);
      newCells.push({
        id: `cell-${i}`,
        name: existingCell?.name || `Camera ${i}`,
      });
    }
    setCellConfigs(newCells);
  }, [totalCells]);

  // Load saved configurations on component mount
  useEffect(() => {
    const loadConfigurations = () => {
      // Load grid config
      const savedGridConfig = localStorage.getItem("gridConfig");
      if (savedGridConfig) {
        const gridData = JSON.parse(savedGridConfig);
        if (gridData.mode) setMode(gridData.mode);
        if (gridData.modeConfigs) setModeConfigs(gridData.modeConfigs);
        if (gridData.users) setUsers(gridData.users);
        if (gridData.currentUser) setCurrentUser(gridData.currentUser);
      }

      // Load camera config
      const savedCameraConfig = localStorage.getItem("cameraConfig");
      if (savedCameraConfig) {
        const cameraData = JSON.parse(savedCameraConfig);
        if (cameraData.cameras) setCameraIPs(cameraData.cameras);
        if (cameraData.cells) setCellConfigs(cameraData.cells);
      }

      // Load cell config
      const savedCellConfig = localStorage.getItem("cellConfig");
      if (savedCellConfig) {
        const cellData = JSON.parse(savedCellConfig);
        if (cellData.cells) setCellConfigs(cellData.cells);
      }
    };

    loadConfigurations();
  }, []);

  const addCameraIP = () => {
    setCameraIPs([...cameraIPs, { id: Date.now().toString(), address: "" }]);
  };

  const removeCameraIP = (id) => {
    if (cameraIPs.length > 1) {
      setCameraIPs(cameraIPs.filter((cam) => cam.id !== id));
    }
  };

  const updateCameraIP = (id, address) => {
    setCameraIPs(cameraIPs.map((cam) => (cam.id === id ? { ...cam, address } : cam)));
  };

  const validateRTSPUrl = (url) => {
    // Kiểm tra định dạng RTSP URL
    const rtspRegex = /^rtsp:\/\/[\w\-\.]+(:\d+)?(\/.*)?$/i;
    return rtspRegex.test(url);
  };

  const updateCellName = (id, name) => {
    setCellConfigs(cellConfigs.map((cell) => (cell.id === id ? { ...cell, name } : cell)));
  };

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

  const increaseCells = () => {
    setModeConfigs({
      ...modeConfigs,
      [mode]: { totalCells: modeConfigs[mode].totalCells + 1 },
    });
  };

  const decreaseCells = () => {
    if (modeConfigs[mode].totalCells > 1) {
      setModeConfigs({
        ...modeConfigs,
        [mode]: { totalCells: modeConfigs[mode].totalCells - 1 },
      });
    }
  };


  const handleSaveCameraConfig = () => {
    // Kiểm tra validation trước khi lưu
    const invalidCameras = cameraIPs.filter(camera => 
      camera.address && !validateRTSPUrl(camera.address)
    );
    
    if (invalidCameras.length > 0) {
      alert(`Có ${invalidCameras.length} camera có URL không hợp lệ. Vui lòng kiểm tra lại định dạng RTSP.`);
      return;
    }

    const cameraConfig = {
      cameras: cameraIPs,
      cells: cellConfigs,
    };
    console.log("Camera configuration saved:", cameraConfig);
    localStorage.setItem("cameraConfig", JSON.stringify(cameraConfig));
    alert("Cấu hình camera đã được lưu!");
  };

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      // Clear user data
      setCurrentUser(null);
      // Redirect to login page
      window.location.href = '/login';
    }
  };

  const handleUserSelect = (userId) => {
    const selectedUser = users.find(user => user.id === userId);
    if (selectedUser) {
      setCurrentUser(selectedUser);
      // Cập nhật totalCells cho user được chọn
      setModeConfigs({
        ...modeConfigs,
        [mode]: { totalCells: selectedUser.totalCells },
      });
    }
  };

  const updateUserCells = (userId, newTotalCells) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, totalCells: newTotalCells }
        : user
    ));
    
    // Nếu đang chọn user này, cập nhật modeConfigs
    if (currentUser?.id === userId) {
      setModeConfigs({
        ...modeConfigs,
        [mode]: { totalCells: newTotalCells },
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Settings2 className="h-8 w-8 text-primary" />
          Cài Đặt Hệ Thống Camera
        </h1>
        <p className="text-muted-foreground text-lg">Tùy chỉnh lưới hiển thị và quản lý địa chỉ IP camera</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Grid Configuration */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5 text-primary" />
                  Cấu Hình Lưới
                </CardTitle>
                <CardDescription>Chọn chế độ và thiết lập số ô hiển thị</CardDescription>
              </div>
              {/* User Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {currentUser?.username || 'User'}
                    <span className="text-xs text-muted-foreground">
                      ({currentUser?.totalCells || 0} ô)
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    Chọn User
                  </div>
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
                          <div className="text-xs text-muted-foreground">{user.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {user.totalCells} ô
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newCells = prompt(`Cập nhật số ô cho ${user.username}:`, user.totalCells);
                            if (newCells && !isNaN(newCells) && parseInt(newCells) > 0) {
                              updateUserCells(user.id, parseInt(newCells));
                            }
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Settings2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info Section */}
            <div className="bg-muted/50 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">User hiện tại</h4>
                  <p className="text-lg font-bold text-primary">{currentUser?.username}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Số ô được phân bổ</p>
                  <p className="text-2xl font-bold text-primary">{currentUser?.totalCells || 0}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode" className="text-sm font-medium">
                Chế Độ
              </Label>
              <Select value={mode} onValueChange={(value) => setMode(value)}>
                <SelectTrigger id="mode" className="text-lg">
                  <SelectValue placeholder="Chọn chế độ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cap">Cấp</SelectItem>
                  <SelectItem value="tra">Trả</SelectItem>
                  <SelectItem value="cap-tra">Cấp && Trả</SelectItem>
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
                    {rows} hàng × {columns} cột
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

        {/* Camera IP Configuration */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Địa Chỉ IP Camera
            </CardTitle>
            <CardDescription>
              Thêm và quản lý địa chỉ IP của các camera
              <br />
              <span className="text-xs text-muted-foreground">
                📝 Định dạng yêu cầu: rtsp://ip:port/path (ví dụ: rtsp://192.168.1.100:554/stream)
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {cameraIPs.map((camera, index) => {
                const isValidRTSP = camera.address ? validateRTSPUrl(camera.address) : true;
                return (
                  <div key={camera.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`camera-${camera.id}`} className="text-xs text-muted-foreground">
                        Camera {index + 1}
                      </Label>
                      <Input
                        id={`camera-${camera.id}`}
                        type="text"
                        placeholder="rtsp://192.168.1.100:554/stream"
                        value={camera.address}
                        onChange={(e) => updateCameraIP(camera.id, e.target.value)}
                        className={`font-mono text-sm ${
                          camera.address && !isValidRTSP 
                            ? 'border-red-500 focus:border-red-500' 
                            : ''
                        }`}
                      />
                      {camera.address && !isValidRTSP && (
                        <p className="text-xs text-red-500">
                          ⚠️ URL phải có định dạng RTSP (ví dụ: rtsp://192.168.1.100:554/stream)
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCameraIP(camera.id)}
                      disabled={cameraIPs.length === 1}
                      className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={addCameraIP}
              variant="outline"
              className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5 bg-transparent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm Camera
            </Button>

            {/* Nút lưu riêng cho Camera Configuration */}
            <div className="mt-4 pt-4 border-t">
              <Button 
                onClick={handleSaveCameraConfig} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Video className="h-4 w-4 mr-2" />
                Lưu Cấu Hình Camera
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cell Name Configuration */}
        <Card className="border-2 lg:col-span-2">
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
            
            {/* Nút lưu riêng cho Cell Names */}
            <div className="mt-6 pt-4 border-t">
              <Button 
                onClick={() => {
                  const cellConfig = { cells: cellConfigs };
                  localStorage.setItem("cellConfig", JSON.stringify(cellConfig));
                  alert("Cấu hình tên ô đã được lưu!");
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Lưu Tên Các Ô
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <Button 
          onClick={() => {
            const gridConfig = {
              grid: { mode, columns, totalCells, rows },
              modeConfigs,
              users: users,
              currentUser: currentUser,
            };
            localStorage.setItem("gridConfig", JSON.stringify(gridConfig));
            alert(`Cấu hình nút đã được lưu cho ${currentUser?.username}!`);
          }}
          size="lg" 
          className="min-w-[200px] bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Grid3x3 className="h-4 w-4 mr-2" />
          Lưu Cấu Hình Nút
        </Button>
      </div>
    </div>
  );
};

export { CameraSettings };
export default CameraSettings;
