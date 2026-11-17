# ☕ Coffee Journey - Hệ Thống Quản Lý & Đặt Hàng Quán Cà Phê

Dự án website quản lý quán cà phê hiện đại, tích hợp đặt hàng trực tuyến, gọi món tại bàn qua mã QR, quản lý bán hàng tại quầy (POS), theo dõi quầy bar/pha chế và quản trị hệ thống toàn diện với dữ liệu thời gian thực (Realtime).

---

## 📌 Mục Lục
- [Giới Thiệu](#-giới-thiệu)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [Tính Năng Chính](#-tính-năng-chính)
  - [Dành Cho Khách Hàng (Customer)](#1-dành-cho-khách-hàng-customer)
  - [Dành Cho Nhân Viên (Staff / POS / Bar)](#2-dành-cho-nhân-viên-staff--pos--bar)
  - [Dành Cho Quản Trị Viên (Admin)](#3-dành-cho-quản-trị-viên-admin)
- [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)
- [Hướng Dẫn Cài Đặt & Chạy Dự Án](#-hướng-dẫn-cài-đặt--chạy-dự-án)
  - [Yêu Cầu Môi Trường](#yêu-cầu-môi-trường)
  - [Các Bước Cài Đặt](#các-bước-cài-đặt)
- [Cơ Sở Dữ Liệu & Phân Quyền](#-cơ-sở-dữ-liệu--phân-quyền)

---

## 📖 Giới Thiệu
**Coffee Journey** là giải pháp số hóa toàn diện cho mô hình kinh doanh quán cà phê, giải quyết bài toán đồng bộ giữa trải nghiệm khách hàng (Order online, Order tại bàn, tích điểm đổi quà) và vận hành nội bộ (Thu ngân POS, Bar pha chế, Quản lý kho, Thống kê doanh thu).

---

## 🚀 Công Nghệ Sử Dụng

### Frontend
- **Ngôn ngữ**: JavaScript (ES6+), React 18 (JSX)
- **Công cụ build**: Vite 5
- **Định kiểu (Styling)**: Tailwind CSS, PostCSS, Autoprefixer
- **Điều hướng (Routing)**: React Router DOM (v6)
- **Icon**: Lucide React
- **Giao diện**: Hỗ trợ Dark Mode / Light Mode linh hoạt

### Backend & Cơ Sở Dữ Liệu
- **Database & Backend-as-a-Service**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Realtime Updates**: Supabase Realtime Channels (cập nhật đơn hàng và đặt bàn tức thì)
- **Email Service**: EmailJS (gửi email thông báo)

---

## ✨ Tính Năng Chính

### 1. Dành Cho Khách Hàng (Customer)
* **Khám phá thực đơn**: Phân loại theo danh mục đồ uống, tìm kiếm món, xem chi tiết mô tả và hình ảnh.
* **Tùy biến món uống**: Chọn kích cỡ (Size S/M/L), thêm các loại Topping và ghi chú khẩu vị riêng.
* **Đặt món linh hoạt**:
  * Đặt giao hàng tận nơi (Delivery).
  * Gọi món tại bàn bằng cách quét mã QR (`?table=<id>`).
* **Đặt bàn trước (Table Booking)**: Chọn ngày giờ, số lượng khách và ghi chú yêu cầu bàn.
* **Theo dõi đơn hàng Realtime**: Cập nhật trạng thái đơn (Chờ xử lý ➜ Đang pha chế ➜ Đang giao ➜ Hoàn thành) kèm chuông thông báo âm thanh.
* **Đánh giá & Phản hồi**: Chấm điểm sao và gửi nhận xét cho từng món đã thưởng thức.
* **Hội viên & Tích điểm**: Tích lũy điểm trên mỗi đơn hàng, thăng hạng thành viên (Đồng, Bạc, Vàng, Kim Cương) và áp dụng voucher giảm giá.

### 2. Dành Cho Nhân Viên (Staff / POS / Bar)
* **POS Bán Hàng Tại Quầy**: Tạo đơn nhanh chóng, chọn món, áp mã giảm giá và in bill / thanh toán.
* **Màn Hình Bar / Bếp (Kitchen View)**: Tiếp nhận đơn pha chế theo thời gian thực, chuyển trạng thái chế biến trực tiếp.
* **Sơ Đồ Bàn**: Quan sát trạng thái bàn (trống, đang có khách, đã đặt trước).
* **Quản Lý Đơn Ca Trực**: Xem danh sách đơn hàng cần phục vụ và xử lý.
* **Tra Cứu Công Thức (Recipe View)**: Xem định lượng và công thức chuẩn cho từng món đồ uống.

### 3. Dành Cho Quản Trị Viên (Admin)
* **Bảng Điều Khiển (Dashboard)**: Thống kê doanh thu, số lượng đơn hàng, món bán chạy nhất và biểu đồ trực quan.
* **Quản Lý Thực Đơn & Sản Phẩm**: Thêm/sửa/xóa danh mục, sản phẩm, giá, size và topping.
* **Quản Lý Kho (Inventory)**: Theo dõi số lượng tồn kho nguyên vật liệu, cảnh báo sắp hết hàng.
* **Công Thức Pha Chế (Recipe Management)**: Thiết lập công thức định lượng nguyên liệu cho từng món.
* **Quản Lý Khuyến Mãi (Vouchers)**: Tạo và kiểm soát mã giảm giá, thời hạn và số lượng sử dụng.
* **Quản Lý Bàn & Khu Vực**: Thêm bàn, tạo mã QR bàn để bàn in tại chỗ.
* **Quản Lý Người Dùng & Nhân Viên**: Quản lý tài khoản, phân ca làm việc và phân quyền vai trò.
* **Báo Cáo & Cài Đặt**: Xuất báo cáo doanh thu, cấu hình chuông thông báo âm thanh và tỉ lệ hiển thị.

---

## 📂 Cấu Trúc Thư Mục

```plaintext
DoAnCDIO4-master/
├── public/                 # Tài nguyên tĩnh (ảnh, icon, logo)
├── src/
│   ├── admin/              # Giao diện & chức năng dành cho Quản trị viên
│   │   ├── AdminLayout.jsx # Khung điều hướng Admin
│   │   ├── DashboardView.jsx
│   │   ├── OrdersView.jsx
│   │   ├── ProductsView.jsx
│   │   ├── InventoryView.jsx
│   │   ├── RecipeView.jsx
│   │   ├── StaffView.jsx
│   │   ├── TablesView.jsx
│   │   ├── UsersView.jsx
│   │   ├── VoucherView.jsx
│   │   └── ...
│   ├── staff/              # Giao diện & chức năng dành cho Nhân viên
│   │   ├── StaffLayout.jsx # Khung điều hướng Nhân viên
│   │   ├── POSView.jsx     # Bán hàng tại quầy
│   │   ├── KitchenView.jsx # Màn hình pha chế / bếp
│   │   ├── StaffOrdersView.jsx
│   │   └── ...
│   ├── components/         # Các components dùng chung (Navbar, Footer, Modals, Cart...)
│   ├── views/              # Các trang chính của Khách hàng
│   │   ├── HomeView.jsx
│   │   ├── MenuView.jsx
│   │   ├── BookingView.jsx
│   │   ├── HistoryView.jsx
│   │   └── ProfileView.jsx
│   ├── utils/              # Tiện ích bổ trợ (tính điểm hội viên, âm thanh thông báo...)
│   ├── App.jsx             # Component gốc, định tuyến và lắng nghe Realtime
│   ├── main.jsx            # Entry point của React
│   └── supabaseClient.js   # Khởi tạo kết nối Supabase
├── db_cluster-21-09-2026@00-40-02.backup.sql # Script SQL khôi phục toàn bộ schema, bảng, trigger, RLS và dữ liệu
├── tailwind.config.js      # Cấu hình Tailwind CSS
├── vite.config.js          # Cấu hình Vite
└── package.json            # Thông tin dự án và danh sách dependencies
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu Cầu Môi Trường
- [Node.js](https://nodejs.org/) phiên bản 18 trở lên
- Trình quản lý gói `npm` (hoặc `yarn` / `pnpm`)

### Các Bước Cài Đặt

1. **Cài đặt các gói phụ thuộc (Dependencies)**:
   ```bash
   npm install
   ```

2. **Cấu hình biến môi trường**:
   - Tạo file `.env` tại thư mục gốc của dự án (hoặc sao chép từ `.env.example`):
     ```bash
     cp .env.example .env
     ```
   - Điền thông tin kết nối Supabase của bạn vào file `.env`:
     ```env
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-public-api-key
     ```

3. **Thiết lập Cơ sở dữ liệu Supabase**:
   - Truy cập vào trang quản trị Supabase Project của bạn.
   - Mở mục **SQL Editor**.
   - Sao chép toàn bộ nội dung trong file [`db_cluster-21-09-2026@00-40-02.backup.sql`](./db_cluster-21-09-2026@00-40-02.backup.sql) và dán vào SQL Editor rồi bấm **Run** để khởi tạo các bảng, trigger, RLS và dữ liệu đầy đủ.

4. **Khởi chạy ứng dụng ở môi trường phát triển (Development)**:
   ```bash
   npm run dev
   ```
   - Mặc định ứng dụng sẽ chạy tại: `http://localhost:5173`

5. **Build cho môi trường Production**:
   ```bash
   npm run build
   ```
   - Bản build hoàn chỉnh sẽ được tạo trong thư mục `dist/`.

---

## 👥 Cơ Sở Dữ Liệu & Phân Quyền

Hệ thống phân quyền người dùng dựa trên trường `VaiTroID`:
- **VaiTroID = 1**: Admin (Toàn quyền quản trị hệ thống)
- **VaiTroID = 2**: Quản lý (Quản lý cửa hàng, thực đơn, doanh thu)
- **VaiTroID = 3**: Thu ngân (Sử dụng POS, tạo đơn tại quầy, quản lý đơn)
- **VaiTroID = 4**: Pha chế (Xem màn hình bếp, cập nhật tiến độ pha chế)
- **VaiTroID = 5**: Phục vụ (Quản lý bàn, hỗ trợ khách tại bàn)
- **VaiTroID khác / Khách hàng**: Đặt món online, đặt bàn, xem lịch sử và tích điểm thành viên.
