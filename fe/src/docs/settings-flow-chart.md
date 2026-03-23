# Settings Components Flow Chart

## Tổng quan kiến trúc Settings

```mermaid
graph TD
    A[Settings.jsx] --> B[CameraSettings.jsx]
    B --> C[GridPreview.jsx]
    B --> D[CellNameEditor.jsx]
    B --> E[UI Components]
    
    E --> F[Card]
    E --> G[Button]
    E --> H[Input]
    E --> I[Label]
    E --> J[Select]
    
    K[index.js] --> B
    K --> C
    K --> D
    
    L[LocalStorage] --> B
    B --> L
```

## Chi tiết luồng hoạt động

```mermaid
flowchart TD
    Start([User truy cập /settings]) --> SettingsPage[Settings.jsx]
    
    SettingsPage --> CameraSettings[CameraSettings.jsx]
    
    CameraSettings --> StateInit[Khởi tạo State]
    StateInit --> ModeState[mode: 'cap']
    StateInit --> ConfigState[modeConfigs]
    StateInit --> CameraState[cameraIPs]
    StateInit --> CellState[cellConfigs]
    
    CameraSettings --> ModeSelect[Chọn chế độ]
    ModeSelect --> CapMode[Cấp - 8 ô]
    ModeSelect --> TraMode[Trả - 6 ô]
    ModeSelect --> CapTraMode[Cấp & Trả - 12 ô]
    
    CameraSettings --> CellControl[Điều chỉnh số ô]
    CellControl --> IncreaseCells[Tăng số ô]
    CellControl --> DecreaseCells[Giảm số ô]
    
    CameraSettings --> GridPreview[GridPreview.jsx]
    GridPreview --> DisplayGrid[Hiển thị lưới preview]
    DisplayGrid --> CellPreview[Xem trước các ô]
    
    CameraSettings --> CellNameEditor[CellNameEditor.jsx]
    CellNameEditor --> EditCellNames[Chỉnh sửa tên ô]
    EditCellNames --> UpdateCellName[cập nhật tên ô]
    
    CameraSettings --> CameraIPManagement[Quản lý IP Camera]
    CameraIPManagement --> AddCamera[Thêm Camera]
    CameraIPManagement --> RemoveCamera[Xóa Camera]
    CameraIPManagement --> UpdateCameraIP[Cập nhật IP]
    
    CameraSettings --> SaveConfig[Lưu cấu hình]
    SaveConfig --> LocalStorage[(LocalStorage)]
    SaveConfig --> AlertSuccess[Thông báo thành công]
    
    LocalStorage --> LoadConfig[Tải cấu hình]
    LoadConfig --> CameraSettings
```

## Luồng dữ liệu State Management

```mermaid
stateDiagram-v2
    [*] --> InitialState
    
    InitialState --> ModeSelection
    ModeSelection --> ConfigUpdate
    ConfigUpdate --> CellGeneration
    CellGeneration --> CellEditing
    CellEditing --> CameraManagement
    CameraManagement --> SaveOperation
    SaveOperation --> [*]
    
    state InitialState {
        mode: "cap"
        modeConfigs: {cap: 8, tra: 6, cap-tra: 12}
        cameraIPs: [{id: "1", address: ""}]
        cellConfigs: []
    }
    
    state ModeSelection {
        User chọn chế độ
        Cập nhật mode state
        Tính toán totalCells
    }
    
    state ConfigUpdate {
        Điều chỉnh số ô
        Cập nhật modeConfigs
        Tính toán rows/columns
    }
    
    state CellGeneration {
        useEffect trigger
        Tạo cellConfigs mới
        Giữ nguyên tên cũ
    }
    
    state CellEditing {
        GridPreview hiển thị
        CellNameEditor chỉnh sửa
        Cập nhật cellConfigs
    }
    
    state CameraManagement {
        Thêm/xóa camera
        Cập nhật cameraIPs
        Validate IP addresses
    }
    
    state SaveOperation {
        Tạo config object
        Lưu vào localStorage
        Hiển thị thông báo
    }
```

## Component Dependencies

```mermaid
graph LR
    subgraph "Settings Module"
        A[Settings.jsx]
        B[CameraSettings.jsx]
        C[GridPreview.jsx]
        D[CellNameEditor.jsx]
        E[index.js]
    end
    
    subgraph "UI Components"
        F[Card]
        G[Button]
        H[Input]
        I[Label]
        J[Select]
    end
    
    subgraph "External Libraries"
        K[lucide-react]
        L[React Hooks]
    end
    
    A --> B
    B --> C
    B --> D
    B --> F
    B --> G
    B --> H
    B --> I
    B --> J
    B --> K
    B --> L
    D --> H
    D --> I
    E --> B
    E --> C
    E --> D
```

## Data Flow trong CameraSettings

```mermaid
sequenceDiagram
    participant User
    participant CameraSettings
    participant GridPreview
    participant CellNameEditor
    participant LocalStorage
    
    User->>CameraSettings: Truy cập trang
    CameraSettings->>CameraSettings: Khởi tạo state
    CameraSettings->>GridPreview: Truyền props (rows, columns, cells)
    CameraSettings->>CellNameEditor: Truyền props (cells, onUpdateCell)
    
    User->>CameraSettings: Chọn chế độ
    CameraSettings->>CameraSettings: Cập nhật mode state
    CameraSettings->>CameraSettings: useEffect trigger
    CameraSettings->>CameraSettings: Tạo cellConfigs mới
    
    User->>CellNameEditor: Chỉnh sửa tên ô
    CellNameEditor->>CameraSettings: onUpdateCell callback
    CameraSettings->>CameraSettings: Cập nhật cellConfigs
    
    User->>CameraSettings: Thêm/xóa camera
    CameraSettings->>CameraSettings: Cập nhật cameraIPs
    
    User->>CameraSettings: Lưu cấu hình
    CameraSettings->>LocalStorage: Lưu config object
    CameraSettings->>User: Hiển thị thông báo thành công
```

## Props Flow

```mermaid
graph TD
    subgraph "CameraSettings Props"
        A1[mode: string]
        A2[modeConfigs: object]
        A3[cameraIPs: array]
        A4[cellConfigs: array]
        A5[totalCells: number]
        A6[rows: number]
        A7[columns: number]
    end
    
    subgraph "GridPreview Props"
        B1[rows: number]
        B2[columns: number]
        B3[cells: array]
    end
    
    subgraph "CellNameEditor Props"
        C1[cells: array]
        C2[onUpdateCell: function]
    end
    
    A5 --> B1
    A6 --> B1
    A7 --> B2
    A4 --> B3
    A4 --> C1
    A4 --> C2
```

## Event Handlers Flow

```mermaid
graph TD
    subgraph "User Interactions"
        U1[Chọn chế độ]
        U2[Tăng/giảm số ô]
        U3[Chỉnh sửa tên ô]
        U4[Thêm/xóa camera]
        U5[Lưu cấu hình]
    end
    
    subgraph "Event Handlers"
        H1[setMode]
        H2[increaseCells/decreaseCells]
        H3[updateCellName]
        H4[addCameraIP/removeCameraIP]
        H5[handleSave]
    end
    
    subgraph "State Updates"
        S1[mode state]
        S2[modeConfigs state]
        S3[cellConfigs state]
        S4[cameraIPs state]
        S5[localStorage]
    end
    
    U1 --> H1 --> S1
    U2 --> H2 --> S2
    U3 --> H3 --> S3
    U4 --> H4 --> S4
    U5 --> H5 --> S5
```
