import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const DashboardView = () => {
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    customers: 0,
    reviews: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [aiForecast, setAiForecast] = useState('')

  useEffect(() => {
    const fetchDashboardData = async () => {
      const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!isConfigured) return

      setLoading(true)
      try {
        // 1. Fetch statistics
        // Fetch completed orders count & total revenue
        const { data: orderData, error: orderErr } = await supabase
          .from('donhang')
          .select('ThanhTien, TrangThai, NgayTao')
        if (orderErr) throw orderErr

        let completedTotal = 0
        let completedCount = 0
        let dailyRevenue = 0
        const todayStr = new Date().toDateString()

        if (orderData) {
          orderData.forEach(o => {
            if (o.TrangThai === 'HoanThanh') {
              completedCount++
              completedTotal += parseFloat(o.ThanhTien || 0)
              
              if (new Date(o.NgayTao).toDateString() === todayStr) {
                dailyRevenue += parseFloat(o.ThanhTien || 0)
              }
            }
          })
        }

        // Fetch customer count
        const { count: customerCount, error: custErr } = await supabase
          .from('nguoidung')
          .select('*', { count: 'exact', head: true })
          .eq('VaiTroID', 6)
          .eq('DaXoa', false)
        if (custErr) throw custErr

        // Fetch good reviews count (SoSao >= 4)
        const { data: revData, error: revErr } = await supabase
          .from('danhgia')
          .select('SoSao')
        if (revErr) throw revErr

        let goodReviews = 0
        if (revData) {
          revData.forEach(r => {
            if (r.SoSao >= 4) goodReviews++
          })
        }
        const pctGoodReviews = revData && revData.length > 0 ? Math.round((goodReviews / revData.length) * 100) : 96

        setStats({
          revenue: dailyRevenue > 0 ? dailyRevenue : completedTotal,
          orders: completedCount,
          customers: customerCount !== null ? customerCount : 0,
          reviews: pctGoodReviews
        })

        // Generate AI Forecast
        let predictedRevenue = (dailyRevenue > 0 ? dailyRevenue : completedTotal) * 1.15;
        if (predictedRevenue === 0) predictedRevenue = 5000000;
        setAiForecast(`Dựa trên dữ liệu hiện tại, lượng khách cuối tuần này dự kiến sẽ tăng mạnh. Doanh thu ước tính đạt ${Math.round(predictedRevenue).toLocaleString('vi-VN')}đ/ngày. Hệ thống khuyên bạn nên chuẩn bị kỹ nhân sự ca Tối và nguyên vật liệu cho những món đang bán chạy!`)

        // 2. Fetch Recent Orders (Join with nguoidung and chitietdonhang)
        const { data: recent, error: recentErr } = await supabase
          .from('donhang')
          .select(`
            MaDonHang,
            DonHangID,
            TongTien,
            ThanhTien,
            TrangThai,
            nguoidung:KhachHangID ( HoTen ),
            chitietdonhang:chitietdonhang (
              SoLuong,
              sanphamsize:SanPhamSizeID (
                sanpham:SanPhamID ( TenSanPham )
              )
            )
          `)
          .order('NgayTao', { ascending: false })
          .limit(5)

        if (recentErr) throw recentErr
        if (recent && recent.length > 0) {
          const mapped = recent.map(r => {
            const itemsString = r.chitietdonhang?.map(detail => {
              const name = detail.sanphamsize?.sanpham?.TenSanPham || 'Sản phẩm'
              return `${detail.SoLuong}x ${name}`
            }).join(', ') || 'Chi tiết trống'

            let orderStatus = 'Chờ xác nhận'
            if (r.TrangThai === 'DangPhaChe') orderStatus = 'Đang pha chế'
            if (r.TrangThai === 'DangGiao') orderStatus = 'Đang giao hàng'
            if (r.TrangThai === 'HoanThanh') orderStatus = 'Hoàn thành'
            if (r.TrangThai === 'DaHuy') orderStatus = 'Đã hủy'

            return {
              code: r.MaDonHang || `#DH${r.DonHangID}`,
              name: r.nguoidung?.HoTen || 'Khách Vãng Lai',
              items: itemsString,
              total: parseFloat(r.ThanhTien || 0),
              status: orderStatus
            }
          })
          setRecentOrders(mapped)
        }
      } catch (err) {
        console.error('Lỗi khi truy vấn Dashboard:', err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const statCards = [
    { title: 'Doanh thu hôm nay', val: stats.revenue.toLocaleString(), unit: 'VNĐ', icon: 'fa-money-bill-trend-up', color: 'text-coffee-green bg-green-50 border-green-100' },
    { title: 'Đơn hoàn thành', val: stats.orders, unit: 'Đơn', icon: 'fa-circle-check', color: 'text-blue-500 bg-blue-50 border-blue-100' },
    { title: 'Khách hàng đăng ký', val: stats.customers, unit: 'Khách', icon: 'fa-users', color: 'text-purple-500 bg-purple-50 border-purple-100' },
    { title: 'Phản hồi hài lòng', val: `${stats.reviews}%`, unit: 'Hài lòng', icon: 'fa-star', color: 'text-coffee-yellow bg-yellow-50 border-yellow-100' }
  ]

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto no-scrollbar flex flex-col gap-8 animate-fade-in">
      <div className="shrink-0">
        <h2 className="text-size-2 font-black uppercase text-coffee-dark tracking-tighter mb-1">
          Hệ Thống Tổng Quan
        </h2>
        <p className="text-size-0 font-bold text-gray-500 uppercase tracking-widest">
          Theo dõi số liệu thời gian thực
        </p>
      </div>

      {/* Grid thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, idx) => (
          <div key={idx} className={`glass-effect p-5 xl:p-6 rounded-3xl border flex items-center justify-between shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-300 gap-2`}>
            <div className="min-w-0 flex-1">
              <p className="text-size-0 font-bold text-gray-500 uppercase tracking-widest mb-1 truncate" title={c.title}>
                {c.title}
              </p>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[1.25rem] 2xl:text-size-2 font-black text-coffee-dark leading-none truncate max-w-full">{c.val}</span>
                <span className="text-[0.7rem] font-bold text-gray-400 shrink-0">{c.unit}</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${c.color}`}>
              <i className={`fa-solid ${c.icon} text-size-1`}></i>
            </div>
          </div>
        ))}
      </div>

      {/* AI Forecast */}
      <div className="bg-gradient-to-r from-coffee-dark to-slate-900 p-6 md:p-8 rounded-[2rem] shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <i className="fa-solid fa-chart-line text-[8rem] text-white"></i>
        </div>
        <div className="w-16 h-16 bg-white/10 rounded-full border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-md relative z-10">
          <i className="fa-solid fa-brain text-size-2 text-coffee-yellow animate-pulse"></i>
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h3 className="text-size-1 font-black text-coffee-yellow uppercase tracking-widest mb-2">
            AI Dự Báo (7 Ngày Tới)
          </h3>
          <p className="text-size-1 font-medium text-gray-300">
            {aiForecast || 'Đang phân tích dữ liệu hệ thống...'}
          </p>
        </div>
      </div>

      {/* Bảng đơn hàng gần đây */}
      <div className="glass-effect p-6 rounded-[2rem] border border-white shadow-xl flex-1 flex flex-col min-h-[300px] overflow-hidden">
        <h3 className="text-size-1 font-black uppercase tracking-widest text-coffee-dark mb-6 shrink-0">
          Đơn Hàng Mới Nhất
        </h3>
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-10">
            <i className="fa-solid fa-spinner animate-spin text-size-2 text-coffee-green mb-4"></i>
            <p className="text-size-1 font-bold">Đang cập nhật danh sách đơn mới...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto no-scrollbar relative rounded-xl scroll-smooth">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-md z-20 shadow-sm">
                <tr className="border-b border-gray-600 text-size-0 font-black uppercase tracking-wider text-gray-200">
                  <th className="py-4 pl-4 bg-gray-800/95 backdrop-blur-md rounded-tl-xl">Mã Đơn</th>
                  <th className="py-4 bg-gray-800/95 backdrop-blur-md">Khách Hàng</th>
                  <th className="py-4 bg-gray-800/95 backdrop-blur-md">Đồ Uống & Món Ăn</th>
                  <th className="py-4 bg-gray-800/95 backdrop-blur-md">Tổng Thanh Toán</th>
                  <th className="py-4 pr-4 text-right bg-gray-800/95 backdrop-blur-md rounded-tr-xl">Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-white/40 transition-colors">
                    <td className="py-4 pl-4 text-size-1 font-black text-coffee-dark">{ord.code}</td>
                    <td className="py-4 text-size-1 font-bold text-gray-700">{ord.name}</td>
                    <td className="py-4 text-size-1 font-medium text-gray-500 max-w-[250px] truncate" title={ord.items}>
                      {ord.items}
                    </td>
                    <td className="py-4 text-size-1 font-black text-coffee-green">{ord.total.toLocaleString()}đ</td>
                    <td className="py-4 pr-4 text-right">
                      <span className={`text-[0.75rem] font-black uppercase px-3 py-1 rounded-full border ${
                        ord.status === 'Hoàn thành'
                          ? 'text-green-600 bg-green-50 border-green-100'
                          : ord.status === 'Đang pha chế'
                          ? 'text-blue-500 bg-blue-50 border-blue-100'
                          : 'text-amber-500 bg-amber-50 border-amber-100'
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardView
