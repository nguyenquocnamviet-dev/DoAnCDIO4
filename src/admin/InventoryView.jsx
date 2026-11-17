import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CustomDropdown from '../components/CustomDropdown'
import InventoryHistoryView from './InventoryHistoryView'

const InventoryView = ({ showNotify }) => {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formName, setFormName] = useState('')
  const [formUnit, setFormUnit] = useState('kg')
  const [formQty, setFormQty] = useState(10)
  const [formMinQty, setFormMinQty] = useState(2)
  const [activeTab, setActiveTab] = useState('inventory') // 'inventory' | 'history'
  
  // Ticket Modal States
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketType, setTicketType] = useState('import') // 'import' | 'export'
  const [ticketItems, setTicketItems] = useState([])

  const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

  const fetchInventory = async () => {
    if (!isConfigured) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('nguyenlieu')
        .select('*')
        .order('TenNguyenLieu', { ascending: true })

      if (error) throw error
      if (data) setInventory(data)
    } catch (err) {
      console.error('Lỗi tải kho nguyên liệu:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const openAddModal = () => {
    setEditingItem(null)
    setFormName('')
    setFormUnit('kg')
    setFormQty(10)
    setFormMinQty(2)
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setFormName(item.TenNguyenLieu)
    setFormUnit(item.DonViTinh)
    setFormQty(item.SoLuongTon)
    setFormMinQty(item.SoLuongToiThieu)
    setShowModal(true)
  }

  const handleDeleteInventory = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nguyên liệu "${name}"?`)) return
    if (isConfigured) {
      try {
        await supabase.from('nguyenlieu').delete().eq('NguyenLieuID', id)
      } catch (err) {
        console.error('Lỗi xóa kho DB:', err.message)
      }
    }
    setInventory(prev => prev.filter(i => i.NguyenLieuID !== id))
    showNotify(`Đã xóa nguyên liệu: ${name}`)
  }

  const handleSaveInventory = async (e) => {
    e.preventDefault()

    if (editingItem) {
      if (isConfigured) {
        try {
          await supabase.from('nguyenlieu').update({
            TenNguyenLieu: formName,
            DonViTinh: formUnit,
            SoLuongTon: formQty,
            SoLuongToiThieu: formMinQty
          }).eq('NguyenLieuID', editingItem.NguyenLieuID)
        } catch (err) {
          console.error('Lỗi cập nhật kho DB:', err.message)
        }
      }
      setInventory(prev => prev.map(i => i.NguyenLieuID === editingItem.NguyenLieuID ? {
        ...i,
        TenNguyenLieu: formName,
        DonViTinh: formUnit,
        SoLuongTon: Number(formQty),
        SoLuongToiThieu: Number(formMinQty)
      } : i))
      setShowModal(false)
      showNotify(`Đã cập nhật nguyên liệu: ${formName}`)
    } else {
      let newItem = {
        NguyenLieuID: Date.now(),
        TenNguyenLieu: formName,
        DonViTinh: formUnit,
        SoLuongTon: Number(formQty),
        SoLuongToiThieu: Number(formMinQty)
      }

      if (isConfigured) {
        try {
          const { data, error } = await supabase
            .from('nguyenlieu')
            .insert({
              TenNguyenLieu: formName,
              DonViTinh: formUnit,
              SoLuongTon: Number(formQty),
              SoLuongToiThieu: Number(formMinQty)
            })
            .select()
            .single()

          if (!error && data) newItem = data
        } catch (err) {
          console.error('Lỗi nhập kho DB:', err.message)
        }
      }

      setInventory(prev => [newItem, ...prev])
      setShowModal(false)
      showNotify('Thêm nguyên liệu mới thành công!')
    }
  }

  // --- QUẢN LÝ PHIẾU NHẬP / XUẤT ---
  const openTicketModal = (type) => {
    setTicketType(type)
    setTicketItems([{ id: inventory.length > 0 ? inventory[0].NguyenLieuID : '', qty: '' }])
    setShowTicketModal(true)
  }

  const addTicketRow = () => {
    setTicketItems([...ticketItems, { id: inventory.length > 0 ? inventory[0].NguyenLieuID : '', qty: '' }])
  }

  const removeTicketRow = (idx) => {
    setTicketItems(ticketItems.filter((_, i) => i !== idx))
  }

  const updateTicketRow = (idx, field, val) => {
    const updated = [...ticketItems]
    updated[idx][field] = val
    setTicketItems(updated)
  }

  const submitTicket = async (e) => {
    e.preventDefault()
    if (!isConfigured) return
    
    // validate duplicate items
    const ids = ticketItems.map(t => String(t.id))
    if (new Set(ids).size !== ids.length) {
      alert("Lỗi: Có nguyên liệu bị trùng lặp trong phiếu! Vui lòng gộp chung số lượng.")
      return
    }

    try {
      const promises = ticketItems.map(item => {
        const invItem = inventory.find(i => String(i.NguyenLieuID) === String(item.id))
        if (!invItem || !item.qty) return Promise.resolve()
        
        let newQty = Number(invItem.SoLuongTon)
        if (ticketType === 'import') newQty += Number(item.qty)
        else if (ticketType === 'export') {
          newQty -= Number(item.qty)
          if (newQty < 0) newQty = 0 // prevent negative stock
        }

        return supabase.from('nguyenlieu').update({ SoLuongTon: newQty }).eq('NguyenLieuID', invItem.NguyenLieuID)
      })

      await Promise.all(promises)

      // Insert into new tickets tables if possible
      try {
        const tableName = ticketType === 'import' ? 'phieunhapkho' : 'phieuxuatkho';
        const { data: ticketData, error: ticketErr } = await supabase.from(tableName).insert({
          GhiChu: ticketType === 'import' ? 'Nhập tay từ quản lý kho' : 'Xuất tay từ quản lý kho'
        }).select().single()

        if (ticketData && !ticketErr) {
          const detailInserts = ticketItems.filter(item => item.qty).map(item => ({
            [ticketType === 'import' ? 'PhieuNhapID' : 'PhieuXuatID']: ticketData[ticketType === 'import' ? 'PhieuNhapID' : 'PhieuXuatID'],
            NguyenLieuID: Number(item.id),
            SoLuong: Number(item.qty)
          }))
          if (detailInserts.length > 0) {
            const { error: detErr } = await supabase.from(ticketType === 'import' ? 'chitietnhapkho' : 'chitietxuatkho').insert(detailInserts)
            if (detErr) {
              console.error("Lỗi thêm chi tiết phiếu:", detErr);
              alert("Lỗi lưu chi tiết phiếu: " + detErr.message);
            }
          }
        } else if (ticketErr) {
          console.error("Lỗi tạo phiếu:", ticketErr);
          alert("Lỗi tạo phiếu: " + ticketErr.message);
        }
      } catch (logErr) {
        console.warn('Could not save ticket history:', logErr.message)
        alert('Có lỗi khi lưu lịch sử phiếu: ' + logErr.message);
      }

      setShowTicketModal(false)
      fetchInventory() // reload to get fresh data
      showNotify(`Đã xử lý phiếu ${ticketType === 'import' ? 'nhập' : 'xuất'} thành công!`)
    } catch (err) {
      console.error("Lỗi cập nhật phiếu:", err)
      alert("Lỗi hệ thống khi cập nhật số lượng.")
    }
  }

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto no-scrollbar flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-size-2 font-black uppercase text-coffee-dark tracking-tighter mb-1">
            Quản Lý Kho Hàng
          </h2>
          <p className="text-size-0 font-bold text-gray-500 uppercase tracking-widest">
            Kiểm soát nguyên liệu và cập nhật số lượng hàng loạt
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary py-2.5 px-4 text-size-0 whitespace-nowrap !text-blue-600 bg-blue-50 border-blue-100 hover:!bg-blue-600 hover:!text-white" onClick={() => openTicketModal('import')}>
            <i className="fa-solid fa-boxes-packing"></i> Tạo Phiếu Nhập
          </button>
          <button className="btn-primary py-2.5 px-4 text-size-0 whitespace-nowrap" onClick={openAddModal}>
            <i className="fa-solid fa-plus"></i> Thêm Loại Nguyên Liệu Mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/60 p-1.5 rounded-full shadow-inner border border-white/80 overflow-x-auto no-scrollbar w-max max-w-full shrink-0">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-2 text-size-1 font-bold rounded-full transition-all duration-300 hover:scale-105 active:scale-95 uppercase whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-gradient-to-r from-coffee-green to-emerald-800 text-white shadow-md shadow-coffee-green/15'
              : 'text-gray-600 hover:bg-white/80 hover:text-coffee-green'
          }`}
        >
          <i className="fa-solid fa-boxes-stacked mr-2"></i> Tồn Kho Hiện Tại
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2 text-size-1 font-bold rounded-full transition-all duration-300 hover:scale-105 active:scale-95 uppercase whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-coffee-green to-emerald-800 text-white shadow-md shadow-coffee-green/15'
              : 'text-gray-600 hover:bg-white/80 hover:text-coffee-green'
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left mr-2"></i> Lịch Sử Nhập / Xuất
        </button>
      </div>

      {activeTab === 'history' && <InventoryHistoryView showNotify={showNotify} />}

      {activeTab === 'inventory' && (
        <>
          {/* Tích hợp AI Cảnh Báo */}
          <div className="bg-coffee-green/10 border border-coffee-green/30 p-6 rounded-3xl flex items-start gap-4">
            <i className="fa-solid fa-robot text-size-2 text-coffee-green animate-pulse"></i>
            <div>
              <h3 className="text-size-1 font-black text-coffee-dark uppercase tracking-widest mb-1">Hệ Thống AI Cảnh Báo Kho</h3>
              <p className="text-size-1 font-medium text-gray-700">Dựa trên dự báo lượng khách cuối tuần này, hệ thống đề xuất nhập thêm: <strong className="text-coffee-green">Cà phê hạt xay (Cần thêm 5kg)</strong> và <strong className="text-coffee-green">Sữa tươi thanh trùng (Cần thêm 10 Lít)</strong> để tránh hết hàng đột xuất.</p>
            </div>
          </div>

      {loading ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border border-white">
          <i className="fa-solid fa-spinner animate-spin text-size-2 text-coffee-green mb-4"></i>
          <p className="text-size-1 font-bold text-gray-500">Đang tải dữ liệu kho...</p>
        </div>
      ) : (
        <div className="glass-effect p-6 rounded-[2rem] border border-white shadow-md overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 text-size-0 font-black uppercase tracking-wider text-gray-400">
                <th className="pb-4 pl-4">Tên Nguyên Liệu</th>
                <th className="pb-4">Đơn Vị</th>
                <th className="pb-4">Tồn Kho</th>
                <th className="pb-4">Mức Tối Thiểu</th>
                <th className="pb-4 pr-4 text-right">Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(i => {
                const isLow = i.SoLuongTon <= i.SoLuongToiThieu;
                return (
                  <tr key={i.NguyenLieuID} className="border-b border-gray-50 hover:bg-white/40 transition-colors font-bold">
                    <td className="py-4 pl-4 text-coffee-dark text-size-1">{i.TenNguyenLieu}</td>
                    <td className="py-4 text-gray-600 text-size-1">{i.DonViTinh}</td>
                    <td className={`py-4 text-size-1 ${isLow ? 'text-red-500' : 'text-coffee-green'}`}>
                      {parseFloat(i.SoLuongTon)}
                    </td>
                    <td className="py-4 text-gray-600 text-size-1">{parseFloat(i.SoLuongToiThieu)}</td>
                    <td className="py-4 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-[0.7rem] font-black uppercase px-2 py-1 rounded-full border ${isLow ? 'text-red-500 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-100'}`}>
                          {isLow ? 'Sắp Hết' : 'Ổn Định'}
                        </span>
                        <button onClick={() => openEditModal(i)} className="btn-icon" title="Sửa">
                          <i className="fa-solid fa-pen text-size-0"></i>
                        </button>
                        <button onClick={() => handleDeleteInventory(i.NguyenLieuID, i.TenNguyenLieu)} className="btn-icon text-red-500 hover:bg-red-500 hover:text-white" title="Xóa">
                          <i className="fa-solid fa-trash text-size-0"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">Kho đang trống.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-coffee-dark/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-effect p-8 rounded-[2.5rem] relative max-w-md w-full shadow-2xl border border-white animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 btn-icon">&times;</button>
            <h3 className="text-size-2 font-black text-coffee-green uppercase mb-6 tracking-tighter text-center">
              {editingItem ? 'Sửa Nguyên Liệu' : 'Nhập Nguyên Liệu'}
            </h3>
            <form onSubmit={handleSaveInventory} className="space-y-4">
              <div>
                <label className="block text-size-0 font-bold mb-1 ml-2 text-gray-500 uppercase tracking-wider">Tên Nguyên Liệu</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full py-2.5 px-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none" placeholder="Hạt Cà Phê Robusta" />
              </div>
              <div>
                <label className="block text-size-0 font-bold mb-1 ml-2 text-gray-500 uppercase tracking-wider">Đơn Vị Tính</label>
                <CustomDropdown
                  options={[
                    { value: 'kg', label: 'Kilogram (kg)', icon: 'fa-scale-balanced', color: 'bg-amber-100 text-amber-800' },
                    { value: 'g', label: 'Gram (g)', icon: 'fa-weight-hanging', color: 'bg-amber-50 text-amber-700' },
                    { value: 'lít', label: 'Lít (l)', icon: 'fa-bottle-water', color: 'bg-blue-100 text-blue-800' },
                    { value: 'ml', label: 'Mililit (ml)', icon: 'fa-tint', color: 'bg-blue-50 text-blue-700' },
                    { value: 'hộp', label: 'Hộp', icon: 'fa-box', color: 'bg-emerald-100 text-emerald-800' },
                    { value: 'chai', label: 'Chai', icon: 'fa-wine-bottle', color: 'bg-purple-100 text-purple-800' },
                    { value: 'bao', label: 'Bao / Túi', icon: 'fa-bag-shopping', color: 'bg-orange-100 text-orange-800' },
                    { value: 'lon', label: 'Lon', icon: 'fa-prescription-bottle', color: 'bg-red-100 text-red-800' }
                  ]}
                  value={formUnit}
                  onChange={(val) => setFormUnit(val)}
                  placeholder="Chọn đơn vị tính"
                />
              </div>
              <div>
                <label className="block text-size-0 font-bold mb-1 ml-2 text-gray-500 uppercase tracking-wider">Số Lượng Tồn</label>
                <input type="number" required value={formQty} onChange={(e) => setFormQty(Number(e.target.value))} className="w-full py-2.5 px-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none" placeholder="10" />
              </div>
              <div>
                <label className="block text-size-0 font-bold mb-1 ml-2 text-gray-500 uppercase tracking-wider">Mức Tối Thiểu Cảnh Báo</label>
                <input type="number" required value={formMinQty} onChange={(e) => setFormMinQty(Number(e.target.value))} className="w-full py-2.5 px-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none" placeholder="2" />
              </div>
              <button type="submit" className="w-full btn-primary py-3 mt-4 text-size-1">
                {editingItem ? 'Cập Nhật Kho' : 'Nhập Kho'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TICKET MODAL */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-coffee-dark/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-effect p-8 md:p-10 rounded-[2.5rem] relative max-w-3xl w-full shadow-2xl border border-white animate-fade-in max-h-[90vh] flex flex-col">
            <button onClick={() => setShowTicketModal(false)} className="absolute top-6 right-6 btn-icon z-10">&times;</button>
            <h3 className={`text-size-2 font-black uppercase mb-6 tracking-tighter text-center ${ticketType === 'import' ? 'text-blue-600' : 'text-orange-500'}`}>
              {ticketType === 'import' ? 'Tạo Phiếu Nhập Kho' : 'Tạo Phiếu Xuất Kho'}
            </h3>
            
            <div className="overflow-y-auto no-scrollbar flex-1 pr-2">
              <form id="ticket-form" onSubmit={submitTicket} className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-size-0 font-black text-coffee-dark uppercase tracking-wider">Danh sách nguyên liệu</label>
                  <button type="button" onClick={addTicketRow} className="btn-secondary py-1.5 px-3 text-[0.8rem]">
                    <i className="fa-solid fa-plus"></i> Thêm dòng
                  </button>
                </div>
                
                <div className="space-y-4 mt-2">
                  {ticketItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:bg-white/80">
                      <div className="flex-[3] w-full min-w-[280px]">
                        <CustomDropdown
                          options={inventory.map(inv => ({
                            value: inv.NguyenLieuID,
                            label: `${inv.TenNguyenLieu} (Tồn: ${inv.SoLuongTon} ${inv.DonViTinh})`,
                            icon: 'fa-box',
                            color: 'bg-emerald-100 text-emerald-800'
                          }))}
                          value={item.id}
                          onChange={(val) => updateTicketRow(idx, 'id', Number(val))}
                          placeholder="-- Chọn nguyên liệu --"
                          buttonClassName="!h-[54px]"
                        />
                      </div>
                      <div className="flex-1 w-full sm:min-w-[150px] shrink-0">
                        <input
                          type="number" step="0.1" min="0.1" required
                          value={item.qty}
                          onChange={(e) => updateTicketRow(idx, 'qty', e.target.value)}
                          className="w-full h-[54px] px-4 rounded-2xl bg-white/90 border-2 border-gray-200/80 hover:border-coffee-green/60 focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 text-size-1 font-black outline-none text-center shadow-sm transition-all text-coffee-dark"
                          placeholder={ticketType === 'import' ? '+ Số lượng' : '- Số lượng'}
                        />
                      </div>
                      {ticketItems.length > 1 && (
                        <button type="button" onClick={() => removeTicketRow(idx)} className="btn-icon bg-red-50 text-red-500 hover:bg-red-500 hover:text-white shrink-0 self-center h-[54px] w-[54px] rounded-2xl">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </form>
            </div>
            
            <div className="shrink-0 pt-6 mt-2 border-t border-gray-100">
              <button type="submit" form="ticket-form" className={`w-full btn-primary py-3.5 text-size-1 shadow-lg border-none ${ticketType === 'import' ? '!bg-blue-600 hover:!bg-blue-700 shadow-blue-600/20' : '!bg-orange-500 hover:!bg-orange-600 shadow-orange-500/20 text-white'}`}>
                <i className="fa-solid fa-check mr-2"></i> Xác nhận {ticketType === 'import' ? 'Nhập Hàng' : 'Xuất Hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryView
