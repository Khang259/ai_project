# Tổng quan Frontend - Dashboard AMR/Warehouse

## 1. Công nghệ

- **Framework:** React 19 + Vite 7
- **Styling:** Tailwind CSS 4, CSS modules (glowing, glass, box_shadow_purple, bootstrap-scoped)
- **UI:** Radix UI, Ant Design (icons), Lucide React, component shadcn-style (`components/ui/`)
- **Biểu đồ:** Recharts, Chart.js + react-chartjs-2, chartjs-plugin-datalabels
- **Khác:** i18next, Axios, Sonner (toast), Leaflet (bản đồ), React Router 7

---

## 2. Cấu trúc routing & trang

| Path | Trang | Mô tả |
|------|--------|--------|
| `/`, `/login` | LoginPage | Đăng nhập |
| `/dashboard` | DashBoard | Tổng quan: thống kê, biểu đồ, bảng robot |
| `/warehouse-map` | WarehouseMap | Bản đồ kho AMR full screen |
| `/task-management` | TaskManagement | Quản lý task, bộ lọc, phân trang |
| `/analytics` | Analytics | Phân tích: trạng thái làm việc, payload, biểu đồ theo thiết bị |
| `/notification` | Notification | Danh sách thông báo, lọc, phân trang |
| `/users` | Users | Quản lý user (admin/operator) |
| `/area` | Area | Quản lý khu vực (chỉ admin) |
| `/settings` | Settings | Camera, Monitor, Route, Button |
| `/maintain` | Maintain | Bảo trì AMR, linh kiện, lịch sử |
| `/monitor`, `/monitor-packaged` | Monitor | Màn hình giám sát |
| `/mobile-grid-display` | MobileGridDisplay | Hiển thị grid cho mobile |
| `/caller-we` | CallerWE | Trang Caller (public) |

Layout admin: `DashboardLayout` (header có logo, nav, Area selector, Language, Avatar dropdown).

---

## 3. Dashboard – Các biểu đồ & component

### 3.1 Lưới 6 ô (3 cột × 2 hàng)

- **Hàng 1**
  - **StatisticsOverviewCard**  
    Gồm: **StatisticsLeftSide** (Doughnut Chart – trạng thái task: completed, inProgress, not_start, failed, cancelled) + **SemiPieChartGroup** (2 nửa tròn: 7 ngày & 30 ngày – tỷ lệ hoàn thành).
  - **ColumnChart**  
    Biểu đồ cột chồng **“Trạng thái có tải của AMR”** theo giờ (Có tải / Không tải). Data: `useColumnChart` (API).
  - **RobotTable**  
    Bảng robot realtime (WebSocket): tên, ID, tốc độ, pin; có thống kê tổng/đang chạy/nhàn rỗi/đang sạc/pin yếu/offline.
- **Hàng 2**
  - **GraphChart**  
    Line Chart **“Hiệu suất làm việc”** (%), gradient tím–cyan, có glow; data từ `useGraphChart`.
  - **LineChart**  
    **“Trạng thái làm việc của AMR”** theo tháng (Làm nhiệm vụ / Nghỉ %). Data: `useLineChart`.
  - **SpeedChart**  
    Bar ngang **“Tốc độ trung bình AMR tuần qua”** (m/s), domain 0–2. Data: `useSpeedChart`.

### 3.2 Nguồn dữ liệu Dashboard

- **API:** `taskStatistics`, `columnChart`, `lineChart`, `graphChart`, `speedChart` (trong `services/Dashboard/`).
- **WebSocket:** `useRobotTableWS` cho RobotTable.
- **Hooks:** `useStatisticsLeftSide`, `useColumnChart`, `useLineChart`, `useGraphChart`, `useSpeedChart`, `useSemiPieChartData`.

---

## 4. CSS & giao diện

### 4.1 File CSS chính

- **index.css**  
  Tailwind + tw-animate, theme (biến `--radius`, `--background`, `--foreground`, `--card`, v.v.), `:root` / `.dark`, `@layer base` (body, .map-wrapper).
- **App.css**  
  #root, .logo, .card, .read-the-docs (ít dùng).
- **styles/glowing.css**  
  Neon: `.neon-btn`, `.neon-card`, `.neon-text`, `.neon-progress`, `.neon-input`, `.neon-badge`, `.neon-icon`, `.neon-pulse`; biến `--neon-blue`, `--neon-cyan`, …; keyframes `shimmer`, `neonPulse`.
- **styles/glass.css**  
  `.glass`, `.glass-primary`, `.header-glassmorphism`, `.header-nav-item`, `.header-button-neumorphism`. **Lưu ý:** `.header-nav-item.active` dùng `animation: neon-pulse` nhưng keyframe trong glowing.css là `neonPulse` (camelCase) → nên thống nhất tên keyframe.
- **styles/box_shadow_purple.css**  
  `.card-purple`, `.card-purple-specific`, `.card-purple-button` (nền tím, viền, blur).
- **styles/bootstrap-scoped.css**  
  Scope `.mobile-grid-bootstrap` cho grid/modal/button/alert/spinner/dropdown (dùng ở MobileGridDisplay).

### 4.2 Cách dùng style trong trang

- **Dashboard:** `glowing.css`, `box_shadow_purple.css`; ô dùng `card-purple`, grid Tailwind.
- **Header (DashboardLayout):** `glass.css`, SVG khung viền, nav item `active` màu cyan `rgb(34,189,189)`.
- **TaskManagement / Notification:** `glass rounded-lg border border-gray-200 ... text-white`.
- **Analytics:** Card Ant/shadcn, border gray, nền trắng/xám.
- **Settings:** `text-white`, container trắng.
- **App.jsx:** Nền đen full màn `fixed ... bg-black -z-10`; body chữ đen (`color: black !important` trong index.css).

### 4.3 Thống nhất giao diện

- Nền app tối (đen), nhiều card tối (tím/xám đậm), chữ sáng; một số trang (Analytics, Login) dùng nền/xám sáng.
- Màu nhấn: cyan `rgb(34,189,189)`, tím `#8a2be2` / `rgba(138,43,226,...)`.
- Font: Arial trong nhiều biểu đồ; mặc định Tailwind/theme.

---

## 5. Các chức năng chính theo module

- **Dashboard:** Xem nhanh task, trạng thái AMR, tốc độ, pin, hiệu suất.
- **Warehouse Map:** Bản đồ AMR (AMRWarehouseMap), layer, camera, node.
- **Task Management:** Danh sách task, lọc (search, ngày), phân trang.
- **Analytics:** Lọc theo ngày & AMR; biểu đồ hiệu suất (InTask %), payload; tab Workflows với Pie (làm việc/nghỉ, có hàng/không hàng).
- **Notification:** Danh sách thông báo, lọc, phân trang.
- **Users:** CRUD user, lọc theo role; operator chỉ thấy user role “user”.
- **Area:** CRUD khu vực (admin).
- **Settings:** Camera, Monitor, Route, Button (sidebar + tab nội dung).
- **Maintain:** Bảo trì, thay linh kiện, lịch sử, checklist.

---

## 6. Chuẩn bị sửa giao diện

- **Đã nắm:** toàn bộ route, từng trang dùng layout/style gì, từng biểu đồ dùng data/hook nào, và toàn bộ file CSS (Tailwind, glowing, glass, purple, bootstrap-scoped).
- **Lỗi nhỏ:** `glass.css` gọi `animation: neon-pulse` nhưng keyframe thực tế là `neonPulse` → nên đổi `glass.css` thành `neonPulse` hoặc thêm `@keyframes neon-pulse` trong glowing.
- **Gợi ý khi sửa UI:**
  - Muốn thống nhất tối/sáng: chỉnh `index.css` (:root / .dark) và nền trong App.jsx.
  - Muốn đổi màu nhấn: tìm `rgb(34,189,189)`, `#8a2be2`, `rgba(138,43,226,...)` và biến trong glowing/box_shadow_purple.
  - Card/header: chỉnh `.glass`, `.card-purple`, `.header-nav-item.active` trong glass/box_shadow_purple.
  - Biểu đồ: mỗi file ColumnChart, LineChart, Graph_Chart, SpeedChart, StatisticsLeftSide, SemiPieChart có style inline hoặc options (màu, font, grid) — chỉnh trực tiếp trong từng component.

Bạn có thể nói rõ muốn sửa phần nào (ví dụ: header, màu nền, card dashboard, một biểu đồ cụ thể, hoặc toàn bộ theme) để mình đề xuất chỉnh từng file cụ thể.
