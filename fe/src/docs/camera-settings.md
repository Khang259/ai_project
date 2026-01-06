### Tài liệu bảo trì phần Camera trong Settings:

## 1. Chức năng:
- Tạo form để người dùng điền các thông số cấu hình cho camera
- Vẽ ROI cho các vùng trong camera sau khi lưu được path của camera
- Bảng thông tin các giá trị đã điền của các camera 

## 2. Luồng xử lý:
### 2.1 Load dữ liệu cameras
- Dependencies:useLoadCameraFromDatabase, useArea, 
- Flow
+ Gọi getCamerasByArea(areaId) // areaId nhận được từ currAreaId trong useArea
+ Transform dữ liệu từ backend 
 - Chuyển về mảng: item.cameras // bakcend trả về List
 - Ánh xạ thuộc tính
+ Trả về kết quả trong  { cameras, setCameras, loading, refetch: loadCamerasFromDatabase }

### 2.2 Thêm form camera
- Flow:
+ Quản lý dữ liệu camera thông qua hook `useLoadCameraFromDatabase `
+ Để thay đổi state của cameras không thay đổi trực tiếp mà sử dụng dạng bất biến `setCameras([...cameras,newCamera])` để React nhận biết thay đổi và re-render state theo dữ liệu mới từ `newCamera`
+ Áp dụng định nghĩa trên và sử dụng vào trong hàm mới `addNewFormCamera`
+ Gán hàm vừa tạo vào 1 nút để người dùng tạo form mới 

### 2.3 Lưu camera vào db

- Người dùng gọi đến hàm `handleSaveCameras` gọi đến hook tương ứng
- Gọi đến hàm `useHandleSaveCameras` 
- Gọi đến hàm `addCamera` || `updateCamera` tùy thuộc vào điều kiện sai khác
- Đợi response từ server qua`addCamera` thì sẽ thông báo tương ứng

### 2.4 Edit ROI trong luồng stream
- Dependency: `CameraViewerModal.jsx`, `infocamera-dashboard`
- Flow: `selectedCameraForViewing` -> set state `selectedCamera` -> `CameraViewerModal{cameraData}` -> `getStreamCamera` -> renderStream + vẽ ROI

+ Người dùng gọi đến hàm `selectedCameraForViewing` đã được truyền tham số và camera và truyền state sang cho `selectedCamera`

+ Ở cuối `CameraSettings.jsx` render ra `CameraViewerModal` 

+ Trong `CameraViewerModal` sử dụng useEffect khi có tham số `cameraData` được kích hoạt nhờ `selectedCamera` -> gọi đến hàm `getStreamCamera`kèm theo `camera.Path`

+ Sau khi hiển thị stream vẽ trên Canvas thông qua `StreamWithBoundingBox`

+ Các tham số x,y,w,h được truyền qua `initialROIs` qua tham số `ROIs` và tự động map qua 
        {ROIs.map((roi, i) => {
            const { x, y, width, height, nodeId } = roi;

+ Lưu các tham số hoặc tùy chọn theo hành động người dùng

## 3. Cách DEBUG:

## 4. Lưu ý
### 4.1 Bảo trì
- Refactor lại code phần CameraSettings.jsx không tuân thủ quy tắc DRY

### 4.2 Technical debt
- Hàm ` addNewFormCamera` trong `CameraSettings.jsx` khác gì hàm `cameraData` trong `usehandleSaveCamera.js` ???

### 4.3 TODO
- Xem trong comment các file liên quan phía trên 