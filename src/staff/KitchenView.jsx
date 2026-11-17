import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { autoDeductInventoryForOrder } from '../utils/inventoryUtils'

const KitchenView = ({ showNotify }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchOrders = async () => {
    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!isConfigured) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('donhang')
        .select(`
          DonHangID,
          MaDonHang,
          TrangThai,
          GhiChu,
          NgayTao,
          chitietdonhang:chitietdonhang (
            SoLuong,
            GhiChu,
            sanphamsize:SanPhamSizeID (
              sanpham:SanPhamID ( TenSanPham )
            )
          )
        `)
        // Chỉ lấy các đơn đang chờ xác nhận (mới vào) hoặc đang pha chế
        .in('TrangThai', ['ChoXacNhan', 'DangPhaChe'])
        .order('NgayTao', { ascending: true }) // Cũ nhất lên trước

      if (error) throw error
      if (data) {
        setOrders(data)
      }
    } catch (err) {
      console.error('Lỗi khi tải đơn bếp:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()

    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!isConfigured) return

    const channel = supabase
      .channel('kitchen_donhang_realtime')
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

  const updateStatus = async (orderId, currentCode, targetStatusStr, currentStatus) => {
    let dbStatusEnum = targetStatusStr === 'Đang pha chế' ? 'DangPhaChe' : 
                       targetStatusStr === 'Hoàn thành' ? 'HoanThanh' : 
                       targetStatusStr === 'Đang giao' ? 'DangGiao' : 'DangPhaChe';

    // If order type is "Tại Quán" or "Mang Đi", after making it's Done (HoanThanh).
    // If it's "Giao Hàng", after making it's "DangGiao".
    // We didn't fetch LoaiDonHangID in this simple query, so let's just use HoanThanh for now or fetch it.
    
    // For simplicity, let's just let the bartender click "Nhận Đơn" (DangPhaChe) -> "Xong" (HoanThanh)
    if (targetStatusStr === 'Xong') {
      // Need to check if it's delivery. Fetch full order to be safe.
      const { data: oData } = await supabase.from('donhang').select('LoaiDonHangID').eq('DonHangID', orderId).single();
      if (oData && oData.LoaiDonHangID === 3) {
        dbStatusEnum = 'DangGiao';
      } else {
        dbStatusEnum = 'HoanThanh';
      }
    }

    try {
      const { error } = await supabase
        .from('donhang')
        .update({ TrangThai: dbStatusEnum })
        .eq('DonHangID', orderId)

      if (error) throw error

      // Nếu đơn được chuyển thành Hoàn Thành (Pha chế xong), kích hoạt trừ kho
      if ((dbStatusEnum === 'HoanThanh' || dbStatusEnum === 'DangGiao') && currentStatus !== 'HoanThanh' && currentStatus !== 'DangGiao') {
        autoDeductInventoryForOrder(orderId).catch(e => console.error("Auto Deduct Error:", e))
      }

      showNotify(`Đơn ${currentCode} cập nhật: ${targetStatusStr}`)
      setOrders(prev => prev.filter(o => o.DonHangID !== orderId)) // Remove from kitchen view if done
      // the realtime subscription will also re-fetch
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái:', err.message)
    }
  }

  // Filter orders
  const pendingOrders = orders.filter(o => o.TrangThai === 'ChoXacNhan')
  const processingOrders = orders.filter(o => o.TrangThai === 'DangPhaChe')

  const TicketCard = ({ order, type }) => {
    const time = new Date(order.NgayTao).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    return (
      <div className={`p-4 rounded-2xl border-l-4 shadow-sm bg-white/80 backdrop-blur-md relative overflow-hidden group ${
        type === 'pending' ? 'border-amber-500 hover:border-amber-400' : 'border-blue-500 hover:border-blue-400'
      }`}>
        <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
          <div>
            <h4 className="font-black text-coffee-dark text-size-1 leading-none">{order.MaDonHang}</h4>
            <span className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-wider">{time}</span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[0.7rem] font-black uppercase ${
            type === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
          }`}>
            {type === 'pending' ? 'Chờ nhận' : 'Đang làm'}
          </span>
        </div>
        
        <div className="space-y-2 mb-4">
          {order.chitietdonhang?.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start">
              <div className="flex-1">
                <span className="font-bold text-[0.95rem] text-coffee-dark">
                  <span className="text-indigo-600 mr-1">{item.SoLuong}x</span>
                  {item.sanphamsize?.sanpham?.TenSanPham}
                </span>
                {item.GhiChu && (
                  <p className="text-[0.8rem] text-gray-500 font-medium italic mt-0.5">+ {item.GhiChu}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {order.GhiChu && (
          <div className="bg-yellow-50 text-yellow-800 text-[0.8rem] p-2 rounded-lg font-medium mb-4 border border-yellow-100">
            <i className="fa-solid fa-triangle-exclamation mr-1"></i> Ghi chú: {order.GhiChu}
          </div>
        )}

        <div className="mt-auto">
          {type === 'pending' ? (
            <button
              onClick={() => updateStatus(order.DonHangID, order.MaDonHang, 'Đang pha chế', order.TrangThai)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-size-1 font-bold rounded-xl transition-colors shadow-md shadow-amber-500/20"
            >
              Nhận Làm
            </button>
          ) : (
            <button
              onClick={() => updateStatus(order.DonHangID, order.MaDonHang, 'Xong', order.TrangThai)}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-size-1 font-bold rounded-xl transition-colors shadow-md shadow-blue-500/20"
            >
              Hoàn Thành
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 h-full flex flex-col gap-6 animate-fade-in overflow-hidden">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-size-2 font-black uppercase text-coffee-dark tracking-tighter mb-1">
            Quầy Pha Chế
          </h2>
          <p className="text-size-0 font-bold text-gray-500 uppercase tracking-widest">
            Quản lý ticket order
          </p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary px-4 py-2 text-size-0">
          <i className="fa-solid fa-arrows-rotate"></i> Làm mới
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex-1 flex justify-center items-center">
          <i className="fa-solid fa-spinner animate-spin text-size-2 text-indigo-500"></i>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Cột 1: Chờ nhận */}
          <div className="flex-1 bg-white/40 rounded-[2rem] border border-white flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white bg-white/60 shrink-0 flex justify-between items-center">
              <h3 className="font-black text-amber-600 uppercase tracking-wider"><i className="fa-regular fa-clock mr-2"></i> Chờ Nhận</h3>
              <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full font-black text-[0.8rem]">{pendingOrders.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {pendingOrders.map(o => <TicketCard key={o.DonHangID} order={o} type="pending" />)}
              {pendingOrders.length === 0 && (
                <div className="text-center text-gray-400 font-bold py-10 opacity-60">Trống</div>
              )}
            </div>
          </div>

          {/* Cột 2: Đang làm */}
          <div className="flex-1 bg-white/40 rounded-[2rem] border border-white flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white bg-white/60 shrink-0 flex justify-between items-center">
              <h3 className="font-black text-blue-600 uppercase tracking-wider"><i className="fa-solid fa-blender mr-2"></i> Đang Pha Chế</h3>
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-black text-[0.8rem]">{processingOrders.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {processingOrders.map(o => <TicketCard key={o.DonHangID} order={o} type="processing" />)}
              {processingOrders.length === 0 && (
                <div className="text-center text-gray-400 font-bold py-10 opacity-60">Trống</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KitchenView
