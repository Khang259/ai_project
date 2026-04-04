# Tóm tắt Dashboard FE & Chuẩn bị điều chỉnh Responsive

**Màn hình mục tiêu chính:** **1920×1080** (Full HD, máy tính bình thường). Các điều chỉnh responsive ưu tiên tối ưu cho độ phân giải này (xem thêm `.cursor/rules/resolution-1920x1080.mdc`).

## 1. Cấu trúc trang Dashboard

### Trang chính
- **`pages/DashBoard.jsx`**: Lưới 6 ô (3 cột × 2 hàng) với các component:
  1. **StatisticsOverviewCard** – Thống kê + Doughnut + 2 SemiPie (7 ngày / 30 ngày)
  2. **ColumnChart** – Biểu đồ tỉ lệ hoàn thành nhiệm vụ
  3. **RobotTable** – Bảng danh sách Robot (WebSocket)
  4. **GraphChart** – Line chart hiệu suất làm việc
  5. **LineChart** – Trạng thái có tải / không tải AMR
  6. **SpeedChart** – Tốc độ trung bình AMR tuần qua

### Layout bọc ngoài
- **`components/DashboardLayout.jsx`**: Header (logo, nav, Area selector, Language, Avatar) + `<main>{children}</main>`.
- Nav: `hidden lg:flex` → **trên mobile/tablet chưa có menu (chỉ icon hoặc hamburger chưa thấy)**.

### Breakpoints hiện tại (Tailwind + custom)
- Trong **`index.css`**: `--breakpoint-fullhd: 120rem` (1920px) — màn 1920×1080. TV sẽ setup breakpoint riêng sau.
- Mặc định Tailwind: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `fullhd: 1920px`.

---

## 2. Responsive hiện có

### DashBoard.jsx (lưới)
- **Grid**: `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3` + `lg:grid-rows-[1fr_1fr]`.
- **Padding**: `p-2` → `lg:p-3` → `xl:p-4` → `fullhd:p-4`.
- **Gap**: `gap-2` → `lg:gap-3` → `xl:gap-4` → `fullhd:gap-4`.
- **Chiều cao**: `min-h-[360px]` → `lg:min-h-[440px]` → `xl:min-h-[560px]` → `fullhd:min-h-[720px]`; `h-[calc(100vh-7rem)]` → `lg:h-[calc(100vh-6.5rem)]` → `xl/fullhd:h-[calc(100vh-6rem)]`.

### DashboardLayout.jsx (header)
- Logo: `h-8` → `lg:h-10` → `xl:h-12` → `fullhd:h-8` (đã chỉnh nhỏ gọn cho 1920×1080).
- Nav: chỉ hiện từ `lg:flex`; text menu chỉ từ `xl:inline`.
- Area selector: `hidden md:flex`.
- Padding header: `px-6 py-5` → `lg:px-10 lg:py-6` → `xl:px-16 xl:py-6`.

### StatisticsOverviewCard / StatisticsLeftSide
- Padding: `p-2` → `lg:p-3` → `xl:p-4` → `fullhd:p-4`.
- Donut: `min-h-[100px]` → `xl:min-h-[240px]` → `fullhd:min-h-[280px]`; `max-h` thay đổi theo breakpoint.
- Legend: `text-xs` → `lg:text-sm` → `xl:text-base` → `fullhd:text-xl`; ô màu `w-3 h-3` → `lg:w-4` → `xl:w-5` → `fullhd:w-7`.

### SemiPieChartGroup / SemiPieChart
- SemiPieChart: `min-h-[140px]` → `lg:min-h-[160px]` → `fullhd:min-h-[200px]`.
- Label 7 ngày/30 ngày: `text-sm` → `lg:text-base` → `xl:text-base` → `fullhd:text-lg`.
- Phần trăm giữa chart: `text-2xl` → `lg:text-3xl` → `xl:text-3xl` → `fullhd:text-4xl`.

### Các chart (Graph_Chart, ColumnChart, LineChart, SpeedChart, RobotTable)
- Container: padding `px-2 py-1.5` → `lg:px-3 lg:py-2` → `xl:px-3` → `fullhd:px-4 fullhd:py-3`.
- Tiêu đề: `fontSize: 'clamp(0.9rem, 1.8vw, 1.5rem)'` (đã dùng clamp).
- RobotTable: dùng `matchMedia('(min-width: 1280px)')` để đổi font (FONT_LAPTOP / FONT_DESKTOP), padding và kích thước status badge theo `isXlOrLarger`.

### Recharts/Chart.js
- Đều dùng `ResponsiveContainer width="100%" height="100%"` hoặc `maintainAspectRatio: false` + `responsive: true` → chart co giãn theo ô.

---

## 3. Điểm cần điều chỉnh responsive (gợi ý)

### Mobile (< 640px)
- **Layout**: Đã 1 cột; có thể giảm `min-h` và padding để tránh scroll quá dài.
- **Header**: Nav ẩn (`hidden lg:flex`) → cần **menu mobile** (drawer/sheet hoặc dropdown) để vào các mục (Dashboard, Warehouse map, Task, Analytics, …).
- **Logo**: Có thể thu nhỏ thêm trên màn rất nhỏ.
- **Bảng Robot**: Cột dày, chữ nhỏ → có thể xem xét **card từng robot** thay vì bảng trên mobile, hoặc scroll ngang bảng.
- **Chart**: Font tick/label trong Recharts/Chart.js đang cỡ 14–22px → có thể giảm trên mobile (ví dụ 10–12px) để tránh chồng chữ.

### Tablet (640px – 1023px)
- **Grid**: `md:grid-cols-2` → 2 cột ổn; có thể tinh chỉnh gap/padding cho từng ô.
- **Header**: Vẫn thiếu nav (chỉ từ lg) → nên dùng chung menu mobile/tablet.
- **StatisticsLeftSide**: Donut + legend có thể bị chật → kiểm tra `max-h` và `min-h` cho md.

### Laptop (1024px – 1279px)
- Đã có 3 cột, 2 hàng; nhiều component đã có `lg:`.
- **RobotTable**: Cột “Tên Robot” / “ID” có thể bị cắt (`maxWidth: '1px'` + ellipsis) → ổn, chỉ cần đảm bảo tooltip/title đủ thông tin.

### Desktop (1280px+) & TV (1920px+)
- Đã có `xl` và `fullhd` cho padding, font, kích thước ô.
- **TV** (setup sau): Breakpoint riêng khi có màn TV; không gộp với 1920×1080 (`fullhd`).

### CSS global
- **`.card-purple-specific`** (trong `box_shadow_purple.css`): `width: 300px` cố định → trên mobile/ narrow có thể nên `width: 100%` hoặc `max-width: 300px` khi dùng standalone.

---

## 4. File cần sửa khi làm responsive

| File | Nội dung gợi ý |
|------|-----------------|
| `pages/DashBoard.jsx` | Điều chỉnh `min-h`, `gap`, `p-*` theo sm/md nếu cần; giữ grid 1/2/3 cột. |
| `components/DashboardLayout.jsx` | Thêm menu mobile (Sheet/Drawer + nút hamburger), ẩn nav desktop trên < lg. |
| `components/Overview/statistics/StatisticsOverviewCard.jsx` | Giữ hoặc tinh chỉnh padding cho sm. |
| `components/Overview/statistics/StatisticsLeftSide.jsx` | Kiểm tra min-h/max-h donut và legend trên sm/md. |
| `components/Overview/statistics/SemiPieChartGroup.jsx` | Kiểm tra grid 2 cột trên mobile (có thể 1 cột trên xs). |
| `components/Overview/statistics/SemiPieChart.jsx` | Min-height và font % cho sm. |
| `components/Overview/statistics/Graph_Chart.jsx` | Font size trong options (plugins, scales) theo breakpoint hoặc clamp. |
| `components/Overview/statistics/ColumnChart.jsx` | Tick font (20 → nhỏ hơn trên mobile), có thể truyền responsive font từ props. |
| `components/Overview/statistics/LineChart.jsx` | Tương tự ColumnChart cho XAxis/YAxis/Label. |
| `components/Overview/statistics/SpeedChart.jsx` | YAxis width (80) và font size cho mobile. |
| `components/Overview/statistics/RobotTable.jsx` | Layout mobile: bảng scroll ngang hoặc chuyển sang card list. |
| `styles/box_shadow_purple.css` | `.card-purple-specific`: responsive width (100% / max-width). |
| `index.css` | Đã có `--breakpoint-fullhd` (1920px); TV thêm breakpoint riêng sau. |

---

## 5. Thứ tự triển khai gợi ý

1. **Menu mobile cho DashboardLayout**  
   Thêm nút hamburger + Sheet/Drawer chứa các Link (giống `filteredNavigation`) cho màn < lg.

2. **Lưới và padding Dashboard**  
   Thêm/điều chỉnh class `sm:` / `md:` cho padding, gap, min-height nếu cần cho mobile/tablet.

3. **RobotTable mobile**  
   Chọn một: bảng scroll ngang (overflow-x-auto) hoặc layout dạng card cho từng robot.

4. **Font và tick trong chart**  
   Giảm font size (ticks, labels, legend) trên mobile (dùng hook/breakpoint hoặc media query trong options).

5. **Card và SemiPie**  
   Điều chỉnh `.card-purple-specific` và SemiPieChartGroup (1 cột trên xs nếu cần).

6. **Kiểm tra TV**  
   Xem trên 1920px: tiêu đề, số liệu, nút bấm đủ lớn để xem từ xa.

---

Bạn có thể nói rõ ưu tiên (ví dụ: “ưu tiên mobile trước” hoặc “chỉ cần tablet + desktop”) để mình đề xuất chỉnh từng file cụ thể (từng đoạn code) cho đúng với nhu cầu.
