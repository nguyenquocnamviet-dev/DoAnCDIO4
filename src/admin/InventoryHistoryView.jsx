import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const InventoryHistoryView = ({ showNotify }) => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedTicket, setExpandedTicket] = useState(null)
  const [filterType, setFilterType] = useState('ALL') // 'ALL' | 'NHAP' | 'XUAT'

  const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

  const fetchTickets = async () => {
    if (!isConfigured) return
    setLoading(true)
    try {
      const { data: importData, error: importError } = await supabase
        .from('phieunhapkho')
        .select(`
          PhieuNhapID,
          NgayTao,
          GhiChu,
          chitietnhapkho (
            ChiTietID,
            NguyenLieuID,
            SoLuong,
            nguyenlieu ( TenNguyenLieu, DonViTinh )
          )
        `)

      const { data: exportData, error: exportError } = await supabase
        .from('phieuxuatkho')
        .select(`
          PhieuXuatID,
          NgayTao,
          GhiChu,
          DonHangID,
          chitietxuatkho (
            ChiTietID,
            NguyenLieuID,
            SoLuong,
            nguyenlieu ( TenNguyenLieu, DonViTinh )
          )
        `)

      if (importError) {
        console.error("Lỗi tải phiếu nhập:", importError);
        alert("Lỗi tải phiếu nhập: " + importError.message);
      }
      if (exportError) {
        console.error("Lỗi tải phiếu xuất:", exportError);
        alert("Lỗi tải phiếu xuất: " + exportError.message);
      }

      const imports = (importData || []).map(t => ({
        id: t.PhieuNhapID,
        type: 'NHAP',
        NgayTao: t.NgayTao,
        GhiChu: t.GhiChu,
        details: t.chitietnhapkho
      }));

      const exports = (exportData || []).map(t => ({
        id: t.PhieuXuatID,
        type: 'XUAT',
        NgayTao: t.NgayTao,
        GhiChu: t.GhiChu,
        DonHangID: t.DonHangID,
        details: t.chitietxuatkho
      }));

      const combined = [...imports, ...exports].sort((a, b) => new Date(b.NgayTao) - new Date(a.NgayTao));

      setTickets(combined);
    } catch (err) {
      console.error('Lỗi tải lịch sử phiếu:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  return (
    <div className="flex-1 animate-fade-in flex flex-col gap-6">
      {loading ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border border-white">
          <i className="fa-solid fa-spinner animate-spin text-size-2 text-coffee-green mb-4"></i>
          <p className="text-size-1 font-bold text-gray-500">Đang tải lịch sử phiếu...</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2 rounded-xl font-bold text-[0.85rem] uppercase transition-all ${filterType === 'ALL' ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('NHAP')}
              className={`px-4 py-2 rounded-xl font-bold text-[0.85rem] uppercase transition-all ${filterType === 'NHAP' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'}`}
            >
              <i className="fa-solid fa-arrow-down mr-1"></i> Bảng Nhập Kho
            </button>
            <button
              onClick={() => setFilterType('XUAT')}
              className={`px-4 py-2 rounded-xl font-bold text-[0.85rem] uppercase transition-all ${filterType === 'XUAT' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'}`}
            >
              <i className="fa-solid fa-arrow-up mr-1"></i> Bảng Xuất Kho
            </button>
          </div>

          <div className="glass-effect p-6 rounded-[2rem] border border-white shadow-md flex-1 overflow-auto no-scrollbar relative scroll-smooth">
            <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-md z-20 shadow-sm">
              <tr className="border-b border-gray-600 text-size-0 font-black uppercase tracking-wider text-gray-200">
                <th className="py-4 pl-4 bg-gray-800/95 backdrop-blur-md rounded-tl-xl">Mã Phiếu</th>
                <th className="py-4 bg-gray-800/95 backdrop-blur-md">Loại Phiếu</th>
                <th className="py-4 bg-gray-800/95 backdrop-blur-md">Thời Gian</th>
                <th className="py-4 bg-gray-800/95 backdrop-blur-md">Ghi Chú</th>
                <th className="py-4 pr-4 text-right bg-gray-800/95 backdrop-blur-md rounded-tr-xl">Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
                {tickets.filter(t => filterType === 'ALL' || t.type === filterType).map(t => {
                  const date = new Date(t.NgayTao).toLocaleString('vi-VN')
                  const isImport = t.type === 'NHAP'
                  return (
                    <React.Fragment key={t.id}>
                      <tr className="border-b border-gray-50 hover:bg-white/40 transition-colors font-bold">
                        <td className="py-4 pl-4 text-gray-600 text-[0.8rem] uppercase font-mono">{t.id.split('-')[0]}...</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-[0.75rem] font-black uppercase ${isImport ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                            {isImport ? 'Nhập Kho' : 'Xuất Kho'}
                          </span>
                        </td>
                        <td className="py-4 text-gray-600 text-size-0">{date}</td>
                        <td className="py-4 text-gray-500 text-size-0 max-w-[200px] truncate">{t.GhiChu || (t.DonHangID ? `Từ đơn hàng #${t.DonHangID}` : '-')}</td>
                        <td className="py-4 pr-4 text-right">
                          <button
                            onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)}
                            className="btn-secondary px-3 py-1.5 text-[0.75rem]"
                          >
                            {expandedTicket === t.id ? 'Đóng' : 'Xem chi tiết'}
                          </button>
                        </td>
                      </tr>
                      {expandedTicket === t.id && (
                        <tr className="bg-gray-50/50">
                          <td colSpan="5" className="p-4">
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-inner">
                              <h4 className="text-size-0 font-black text-coffee-dark uppercase mb-3">Chi tiết vật tư {isImport ? 'nhập' : 'xuất'}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {t.details?.map(ct => (
                                  <div key={ct.ChiTietID} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="font-bold text-gray-700">{ct.nguyenlieu?.TenNguyenLieu || `ID: ${ct.NguyenLieuID}`}</span>
                                    <span className={`font-black ${isImport ? 'text-blue-600' : 'text-orange-600'}`}>
                                      {isImport ? '+' : '-'}{ct.SoLuong} {ct.nguyenlieu?.DonViTinh}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {tickets.filter(t => filterType === 'ALL' || t.type === filterType).length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500 font-bold">Chưa có lịch sử nhập xuất kho.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default InventoryHistoryView
