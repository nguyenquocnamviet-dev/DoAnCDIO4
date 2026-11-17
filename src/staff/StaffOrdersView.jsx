import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const FILTER_TABS = [
  { id: 'Tất cả', label: 'Tất cả' },
  { id: 'Chờ xác nhận', label: 'Chờ nhận' },
  { id: 'Đang pha chế', label: 'Pha chế' },
  { id: 'Hoàn thành', label: 'Hoàn thành' },
]

const StaffOrdersView = ({ showNotify }) => {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('Tất cả')
  const [loading, setLoading] = useState(false)

  const fetchOrders = async () => {
    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!isConfigured) return

    setLoading(true)
    try {
      // Chỉ lấy đơn trong ngày hôm nay cho nhân viên
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('donhang')
        .select(`
          DonHangID,
          MaDonHang,
          TongTien,
          ThanhTien,
          TrangThai,
          GhiChu,
          NgayTao,
          nguoidung:KhachHangID ( NguoiDungID, HoTen ),
          chitietdonhang:chitietdonhang (
            SoLuong,
            sanphamsize:SanPhamSizeID (
              sanpham:SanPhamID ( TenSanPham )
            )
          )
        `)
        .gte('NgayTao', today.toISOString())
        .order('NgayTao', { ascending: false })

      if (error) throw error
      if (data) {
        const mapped = data.map(o => {
          const itemsString = o.chitietdonhang?.map(detail => {
            const name = detail.sanphamsize?.sanpham?.TenSanPham || 'Sản phẩm'
            return `${detail.SoLuong}x ${name}`
          }).join(', ') || 'Chi tiết trống'

          let orderStatus = 'Chờ xác nhận'
          if (o.TrangThai === 'DangPhaChe') orderStatus = 'Đang pha chế'
          if (o.TrangThai === 'DangGiao') orderStatus = 'Đang giao hàng'
          if (o.TrangThai === 'HoanThanh') orderStatus = 'Hoàn thành'
          if (o.TrangThai === 'DaHuy') orderStatus = 'Đã hủy'

          return {
            id: o.MaDonHang || `#DH${o.DonHangID}`,
            id_db: o.DonHangID,
            name: o.nguoidung?.HoTen || 'Khách Vãng Lai',
            items: itemsString,
            total: parseFloat(o.ThanhTien || 0),
            status: orderStatus,
            note: o.GhiChu || 'Không có ghi chú',
            time: new Date(o.NgayTao).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }
        })
        setOrders(mapped)
      }
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()

    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!isConfigured) return

    const channel = supabase
      .channel('staff_donhang_list_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donhang' },
        () => {
          setTimeout(() => fetchOrders(), 1500)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredOrders = orders.filter(o => filter === 'Tất cả' || o.status === filter)

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto no-scrollbar flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-size-2 font-black uppercase text-coffee-dark tracking-tighter mb-1">
            Lịch Sử Đơn Hàng
          </h2>
          <p className="text-size-0 font-bold text-gray-500 uppercase tracking-widest">
            Ca làm việc hôm nay
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="btn-secondary px-4 py-2 text-size-0"
        >
          <i className="fa-solid fa-arrows-rotate"></i> Làm mới
        </button>
      </div>

      <div className="flex gap-2 bg-white/60 p-1.5 rounded-full shadow-inner border border-white/80 overflow-x-auto no-scrollbar w-max max-w-full shrink-0">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-5 py-2 text-size-1 font-bold rounded-full transition-all duration-300 hover:scale-105 active:scale-95 uppercase whitespace-nowrap ${
              filter === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-white/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border border-white">
          <i className="fa-solid fa-spinner animate-spin text-size-2 text-indigo-500 mb-4"></i>
          <p className="text-size-1 font-bold text-gray-500">Đang tải danh sách đơn...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border border-white opacity-60">
          <i className="fa-solid fa-receipt text-size-2 mb-4 text-gray-400"></i>
          <p className="text-size-1 font-bold text-gray-500">Không có đơn nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((ord, idx) => (
            <div key={idx} className="glass-effect p-5 rounded-[1.5rem] border border-white shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-[1rem] font-black text-coffee-dark">{ord.id}</span>
                  <span className="text-[0.8rem] font-bold text-gray-400">{ord.time}</span>
                  <span className={`text-[0.7rem] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    ord.status === 'Hoàn thành'
                      ? 'text-green-600 bg-green-50 border-green-100'
                      : ord.status === 'Đang pha chế'
                      ? 'text-blue-500 bg-blue-50 border-blue-100'
                      : ord.status === 'Đã hủy'
                      ? 'text-red-500 bg-red-50 border-red-100'
                      : 'text-amber-500 bg-amber-50 border-amber-100'
                  }`}>
                    {ord.status}
                  </span>
                  <span className="text-size-1 font-black text-indigo-600 ml-auto md:ml-0">
                    {ord.total.toLocaleString()}đ
                  </span>
                </div>
                <p className="text-[0.9rem] font-bold text-gray-700 mb-1">Khách: {ord.name}</p>
                <p className="text-[0.9rem] font-medium text-gray-500 mb-1">Món: {ord.items}</p>
                <p className="text-[0.85rem] font-bold text-gray-400 italic">Ghi chú: {ord.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default StaffOrdersView
