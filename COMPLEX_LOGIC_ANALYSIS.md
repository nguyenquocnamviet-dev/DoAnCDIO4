# Phân Tích Các Luồng Logic Phức Tạp Trong Dự Án Coffee Journey (Có Code Minh Họa)

Tài liệu này phân tích chi tiết các luồng nghiệp vụ và logic kỹ thuật cốt lõi, đi kèm với giải thích mã nguồn (code) thực tế đang vận hành trong hệ thống Coffee Journey.

---

## 1. Logic Quản lý Tồn kho Tự động (Inventory & Recipe Automation)

Đây là chức năng quan trọng nhất kết nối giữa Bán Hàng và Quản Lý Kho. Khi một đơn hàng hoàn thành, hệ thống không chỉ đổi trạng thái mà còn tự động tính toán và trừ nguyên liệu dựa trên công thức.

**File tham chiếu:** `src/utils/inventoryUtils.js`

```javascript
export const autoDeductInventoryForOrder = async (orderId) => {
  // 1. Fetch chi tiết đơn hàng (các sản phẩm size)
  const { data: orderDetails } = await supabase
    .from('chitietdonhang')
    .select(`SoLuong, sanphamsize:SanPhamSizeID (SanPhamID)`)
    .eq('DonHangID', orderId)

  // 2. Fetch công thức pha chế của các SanPhamID này
  const { data: recipes } = await supabase
    .from('congthucphache')
    .select('SanPhamID, NguyenLieuID, SoLuongCan')
    .in('SanPhamID', sanPhamIds)

  // 3. Tính toán tổng lượng nguyên liệu cần trừ 
  // Bằng cách nhân: Số lượng món x Định mức công thức
  const ingredientDeductions = {}
  recipes.forEach(recipe => {
    const spQty = productQuantities[recipe.SanPhamID] || 0
    const totalNeeded = recipe.SoLuongCan * spQty
    ingredientDeductions[recipe.NguyenLieuID] = (ingredientDeductions[recipe.NguyenLieuID] || 0) + totalNeeded
  })

  // 4. Update số lượng tồn kho mới vào bảng `nguyenlieu`
  const promises = currentInventory.map(inv => {
    const deduction = ingredientDeductions[inv.NguyenLieuID] || 0
    let newQty = Number(inv.SoLuongTon) - deduction
    if (newQty < 0) newQty = 0 // Đảm bảo kho không bị âm
    return supabase.from('nguyenlieu').update({ SoLuongTon: newQty }).eq('NguyenLieuID', inv.NguyenLieuID)
  })
  await Promise.all(promises)

  // 5. Hệ thống tự động sinh ra một "Phiếu xuất kho tự động" (phieuxuatkho)
  await supabase.from('phieuxuatkho').insert({
    GhiChu: `Xuất tự động từ pha chế`,
    DonHangID: orderId
  })
}
```

**Giải thích logic:**
Bản chất đây là thao tác tính toán đa tầng (Multi-layer aggregation). Đầu tiên phải lấy danh sách món trong đơn -> tìm công thức của từng món -> nhóm (group) và cộng dồn (sum) các nguyên liệu trùng nhau (ví dụ: món A cần 10g đường, món B cần 15g đường thì tổng trừ là 25g) -> Cập nhật Database -> Sinh log lưu vết.

---

## 2. Logic Đồng bộ Thời gian thực (Real-time Synchronization)

Sử dụng cơ chế WebSocket của Supabase để đẩy trực tiếp thay đổi từ Server xuống Client mà không cần Load lại trang.

**File tham chiếu:** `src/App.jsx`

```javascript
useEffect(() => {
  if (!user) return

  // Đăng ký kênh (channel) dành riêng cho người dùng này
  const channelOrder = supabase
    .channel(`customer_order_notify_${user.NguoiDungID}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE', // Chỉ bắt sự kiện UPDATE
        schema: 'public',
        table: 'donhang',
        filter: `KhachHangID=eq.${user.NguoiDungID}` // RLS Filter: Chỉ lấy đơn của chính User này
      },
      (payload) => {
        const newRow = payload.new
        const oldRow = payload.old
      
        // Kiểm tra nếu thực sự có sự thay đổi về Trạng Thái
        if (newRow && oldRow && newRow.TrangThai !== oldRow.TrangThai) {
          if (newRow.TrangThai === 'DangGiao') {
            showNotify(`🚚 Đơn hàng #${newRow.MaDonHang} đang được giao!`)
          } else if (newRow.TrangThai === 'HoanThanh') {
            showNotify(`✅ Đơn hàng #${newRow.MaDonHang} đã giao thành công!`)
          }
        }
      }
    )
    .subscribe()

  // Cleanup function: Ngắt kết nối khi Component unmount
  return () => supabase.removeChannel(channelOrder)
}, [user])
```

**Giải thích logic:**
Hook `useEffect` khởi tạo một Realtime Subscription khi `user` đăng nhập. Mấu chốt ở đây là `filter: KhachHangID=eq.${user.NguoiDungID}` giúp tối ưu băng thông, đảm bảo một khách hàng A sẽ không bao giờ nhận được Ping dữ liệu cập nhật từ Đơn hàng của khách hàng B.

---

## 3. Logic Quản lý Ca làm và Tính lương (Shift & Payroll Engine)

Logic này kết hợp giữa số giờ được xếp ca (Scheduled) và số giờ thực tế bấm máy châm công (Timeclock Logs).

**File tham chiếu:** `src/utils/shiftUtils.js`

```javascript
export const calculateSingleStaffPayroll = (staffId, staffName, roleName, type) => {
  // 1. Lấy tổng số giờ được xếp trong tuần
  const { totalHours: scheduledHours } = getStaffScheduledHours(staffId)
  const logs = getTimeclockLogs()

  // 2. Lọc log check-in/out thực tế của nhân viên này trong tháng hiện tại
  const staffLogs = logs.filter(l => String(l.userId) === String(staffId) && isCurrentMonth(l.date))
  const actualWorkedHours = staffLogs.reduce((sum, l) => sum + (Number(l.totalHours) || 0), 0)

  // 3. Lấy định mức lương dựa trên Chức Vụ (Role) và Loại (Full/Part-time)
  const salaryRate = getStaffSalaryRate(roleName, type)
  let estimatedMonthlySalary = 0

  if (type === 'Full-time') {
    // Lương cứng không đổi
    estimatedMonthlySalary = salaryRate.monthly 
  } else {
    // Part-time: Lấy Max giữa (Số giờ xếp ca * 4 tuần) hoặc (Số giờ làm thực tế) nhân với lương theo giờ
    const effectiveHours = Math.max(scheduledHours * 4, actualWorkedHours)
    estimatedMonthlySalary = Math.round(effectiveHours * salaryRate.hourly)
  }

  return { estimatedMonthlySalary, actualWorkedHours, ... }
}
```

**Giải thích logic:**
Hệ thống tính lương rất linh hoạt. Với `Full-time`, lương cố định (ví dụ: Quản lý = 10tr/tháng). Với `Part-time`, hệ thống tính toán dựa trên mức lương giờ (ví dụ: Pha chế = 35k/giờ). Đặc biệt, biến `effectiveHours` có tính năng bảo vệ nhân viên: Nếu họ được xếp ca nhưng do lỗi hệ thống không check-in được, họ vẫn nhận lương theo giờ xếp ca tối thiểu.

---

## 4. Logic Xử lý Hạng Thành Viên & Tích Điểm (Membership & Point System)

Hệ thống Gamification giúp giữ chân khách hàng.

**File tham chiếu:** `src/utils/membershipUtils.js`

```javascript
// Tính điểm dựa trên số tiền chi tiêu
export const calculateOrderPoints = (amountVND = 0) => {
  return Math.floor(amountVND / 1000) // 1,000 VND = 1 điểm
}

// Map điểm thành Hạng (Rank)
export const getMembershipRank = (points = 0) => {
  const p = parseInt(points) || 0
  if (p > 1000) return MEMBERSHIP_TIERS[5] // Kim Cương
  if (p >= 700) return MEMBERSHIP_TIERS[4] // Bạch Kim
  if (p >= 500) return MEMBERSHIP_TIERS[3] // Vàng
  if (p >= 300) return MEMBERSHIP_TIERS[2] // Bạc
  if (p >= 100) return MEMBERSHIP_TIERS[1] // Đồng
  return MEMBERSHIP_TIERS[0] // Thường
}
```

**Giải thích logic:**
Rất đơn giản và tuyến tính (Linear). Điểm mạnh là mảng `MEMBERSHIP_TIERS` được định nghĩa kèm `discount` (Phần trăm giảm giá) và UI `color`, giúp toàn bộ hệ thống (từ Cart đến Profile) tái sử dụng dễ dàng.

---

## 5. Logic Quản lý Giỏ hàng Đa dạng (Cart Aggregation - Deep Matching)

Xử lý vấn đề hóc búa nhất của F&B E-commerce: Khách order cùng 1 món nước, nhưng 1 ly chọn Topping Trân châu, 1 ly chọn Thạch dừa. Nếu chỉ check `ID sản phẩm`, chúng sẽ bị gộp thành 2 ly giống nhau.

**File tham chiếu:** `src/App.jsx` (hàm `addToCart`)

```javascript
const addToCart = (item) => {
  setCart((prev) => {
    // Deep Matching: Tìm item trùng lặp
    const matches = prev.findIndex(
      (c) =>
        c.SanPhamID === item.SanPhamID && // Cùng ID
        c.selectedSize?.id === item.selectedSize?.id && // Cùng Size
        JSON.stringify(c.selectedToppings) === JSON.stringify(item.selectedToppings) // Cùng toàn bộ Topping
    )

    if (matches > -1) {
      // Nếu giống hệt 100% -> Tăng số lượng (Quantity)
      const copy = [...prev]
      copy[matches].quantity += item.quantity
      return copy
    }
    // Nếu khác dù chỉ 1 Topping -> Tạo dòng mới trong giỏ
    return [...prev, item]
  })
}
```

**Giải thích logic:**
Bí quyết nằm ở dòng `JSON.stringify(c.selectedToppings) === JSON.stringify(item.selectedToppings)`. Mảng chứa object topping được chuyển thành chuỗi String để so sánh. Nhờ vậy, giỏ hàng có thể phân biệt chính xác hàng ngàn biến thể của cùng một đồ uống mà không bị sai sót khi tính tiền.
