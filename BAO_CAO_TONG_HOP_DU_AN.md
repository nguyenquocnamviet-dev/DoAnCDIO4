# BÁO CÁO TỔNG HỢP VÀ PHÂN TÍCH KỸ THUẬT DỰ ÁN COFFEE JOURNEY (DoAnCDIO4)

**Mục lục:**
1. [Tổng Quan Dự Án & Kiến Trúc](#1-tổng-quan-dự-án--kiến-trúc)
2. [Đánh Giá Hệ Thống (Ưu/Nhược Điểm)](#2-đánh-giá-hệ-thống-ưunhược-điểm)
3. [Phân Tích Sâu Các Luồng Logic Phức Tạp (Kèm Code)](#3-phân-tích-sâu-các-luồng-logic-phức-tạp-kèm-code)
4. [Tư Vấn & Lộ Trình Nâng Cấp](#4-tư-vấn--lộ-trình-nâng-cấp)

---

## 1. Tổng Quan Dự Án & Kiến Trúc

**Coffee Journey** là một hệ thống ứng dụng Web Full-stack phục vụ cho việc quản lý và vận hành một chuỗi quán cà phê quy mô vừa và nhỏ. Dự án số hóa toàn bộ quy trình từ khâu gọi món của khách hàng đến khâu trừ kho nguyên liệu và tính lương nhân sự.

*   **Phân hệ Khách hàng (Client/B2C):** Giao diện thương mại điện tử (Menu, Đặt bàn, Giỏ hàng, Đánh giá, Lịch sử, Tích điểm thành viên).
*   **Phân hệ Nhân sự (Staff/POS):** Hệ thống tại điểm bán (Point of Sale), màn hình Bếp (Kitchen View) để nhận đơn, và portal cá nhân để điểm danh (Check-in/out).
*   **Phân hệ Quản trị (Admin/ERP):** Dashboard tổng hợp (tích hợp AI), Quản lý Nhân sự, Ca làm, Kho hàng (có hỗ trợ trừ tự động theo công thức), Quản lý bàn và Voucher.

**Stack Công Nghệ Hiện Tại:**
*   **Frontend:** ReactJS (Vite), Tailwind CSS, Lucide React, SweetAlert2.
*   **Backend & Database:** Supabase (PostgreSQL, Realtime BaaS).

---

## 2. Đánh Giá Hệ Thống (Ưu/Nhược Điểm)

### 🌟 Ưu Điểm Nổi Bật (Thế Mạnh)
1.  **Nghiệp vụ thực tiễn cao:** Khác với các đồ án thông thường chỉ dừng ở mức CRUD, dự án giải quyết được bài toán hạch toán kho (Order -> Recipe -> Inventory) và chấm công nhân sự.
2.  **Đồng bộ Thời Gian Thực (Real-time UX):** Tối ưu hóa trải nghiệm khách hàng và vận hành thông qua Supabase Realtime (Không cần F5 để thấy đơn hàng chuyển trạng thái).
3.  **UI/UX Cao Cấp:** Giao diện tách biệt rõ ràng, hỗ trợ Dark/Light mode, hiệu ứng âm thanh cảnh báo và các tooltip trực quan.
4.  **Ứng dụng AI:** Dùng AI (dù đang ở mức logic mô phỏng) để tư vấn nhập hàng và phân tích doanh thu trên Dashboard.

### ⚠️ Điểm Hạn Chế Cần Khắc Phục (Nợ Kỹ Thuật)
1.  **Quá tải ở App.jsx:** Tệp gốc chứa quá nhiều State toàn cục (Global State) gây hiện tượng Prop Drilling.
2.  **Authentication chưa chuẩn hóa:** Việc lưu thông tin người dùng (`coffee_user`) thô dưới dạng JSON trong Storage tiềm ẩn rủi ro thao túng quyền lực từ phía Client.
3.  **Tối ưu Loading (Bundle Size):** Toàn bộ Admin và Client đang được đóng gói chung. Lần truy cập đầu tiên khách hàng phải tải luôn cả Code của Admin.

---

## 3. Phân Tích Sâu Các Luồng Logic Phức Tạp (Kèm Code)

### 3.1. Logic Quản lý Tồn kho Tự động (Inventory & Recipe Automation)
Khi đơn hàng hoàn thành, hệ thống tự động tra cứu công thức của từng món trong đơn để trừ đi lượng nguyên liệu tương ứng trong kho.

**Trích xuất từ:** `src/utils/inventoryUtils.js`
```javascript
export const autoDeductInventoryForOrder = async (orderId) => {
  // 1. Lấy chi tiết đơn hàng
  const { data: orderDetails } = await supabase.from('chitietdonhang').eq('DonHangID', orderId)

  // 2. Lấy công thức pha chế tương ứng với các món trong đơn
  const { data: recipes } = await supabase.from('congthucphache').in('SanPhamID', sanPhamIds)

  // 3. Tính toán tổng nguyên liệu cần trừ (Gom nhóm theo ID Nguyên Liệu)
  const ingredientDeductions = {}
  recipes.forEach(recipe => {
    const totalNeeded = recipe.SoLuongCan * productQuantities[recipe.SanPhamID]
    ingredientDeductions[recipe.NguyenLieuID] = (ingredientDeductions[recipe.NguyenLieuID] || 0) + totalNeeded
  })

  // 4. Cập nhật tồn kho (Đảm bảo không bị âm)
  const promises = currentInventory.map(inv => {
    let newQty = Number(inv.SoLuongTon) - (ingredientDeductions[inv.NguyenLieuID] || 0)
    return supabase.from('nguyenlieu').update({ SoLuongTon: Math.max(0, newQty) }).eq('NguyenLieuID', inv.NguyenLieuID)
  })
  await Promise.all(promises)

  // 5. Tự động sinh Log Phiếu Xuất
  await supabase.from('phieuxuatkho').insert({ GhiChu: `Xuất tự động từ pha chế`, DonHangID: orderId })
}
```
*Giải thích:* Thuật toán sử dụng mảng phụ trợ `ingredientDeductions` để gom nhóm tất cả các nguyên liệu giống nhau từ nhiều món khác nhau trước khi thực hiện UPDATE Database, giúp giảm thiểu số lượng Request (N+1 Query Problem).

### 3.2. Logic Đồng bộ Thời gian thực (Real-time Order Tracking)
Gửi thông báo trạng thái đơn hàng lập tức đến đúng khách hàng đang đặt.

**Trích xuất từ:** `src/App.jsx`
```javascript
useEffect(() => {
  if (!user) return
  // Kênh được thiết lập riêng biệt theo ID người dùng
  const channel = supabase.channel(`customer_order_notify_${user.NguoiDungID}`)
    .on('postgres_changes', {
        event: 'UPDATE', 
        schema: 'public', 
        table: 'donhang',
        filter: `KhachHangID=eq.${user.NguoiDungID}` // BỘ LỌC CỰC KỲ QUAN TRỌNG
      }, 
      (payload) => {
        if (payload.new.TrangThai !== payload.old.TrangThai) {
          showNotify(`Trạng thái đơn #${payload.new.MaDonHang} đã chuyển sang: ${payload.new.TrangThai}`)
        }
      }
    ).subscribe()
  return () => supabase.removeChannel(channel) // Dọn dẹp RAM khi thoát
}, [user])
```
*Giải thích:* Việc dùng cú pháp `filter: KhachHangID=eq...` của Supabase đảm bảo tính bảo mật (khách hàng không bắt được gói tin mạng của nhau) và tối ưu băng thông máy chủ.

### 3.3. Logic Quản lý Giỏ hàng (Deep Matching Aggregation)
Gộp đúng món nếu chung ID và chung MỌI Topping.

**Trích xuất từ:** `src/App.jsx`
```javascript
const addToCart = (item) => {
  setCart((prev) => {
    const matches = prev.findIndex(
      (c) =>
        c.SanPhamID === item.SanPhamID &&
        c.selectedSize?.id === item.selectedSize?.id &&
        JSON.stringify(c.selectedToppings) === JSON.stringify(item.selectedToppings)
    )

    if (matches > -1) {
      const copy = [...prev]
      copy[matches].quantity += item.quantity // Tăng số lượng nếu y hệt
      return copy
    }
    return [...prev, item] // Tạo dòng mới nếu khác Topping/Size
  })
}
```
*Giải thích:* So sánh Object trong Javascript rất khó. Thủ thuật dùng `JSON.stringify` để ép mảng object Topping thành chuỗi là cách làm nhanh gọn và hiệu quả để so sánh tính đồng nhất của món ăn.

### 3.4. Logic Quản lý Phân Quyền (RBAC - Role Based Access Control)
Chặn đứng người dùng không có thẩm quyền truy cập URL Admin.

**Trích xuất từ:** `src/App.jsx`
```javascript
useEffect(() => {
  if (user) {
    const isCustomerRoute = !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/staff')
    if (isCustomerRoute) {
      if ([1, 2].includes(user.VaiTroID)) navigate('/admin', { replace: true })
      else if ([3, 4, 5].includes(user.VaiTroID)) navigate('/staff', { replace: true })
    }
  } else {
    // Yêu cầu đăng nhập cho route nhạy cảm của khách
    if (['/history', '/profile'].includes(location.pathname)) {
      navigate('/'); setAuthModalOpen(true); showNotify('Vui lòng đăng nhập!')
    }
  }
}, [user, location.pathname, navigate])
```
*Giải thích:* Sử dụng ID của vai trò (1: Admin, 2: Manager, v.v.) kết hợp `useLocation` để chặn người dùng thao tác URL thủ công. Tuy nhiên, logic này vẫn thực thi ở Client-side.

---

## 4. Tư Vấn & Lộ Trình Nâng Cấp

Để đưa dự án đạt chuẩn **Production-ready (Thương mại hóa)**, dưới đây là lộ trình các bước tiếp theo nên được thực hiện:

### Giai đoạn 1: Refactoring (Làm Sạch Kiến Trúc)
1.  **Redux Toolkit / Zustand:** Chuyển `cart`, `user`, và `notifications` vào Global Store, giảm tải 50% số dòng code trong `App.jsx`.
2.  **React.lazy() cho Code Splitting:** Tách Router thành các Chunk file riêng.
    ```javascript
    // Ví dụ nâng cấp Router
    const AdminLayout = React.lazy(() => import('./admin/AdminLayout'))
    // Chỉ tải AdminLayout khi URL là /admin
    ```
3.  **Bảo mật JWT (Supabase Auth):** Xóa bỏ việc lưu thông tin user qua `localStorage/sessionStorage`. Chuyển sang sử dụng `supabase.auth.signInWithPassword()` để bảo vệ Database bằng Row Level Security (RLS).

### Giai đoạn 2: Nâng Cấp Tính Năng Hiện Có
1.  **Hoàn thiện luồng Thanh toán:** Tích hợp API Cổng thanh toán (ZaloPay Sandbox hoặc VNPay) cho luồng Checkout (Hiện tại chỉ có COD).
2.  **Quản lý Khách hàng thân thiết:** Mở rộng `membershipUtils.js`, tạo một thẻ Barcode ảo trong Profile để khách có thể quét tích điểm trực tiếp tại Quầy POS.
3.  **Tối ưu Hạch toán Kho:** Cho phép Admin cài đặt "Khoảng hao hụt cho phép" (Ví dụ: Pha chế rớt, đổ) vào báo cáo cuối ngày mà không cần lập phiếu xuất tay từng lần.

### Giai đoạn 3: Tích hợp Tính Năng Mới (Advanced)
1.  **Tự động hóa Nhập hàng (Auto-PO):** AI sẽ tự check bảng `nguyenlieu`, nếu `SoLuongTon < SoLuongToiThieu`, hệ thống tự động draft một Phiếu Yêu Cầu Nhập Hàng và gửi Email/Notification cho Quản lý.
2.  **Phê duyệt nghỉ phép (Leave Management):** Trong `StaffAccountView`, cho phép nhân sự gửi Request đổi ca hoặc nghỉ phép, Real-time báo về cho Admin duyệt. Lịch làm việc sẽ tự cập nhật khi được Approved. 
