# Phân Tích Mô Hình Kiến Trúc Dự Án Coffee Journey

Dự án Coffee Journey (DoAnCDIO4) không sử dụng mô hình Client-Server truyền thống (như React + NodeJS/Express + MongoDB) mà áp dụng các mô hình kiến trúc hiện đại, tập trung vào tốc độ phát triển và khả năng mở rộng nhanh (Rapid Development & Scalability). Dưới đây là phân tích chi tiết về các mô hình đang được áp dụng:

---

## 1. Mô hình Backend: Backend-as-a-Service (BaaS)

Dự án đã loại bỏ hoàn toàn tầng Backend (Custom Server) truyền thống và sử dụng **Supabase** như một giải pháp BaaS (Backend-as-a-Service).

**Đặc điểm của mô hình này trong dự án:**
*   **Không có Server Code:** Thay vì phải viết các API RESTful (`GET /orders`, `POST /products`) bằng NodeJS/Express, ứng dụng Frontend (React) sử dụng thư viện `@supabase/supabase-js` để gửi câu lệnh trực tiếp tới Database.
    *   *Ví dụ:* Thay vì gọi `axios.get('api/inventory')`, dự án gọi `supabase.from('nguyenlieu').select('*')`.
*   **Lợi ích:** Tiết kiệm 50% thời gian code, không cần cấu hình server, load balancer hay lo lắng về việc scale server khi lượng truy cập tăng.
*   **Điểm yếu:** Frontend chứa nhiều logic nghiệp vụ (Business Logic). Nếu đổi cấu trúc DB, phải sửa code Frontend thay vì chỉ sửa API ở Backend.

---

## 2. Mô hình Frontend: Single Page Application (SPA) - Client Side Rendering

Giao diện người dùng được xây dựng theo mô hình **SPA (Ứng dụng Đơn Trang)** bằng React và Vite.

**Cách thức hoạt động:**
*   Khi người dùng truy cập trang web lần đầu, Server (hoặc Hosting) chỉ trả về một file `index.html` duy nhất (hoàn toàn trống) kèm theo các file Javascript (.js) đã được đóng gói (bundle).
*   Trình duyệt (Browser) sẽ tải các file Javascript này và bắt đầu "vẽ" (Render) ra giao diện HTML ngay tại máy của người dùng (Client-Side Rendering).
*   Khi chuyển trang (từ `/home` sang `/admin`), trang web không tải lại từ đầu (no reload). React Router chỉ đơn giản là hoán đổi các Component, mang lại cảm giác mượt mà như dùng App điện thoại (Native App).

---

## 3. Mô hình Đồng bộ Dữ liệu: Event-Driven Realtime (WebSocket)

Đây là điểm ăn tiền lớn nhất của dự án. Thay vì dùng mô hình Request-Response truyền thống (HTTP Polling - cứ 5 giây Client lại hỏi Server xem có đơn hàng mới không), dự án dùng mô hình **Event-Driven qua WebSocket**.

**Cách thức hoạt động (dựa trên cấu hình trong script phục hồi `db_cluster-21-09-2026@00-40-02.backup.sql`):**
1.  **PostgreSQL Logical Replication:** Supabase cấu hình PostgreSQL lắng nghe mọi sự thay đổi trên các bảng (INSERT, UPDATE, DELETE).
    *   *Code cấu hình:* `ALTER PUBLICATION supabase_realtime ADD TABLE public.donhang;`
2.  **WebSockets Broadcast:** Bất cứ khi nào Bếp (Kitchen) bấm "Hoàn thành đơn", một lệnh `UPDATE` chạy vào Database. PostgreSQL ngay lập tức báo cho máy chủ Realtime của Supabase.
3.  **Client Subscription:** Supabase đẩy (Push) thông báo này xuống tất cả các trình duyệt Client đang mở ứng dụng qua một đường ống (WebSocket) duy nhất luôn được giữ kết nối.
    *   *Code React:* `supabase.channel(...).on('postgres_changes', ...).subscribe()`

---

## 4. Mô hình Bảo mật Dữ liệu: Row Level Security (RLS)

Vì ứng dụng không có Backend API để kiểm duyệt dữ liệu (Ví dụ: Chặn User A xóa dữ liệu của User B), mô hình bảo mật được chuyển thẳng xuống tầng Database thông qua **Row Level Security (Bảo mật cấp độ dòng)** của PostgreSQL.

**Cách hoạt động trong dự án:**
*   Mọi bảng trong Database (ví dụ bảng `nguoidung`, `hr_shifts`) đều được bật khiên bảo vệ.
    *   *Code cấu hình:* `ALTER TABLE public.hr_shifts ENABLE ROW LEVEL SECURITY;`
*   Hệ thống dùng các **Policies (Chính sách)** để kiểm duyệt từng câu lệnh SQL gửi từ Frontend.
*   *Lưu ý:* Hiện tại, trong script cấu hình `db_cluster-21-09-2026@00-40-02.backup.sql`, dự án đang set Policy ở mức `USING (true) WITH CHECK (true)` cho nhiều bảng (ví dụ `hr_staff_types`). Điều này có nghĩa là RLS đang mở cho tất cả mọi người (Public Access) để thuận tiện cho quá trình Dev.
*   **Hướng nâng cấp (Production):** Khi đưa vào thực tế, cần đổi `USING (true)` thành `USING (auth.uid() = user_id)`, nghĩa là chỉ user đang đăng nhập (có Token JWT hợp lệ) mới được sửa/xem dữ liệu của chính mình.

---

### Tổng kết
Kiến trúc **React SPA + Supabase BaaS + Realtime WebSocket** là một mô hình cực kỳ hiện đại, còn được gọi là kiến trúc **JAMstack thế hệ mới**. Nó giúp dự án đạt được hiệu năng cao, phản hồi tức thì (Zero-latency UI) và phù hợp hoàn hảo cho các ứng dụng mang tính tương tác cao như phần mềm POS/Quản lý nhà hàng.
