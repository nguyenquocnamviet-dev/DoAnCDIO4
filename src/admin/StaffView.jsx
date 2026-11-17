import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CustomDropdown from '../components/CustomDropdown'
import {
  DAYS_OF_WEEK,
  SHIFT_SLOTS,
  getStaffType,
  setStaffType,
  getAllStaffTypesMap,
  getWeeklyShifts,
  toggleStaffShift,
  calculateStaffPayroll,
  getScheduleLockStatus,
  setScheduleLockStatus,
  getTimeclockLogs,
  syncChannel,
  getSyncTimestamp,
  getStaffSalaryRate
} from '../utils/shiftUtils'

const StaffView = ({ showNotify }) => {
  const [activeTab, setActiveTab] = useState('list') // 'list' | 'schedule' | 'payroll'
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState('ALL') // 'ALL' | 'Full-time' | 'Part-time'
  const [syncRev, setSyncRev] = useState(0)
  const [lastTs, setLastTs] = useState(() => getSyncTimestamp())
  
  const [showModal, setShowModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formUser, setFormUser] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formRole, setFormRole] = useState(4) // Barista default
  const [formPhone, setFormPhone] = useState('')
  const [formType, setFormType] = useState('Part-time') // Full-time vs Part-time
  
  // Shift Schedule states
  const [weeklyShifts, setWeeklyShiftsState] = useState(() => getWeeklyShifts())
  const [staffTypesMap, setStaffTypesMapState] = useState(() => getAllStaffTypesMap())
  const [scheduleLocked, setScheduleLocked] = useState(() => getScheduleLockStatus())
  const [timeLogs, setTimeLogs] = useState(() => getTimeclockLogs())
  const [logFilter, setLogFilter] = useState('ALL') // 'ALL' | 'LATE' | 'EARLY' | 'ONTIME'
  
  // Redesigned Shift Scheduler without Popups: 'day' (Inline Quick-Add Day Builder) vs 'matrix' (Weekly Employee Matrix Table)
  const [scheduleViewMode, setScheduleViewMode] = useState('day')
  const [selectedScheduleDay, setSelectedScheduleDay] = useState('Thứ 2')

  const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

  const fetchStaff = async () => {
    setLoading(true)
    let loadedStaff = []
    
    if (isConfigured) {
      try {
        const { data, error } = await supabase
          .from('nguoidung')
          .select(`
            NguoiDungID,
            HoTen,
            TenDangNhap,
            SoDienThoai,
            TrangThai,
            vaitro:VaiTroID ( TenVaiTro )
          `)
          .in('VaiTroID', [2, 3, 4, 5]) // Manager, Cashier, Barista, Staff
          .eq('DaXoa', false)
          .order('NgayTao', { ascending: false })

        if (!error && data && data.length > 0) {
          loadedStaff = data
        }
      } catch (err) {
        console.error('Lỗi tải danh sách nhân viên DB:', err.message)
      }
    }

    // Only use real DB data! No fake demo fallback seed!
    setStaff(loadedStaff)
    setStaffTypesMapState(getAllStaffTypesMap())
    setLoading(false)
  }

  useEffect(() => {
    fetchStaff()

    // Live two-way synchronization listener across all browser tabs and components
    const handleSync = () => {
      setWeeklyShiftsState(getWeeklyShifts())
      setStaffTypesMapState(getAllStaffTypesMap())
      setScheduleLocked(getScheduleLockStatus())
      setTimeLogs(getTimeclockLogs())
      setSyncRev(r => r + 1) // Force instant re-render and re-calculate payroll!
    }

    window.addEventListener('staff_data_updated', handleSync)
    window.addEventListener('storage', handleSync)
    if (syncChannel) {
      syncChannel.addEventListener('message', handleSync)
    }

    // High-frequency polling to ensure 100% real-time sync without missing events
    const interval = setInterval(() => {
      const curTs = getSyncTimestamp()
      if (curTs !== lastTs) {
        setLastTs(curTs)
        handleSync()
      }
    }, 1000)

    return () => {
      window.removeEventListener('staff_data_updated', handleSync)
      window.removeEventListener('storage', handleSync)
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleSync)
      }
      clearInterval(interval)
    }
  }, [lastTs])

  const handleToggleStaffType = (staffId, currentRoleName) => {
    const current = getStaffType(staffId, currentRoleName)
    const nextType = current === 'Full-time' ? 'Part-time' : 'Full-time'
    setStaffType(staffId, nextType)
    setStaffTypesMapState(getAllStaffTypesMap())
    showNotify(`Đã thay đổi phân loại nhân viên thành: ${nextType}`)
  }

  const handleSaveStaff = async (e) => {
    e.preventDefault()

    // Validation
    if (formName.trim().length < 2) {
      window.Swal.fire({ icon: 'error', title: 'Lỗi Dữ Liệu', text: 'Họ và tên phải có ít nhất 2 ký tự!' })
      return
    }
    if (formUser.trim().length < 4) {
      window.Swal.fire({ icon: 'error', title: 'Lỗi Dữ Liệu', text: 'Tên đăng nhập phải có ít nhất 4 ký tự!' })
      return
    }
    if (formPassword && formPassword.trim().length > 0 && formPassword.trim().length < 6) {
      window.Swal.fire({ icon: 'error', title: 'Lỗi Dữ Liệu', text: 'Mật khẩu phải có ít nhất 6 ký tự!' })
      return
    }
    const phoneRegex = /^[0-9]{10,11}$/
    if (!phoneRegex.test(formPhone.trim())) {
      window.Swal.fire({ icon: 'error', title: 'Lỗi Dữ Liệu', text: 'Số điện thoại không hợp lệ (10-11 chữ số)!' })
      return
    }
    if (staff.some(s => s.TenDangNhap === formUser.trim())) {
      window.Swal.fire({ icon: 'error', title: 'Trùng Lặp', text: 'Tên đăng nhập đã tồn tại trong hệ thống!' })
      return
    }
    
    let newId = Date.now()
    let roleNameStr = formRole === 2 ? 'Quản Lý' : formRole === 3 ? 'Thu Ngân' : formRole === 4 ? 'Pha Chế' : 'Phục Vụ'
    let newStaffItem = {
      NguoiDungID: newId,
      HoTen: formName.trim(),
      TenDangNhap: formUser.trim(),
      SoDienThoai: formPhone.trim(),
      VaiTroID: formRole,
      vaitro: { TenVaiTro: roleNameStr },
      TrangThai: 'HoatDong'
    }

    if (isConfigured) {
      try {
        const { data, error } = await supabase
          .from('nguoidung')
          .insert({
            HoTen: formName.trim(),
            TenDangNhap: formUser.trim(),
            MatKhau: formPassword || '123456',
            Email: `${formUser.trim()}@coffee.vn`,
            SoDienThoai: formPhone.trim(),
            VaiTroID: formRole,
            TrangThai: 'HoatDong'
          })
          .select(`
            NguoiDungID,
            HoTen,
            TenDangNhap,
            SoDienThoai,
            TrangThai,
            vaitro:VaiTroID ( TenVaiTro )
          `)
          .single()

        if (error) {
          console.error('Lỗi DB:', error)
          window.Swal.fire({ icon: 'error', title: 'Lỗi Cơ Sở Dữ Liệu', text: error.message || 'Không thể lưu nhân viên vào Database!' })
          return // Stop execution if DB fails
        }
        
        if (data) {
          newStaffItem = data
          newId = data.NguoiDungID
        }
      } catch (err) {
        console.error('Lỗi khi thêm nhân viên DB:', err.message)
        window.Swal.fire({ icon: 'error', title: 'Lỗi', text: err.message || 'Không thể lưu nhân viên!' })
        return
      }
    }

    // Save classification (Full-time vs Part-time)
    setStaffType(newId, formType)
    setStaffTypesMapState(getAllStaffTypesMap())

    setStaff(prev => [newStaffItem, ...prev])
    setShowModal(false)
    setFormName('')
    setFormUser('')
    setFormPassword('')
    setFormPhone('')
    
    window.Swal.fire({
      icon: 'success',
      title: 'Đã Thêm Nhân Sự!',
      text: `Nhân viên ${newStaffItem.HoTen} (${formType}) đã được thêm thành công.`,
      timer: 2000,
      showConfirmButton: false
    })
  }

  const handleDeleteStaff = async (userId, userName) => {
    window.Swal.fire({
      title: 'Xóa nhân sự?',
      text: `Bạn có chắc chắn muốn xóa nhân sự: ${userName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          if (isConfigured) {
            await supabase.from('nguoidung').update({ DaXoa: true }).eq('NguoiDungID', userId)
          }
          setStaff(prev => prev.filter(s => s.NguoiDungID !== userId))
          window.Swal.fire({
            icon: 'success',
            title: 'Đã xóa!',
            text: `Nhân sự ${userName} đã bị xóa khỏi hệ thống.`,
            timer: 2000,
            showConfirmButton: false
          })
        } catch (err) {
          console.error('Lỗi khi xóa nhân sự:', err)
          window.Swal.fire('Lỗi', 'Không thể xóa nhân sự. Vui lòng thử lại.', 'error')
        }
      }
    })
  }

  // Inline Quick-Add / Remove shift handler without any popup modals!
  const handleInlineToggleShift = (day, shiftId, staffMember) => {
    const updated = toggleStaffShift(day, shiftId, {
      id: staffMember.NguoiDungID || staffMember.id,
      name: staffMember.HoTen || staffMember.name,
      role: staffMember.vaitro?.TenVaiTro || staffMember.role || 'Nhân Viên',
      type: getStaffType(staffMember.NguoiDungID || staffMember.id, staffMember.vaitro?.TenVaiTro || staffMember.role)
    })
    setWeeklyShiftsState({ ...updated })
    
    const isAssigned = (updated[day]?.[shiftId] || []).some(s => String(s.id) === String(staffMember.NguoiDungID || staffMember.id))
    if (isAssigned) {
      showNotify(`✅ Đã phân công ${staffMember.HoTen || staffMember.name} vào ${day} (${shiftId})!`)
    } else {
      showNotify(`🗑️ Đã gỡ ${staffMember.HoTen || staffMember.name} khỏi ca làm!`)
    }
  }

  // Filter staff by classification
  const filteredStaff = staff.filter(s => {
    const type = getStaffType(s.NguoiDungID, s.vaitro?.TenVaiTro)
    if (filterType === 'ALL') return true
    return type === filterType
  })

  // Payroll data
  const payrollData = calculateStaffPayroll(staff)
  const totalMonthlyPayroll = payrollData.reduce((sum, item) => sum + item.estimatedMonthlySalary, 0)
  const fullTimeCount = payrollData.filter(i => i.type === 'Full-time').length
  const partTimeCount = payrollData.filter(i => i.type === 'Part-time').length

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto no-scrollbar flex flex-col gap-6 animate-fade-in text-coffee-dark dark:text-gray-100">
      
      {/* Title & Top Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 bg-gradient-to-r from-coffee-dark via-slate-800 to-indigo-950 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-coffee-dark font-black text-xs uppercase tracking-wider">
              <i className="fa-solid fa-user-shield mr-1.5"></i>HR & Payroll
            </span>
            <span className="text-gray-300 text-xs font-bold">Hệ thống phân loại ca làm & Lương</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            Quản Lý Nhân Sự & Bảng Ca Làm
          </h2>
          <p className="text-xs md:text-sm text-gray-300 font-medium mt-1">
            Phân loại rõ ràng nhân viên <strong className="text-amber-300">Full-time (Cố định tháng)</strong> & <strong className="text-emerald-300">Part-time (Theo giờ)</strong>
          </p>
        </div>

        <button 
          onClick={() => setShowModal(true)} 
          className="relative z-10 py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-coffee-dark font-black text-sm uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <i className="fa-solid fa-user-plus text-base"></i> Thêm Nhân Viên
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4">
        <div className="flex gap-2 md:gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-4 text-sm md:text-base font-black uppercase tracking-wider flex items-center gap-2.5 transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <i className="fa-solid fa-users"></i>
            1. Danh Sách Nhân Sự ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 px-4 text-sm md:text-base font-black uppercase tracking-wider flex items-center gap-2.5 transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <i className="fa-solid fa-calendar-week"></i>
            2. Bảng Phân Ca Làm Việc
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-black ml-1">Trực quan</span>
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`pb-3 px-4 text-sm md:text-base font-black uppercase tracking-wider flex items-center gap-2.5 transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'payroll'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <i className="fa-solid fa-file-invoice-dollar"></i>
            3. Bảng Lương Mẫu
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black ml-1">Tính lương</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 px-4 text-sm md:text-base font-black uppercase tracking-wider flex items-center gap-2.5 transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <i className="fa-solid fa-clock-rotate-left"></i>
            4. Lịch Sử Chấm Công ({timeLogs.length})
            <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-black ml-1">Giám sát</span>
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl mb-2 md:mb-0">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filterType === 'ALL' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('Full-time')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filterType === 'Full-time' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              🔵 Full-time ({fullTimeCount})
            </button>
            <button
              onClick={() => setFilterType('Part-time')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filterType === 'Part-time' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              🟢 Part-time ({partTimeCount})
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: DANH SÁCH NHÂN SỰ */}
      {activeTab === 'list' && (
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-white/60">
              <i className="fa-solid fa-spinner animate-spin text-3xl text-indigo-600 mb-4"></i>
              <p className="text-sm font-bold text-gray-500">Đang tải danh sách nhân sự từ Database...</p>
            </div>
          ) : (
            <div className="glass-effect p-6 rounded-[2rem] border border-white/60 dark:border-white/10 shadow-lg overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-400">
                    <th className="pb-4 pl-4">Họ & Tên</th>
                    <th className="pb-4">Username / SĐT</th>
                    <th className="pb-4">Vai Trò</th>
                    <th className="pb-4 text-center">Phân Loại (Hợp đồng)</th>
                    <th className="pb-4 text-center">Trạng Thái</th>
                    <th className="pb-4 pr-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-bold">
                  {filteredStaff.map(s => {
                    const sType = getStaffType(s.NguoiDungID, s.vaitro?.TenVaiTro)
                    return (
                      <tr key={s.NguoiDungID} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 pl-4 text-coffee-dark dark:text-white text-base">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black shrink-0">
                              {s.HoTen.charAt(0)}
                            </div>
                            <div>
                              <span className="block font-black">{s.HoTen}</span>
                              <span className="text-[11px] font-normal text-gray-400">ID: #{s.NguoiDungID}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-gray-600 dark:text-gray-300 text-sm">
                          <div className="flex flex-col">
                            <span className="font-bold">@{s.TenDangNhap}</span>
                            <span className="text-xs text-gray-400"><i className="fa-solid fa-phone mr-1"></i>{s.SoDienThoai || 'Chưa cập nhật'}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-coffee-dark dark:text-gray-200 font-black uppercase tracking-wider text-xs px-3 py-1 bg-amber-100/60 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-xl">
                            {s.vaitro?.TenVaiTro || 'Nhân Viên'}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <button
                            onClick={() => handleToggleStaffType(s.NguoiDungID, s.vaitro?.TenVaiTro)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border transition-all hover:scale-105 active:scale-95 shadow-sm inline-flex items-center gap-2 ${
                              sType === 'Full-time'
                                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                                : 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                            }`}
                            title="Nhấp để chuyển phân loại Full-time / Part-time"
                          >
                            <i className={`fa-solid ${sType === 'Full-time' ? 'fa-briefcase' : 'fa-clock'}`}></i>
                            {sType}
                            <i className="fa-solid fa-rotate text-[10px] opacity-80 ml-0.5"></i>
                          </button>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border inline-block ${
                            s.TrangThai === 'HoatDong' 
                              ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300' 
                              : 'text-red-500 bg-red-50 border-red-200 dark:bg-red-900/30'
                          }`}>
                            {s.TrangThai === 'HoatDong' ? 'Hoạt Động' : 'Khóa'}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <button
                            onClick={() => handleDeleteStaff(s.NguoiDungID, s.HoTen)}
                            className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-500 text-red-500 hover:text-white dark:bg-slate-800 dark:hover:bg-red-600 transition-colors inline-flex items-center justify-center"
                            title="Xóa nhân viên"
                          >
                            <i className="fa-solid fa-trash text-sm"></i>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-gray-400">
                        <i className="fa-solid fa-user-slash text-4xl mb-3 block opacity-40"></i>
                        Chưa có nhân viên nào trong cơ sở dữ liệu hoặc không phù hợp bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BẢNG PHÂN CA LÀM VIỆC (REDESIGNED: NO POPUPS, 100% INTUITIVE & VISUAL) */}
      {activeTab === 'schedule' && (
        <div className="flex flex-col gap-6">
          
          {/* Schedule Lock Banner */}
          <div className={`p-6 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-center gap-4 border-2 transition-all shadow-xl ${
            scheduleLocked 
              ? 'bg-gradient-to-r from-red-500/20 via-rose-500/10 to-transparent border-red-500 text-red-950 dark:text-red-200' 
              : 'bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500 text-emerald-950 dark:text-emerald-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg shrink-0 ${scheduleLocked ? 'bg-red-500 animate-bounce' : 'bg-emerald-500'}`}>
                <i className={`fa-solid ${scheduleLocked ? 'fa-lock' : 'fa-lock-open'}`}></i>
              </div>
              <div>
                <h4 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  {scheduleLocked ? '🔒 BẢNG PHÂN CA LÀM ĐANG BỊ KHÓA (CHỐT LỊCH)' : '🔓 BẢNG PHÂN CA LÀM ĐANG MỞ KHÓA'}
                </h4>
                <p className="text-xs font-bold opacity-80 mt-0.5">
                  {scheduleLocked 
                    ? 'Nhân viên Part-time KHÔNG THỂ tự ý đăng ký hay hủy ca bên trang Staff. Quản lý vẫn có toàn quyền chỉnh sửa.' 
                    : 'Nhân viên Part-time được tự do bấm đăng ký nhận ca hoặc hủy ca trong tuần từ giao diện cá nhân.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !scheduleLocked
                setScheduleLockStatus(next)
                setScheduleLocked(next)
                showNotify(next ? '🔒 Đã chốt và khóa bảng phân ca làm việc!' : '🔓 Đã mở khóa cho phép nhân viên tự đăng ký ca!')
              }}
              className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2 text-white ${
                scheduleLocked 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30 hover:from-emerald-600' 
                  : 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/30 hover:from-red-600'
              }`}
            >
              <i className={`fa-solid ${scheduleLocked ? 'fa-unlock' : 'fa-lock'}`}></i>
              {scheduleLocked ? 'Mở Khóa Bảng Ca' : 'Chốt & Khóa Bảng Ca'}
            </button>
          </div>

          <div className="glass-effect p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-xl">
            
            {/* Header & Mode Selector */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-white/10">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-coffee-dark dark:text-white flex items-center gap-2.5">
                  <i className="fa-solid fa-calendar-check text-indigo-600"></i>
                  Sắp Xếp & Bố Trí Ca Làm Việc
                </h3>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                  {scheduleViewMode === 'day' ? (
                    <span>Chế độ sắp xếp nhanh theo ngày: Nhấp <strong className="text-emerald-600 dark:text-emerald-400">"+ Thêm nhanh"</strong> để đưa nhân sự vào ca mà không cần mở popup phiền phức.</span>
                  ) : (
                    <span>Bảng ma trận tuần theo nhân sự: Giúp Quản lý có cái nhìn tổng quan 360 độ toàn bộ lịch trực trong quán.</span>
                  )}
                </p>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-200 dark:border-white/10 w-full sm:w-auto justify-center shrink-0">
                <button
                  onClick={() => setScheduleViewMode('day')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    scheduleViewMode === 'day'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <i className="fa-solid fa-list-check"></i> 1. Xếp Lịch Từng Ngày (Trực Quan)
                </button>
                <button
                  onClick={() => setScheduleViewMode('matrix')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    scheduleViewMode === 'matrix'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <i className="fa-solid fa-table"></i> 2. Bảng Ma Trận Tuần (Chuẩn F&B)
                </button>
              </div>
            </div>

            {/* MODE 1: DAY BUILDER (ZERO POPUPS - CLICK TO ADD/REMOVE INSTANTLY) */}
            {scheduleViewMode === 'day' && (
              <div className="flex flex-col gap-6">
                
                {/* Horizontal Day Selector */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                  {DAYS_OF_WEEK.map(day => {
                    const totalAssignedInDay = SHIFT_SLOTS.reduce((sum, slot) => sum + (weeklyShifts[day]?.[slot.id]?.length || 0), 0)
                    const isSelected = selectedScheduleDay === day

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedScheduleDay(day)}
                        className={`py-3 px-5 rounded-2xl font-black text-sm uppercase transition-all shrink-0 flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-600/30 scale-105'
                            : 'bg-white/80 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-indigo-400'
                        }`}
                      >
                        <i className={`fa-solid ${day === 'Chủ Nhật' ? 'fa-sun text-amber-400' : 'fa-calendar-day'}`}></i>
                        {day}
                        {totalAssignedInDay > 0 && (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                            isSelected ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                          }`}>
                            {totalAssignedInDay}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* 3 Shifts Container */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                  {SHIFT_SLOTS.map(slot => {
                    const assignedStaff = weeklyShifts[selectedScheduleDay]?.[slot.id] || []
                    
                    // Available staff not yet in this shift slot
                    const availableStaff = staff.filter(s => 
                      !assignedStaff.some(item => String(item.id) === String(s.NguoiDungID))
                    )

                    return (
                      <div
                        key={slot.id}
                        className="rounded-3xl p-6 bg-white/80 dark:bg-slate-800/80 border-2 border-gray-200/80 dark:border-white/10 shadow-lg flex flex-col justify-between"
                      >
                        <div>
                          {/* Slot Title */}
                          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-white/10">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${slot.color} text-white flex items-center justify-center text-2xl shadow-md shrink-0`}>
                              <i className={`fa-solid ${slot.icon}`}></i>
                            </div>
                            <div>
                              <h4 className="text-lg font-black uppercase tracking-tight text-coffee-dark dark:text-white">
                                {slot.name}
                              </h4>
                              <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                                🕒 {slot.time} <span className="text-indigo-600 dark:text-indigo-400">({slot.hours}h)</span>
                              </span>
                            </div>
                          </div>

                          {/* 1. Currently Assigned List */}
                          <div className="mb-6">
                            <span className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-3 flex items-center justify-between">
                              <span><i className="fa-solid fa-users text-indigo-500 mr-1.5"></i>Nhân sự trong ca ({assignedStaff.length}):</span>
                            </span>

                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
                              {assignedStaff.map((s, sIdx) => {
                                const sType = getStaffType(s.id, s.role)
                                return (
                                  <div
                                    key={sIdx}
                                    className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold border shadow-sm ${
                                      sType === 'Full-time'
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-950 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                                        : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${sType === 'Full-time' ? 'bg-blue-600' : 'bg-emerald-500'}`}></span>
                                      <div className="min-w-0">
                                        <span className="block font-black text-sm truncate">{s.name}</span>
                                        <span className="text-[10px] opacity-80 block">{s.role} | {sType}</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleInlineToggleShift(selectedScheduleDay, slot.id, { NguoiDungID: s.id, HoTen: s.name, vaitro: { TenVaiTro: s.role } })}
                                      className="w-7 h-7 rounded-full bg-white/80 dark:bg-slate-800 hover:bg-red-500 text-gray-400 hover:text-white flex items-center justify-center transition-all shadow-sm shrink-0 ml-2"
                                      title="Xóa khỏi ca"
                                    >
                                      <i className="fa-solid fa-xmark text-sm"></i>
                                    </button>
                                  </div>
                                )
                              })}
                              {assignedStaff.length === 0 && (
                                <div className="text-center py-5 text-xs italic text-gray-400 bg-gray-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                                  Chưa có nhân viên nào trong ca này.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Inline Quick-Add Pills (NO POPUP!) */}
                        <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2 flex items-center gap-1.5">
                            <i className="fa-solid fa-bolt"></i> Thêm nhanh nhân sự (Nhấp để thêm):
                          </span>

                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                            {availableStaff.map(s => {
                              const sType = getStaffType(s.NguoiDungID, s.vaitro?.TenVaiTro)
                              return (
                                <button
                                  key={s.NguoiDungID}
                                  onClick={() => handleInlineToggleShift(selectedScheduleDay, slot.id, s)}
                                  className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-emerald-500 text-gray-700 hover:text-white dark:bg-slate-700 dark:hover:bg-emerald-600 dark:text-gray-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                  title={`Thêm ${s.HoTen} vào ${slot.name}`}
                                >
                                  <i className="fa-solid fa-plus text-[10px] text-emerald-500 group-hover:text-white"></i>
                                  <span>{s.HoTen}</span>
                                  <span className="text-[10px] opacity-70">({sType === 'Full-time' ? 'FT' : 'PT'})</span>
                                </button>
                              )
                            })}
                            {availableStaff.length === 0 && (
                              <span className="text-[11px] text-gray-400 italic py-1">Đã phân công tất cả nhân viên vào ca này.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

              </div>
            )}

            {/* MODE 2: WEEKLY MATRIX TABLE (INDUSTRY STANDARD EMPLOYEE X DAY MATRIX) */}
            {scheduleViewMode === 'matrix' && (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-slate-800/50">
                      <th className="py-4 pl-4 w-56">Nhân Viên / Phân Loại</th>
                      {DAYS_OF_WEEK.map(day => (
                        <th key={day} className="py-4 text-center w-32 border-l border-gray-100 dark:border-white/5">
                          <span className="block text-coffee-dark dark:text-white font-black">{day}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-bold text-sm">
                    {staff.map(s => {
                      const sType = getStaffType(s.NguoiDungID, s.vaitro?.TenVaiTro)
                      return (
                        <tr key={s.NguoiDungID} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                          {/* Staff Column */}
                          <td className="py-4 pl-4 text-coffee-dark dark:text-white">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 text-base">
                                {s.HoTen.charAt(0)}
                              </div>
                              <div>
                                <span className="block font-black text-base">{s.HoTen}</span>
                                <span className="text-xs text-gray-400">{s.vaitro?.TenVaiTro} • <strong className={sType === 'Full-time' ? 'text-blue-500' : 'text-emerald-500'}>{sType}</strong></span>
                              </div>
                            </div>
                          </td>

                          {/* 7 Days Columns */}
                          {DAYS_OF_WEEK.map(day => {
                            // Find which shifts this staff is working on this day
                            const myShiftsInDay = SHIFT_SLOTS.filter(slot => {
                              const list = weeklyShifts[day]?.[slot.id] || []
                              return list.some(item => String(item.id) === String(s.NguoiDungID))
                            })

                            return (
                              <td key={day} className="py-3 px-2 text-center border-l border-gray-100 dark:border-white/5 align-top">
                                <div className="flex flex-col gap-1.5 min-h-[50px] justify-center items-center">
                                  {myShiftsInDay.map(slot => (
                                    <div
                                      key={slot.id}
                                      onClick={() => handleInlineToggleShift(day, slot.id, s)}
                                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black shadow-sm flex items-center justify-between gap-1 w-full cursor-pointer hover:bg-red-500 transition-all group"
                                      title="Nhấp để xóa khỏi ca này"
                                    >
                                      <span className="truncate"><i className={`fa-solid ${slot.icon} text-amber-300 mr-1`}></i>{slot.name}</span>
                                      <i className="fa-solid fa-xmark text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                    </div>
                                  ))}
                                  {myShiftsInDay.length === 0 && (
                                    <span className="text-[11px] text-gray-300 dark:text-gray-600 italic py-2">
                                      Nghỉ
                                    </span>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                    {staff.length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-gray-400">Chưa có nhân viên nào trong danh sách.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BẢNG TÍNH LƯƠNG MẪU (PAYROLL) */}
      {activeTab === 'payroll' && (
        <div className="flex flex-col gap-6">
          
          {/* Payroll Rules Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-[2rem] shadow-lg flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shrink-0">
                <i className="fa-solid fa-user-tie"></i>
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-200 block">Ma Trận Lương Full-Time</span>
                <span className="text-xl font-black">5.5tr - 10tr đ</span>
                <span className="text-[11px] text-blue-100 block mt-0.5 font-medium">QL: 10tr | Barista: 7tr | TN: 6.5tr</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-[2rem] shadow-lg flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shrink-0">
                <i className="fa-solid fa-user-clock"></i>
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-200 block">Ma Trận Lương Part-Time</span>
                <span className="text-xl font-black">28k - 50k đ</span>
                <span className="text-[11px] text-emerald-100 block mt-0.5 font-medium">QL: 50k | Barista/TN: 35k | PV: 28k</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-[2rem] shadow-lg flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shrink-0">
                <i className="fa-solid fa-sack-dollar"></i>
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-100 block">Quỹ lương tháng dự kiến</span>
                <span className="text-2xl font-black">{totalMonthlyPayroll.toLocaleString('vi-VN')} đ</span>
                <span className="text-xs text-amber-100 block mt-0.5 font-medium">Cho toàn bộ {staff.length} nhân sự</span>
              </div>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="glass-effect p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-xl overflow-x-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-coffee-dark dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-table-list text-indigo-600"></i>
                  Bảng Lương Mẫu & Thu Nhập Dự Kiến
                </h3>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                  Tự động tổng hợp từ giờ làm trong tuần và thời gian chấm công thực tế.
                </p>
              </div>

              <button 
                onClick={() => {
                  showNotify('🖨️ Đã xuất file Bảng Lương Mẫu (PDF/Excel) thành công!')
                }} 
                className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-print"></i> Xuất Bảng Lương
              </button>
            </div>

            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-400">
                  <th className="pb-4 pl-4">Nhân Viên / Vai Trò</th>
                  <th className="pb-4 text-center">Phân Loại</th>
                  <th className="pb-4">Mức Lương Cơ Bản</th>
                  <th className="pb-4 text-center">Lịch Làm Tuần Này</th>
                  <th className="pb-4 text-right">Lương Tuần Tạm Tính</th>
                  <th className="pb-4 text-right">Lương Tháng Dự Kiến</th>
                  <th className="pb-4 pr-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-bold">
                {payrollData.map(item => (
                  <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-4 text-coffee-dark dark:text-white text-base">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gray-200 dark:bg-slate-700 text-coffee-dark dark:text-white flex items-center justify-center font-black shrink-0">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <span className="block font-black">{item.name}</span>
                          <span className="text-xs font-medium text-gray-400">{item.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        item.type === 'Full-time' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                      }`}>
                        {item.type === 'Full-time' ? '🔵 Full-Time' : '🟢 Part-Time'}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                      {item.baseRateFormatted}
                    </td>
                    <td className="py-4 text-center">
                      <span className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-coffee-dark dark:text-gray-200 font-black text-xs inline-block">
                        {item.scheduledShifts} ca <span className="text-gray-400 font-normal">({item.scheduledHours} giờ)</span>
                      </span>
                    </td>
                    <td className="py-4 text-right font-black text-base text-indigo-600 dark:text-indigo-400">
                      {item.estimatedWeeklySalary.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 text-right font-black text-base text-emerald-600 dark:text-emerald-400">
                      {item.estimatedMonthlySalary.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <button
                        onClick={() => showNotify(`💰 Đã xác nhận phiếu lương cho ${item.name}!`)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 dark:text-emerald-300 font-black text-xs transition-colors"
                      >
                        <i className="fa-solid fa-check mr-1"></i> Chốt lương
                      </button>
                    </td>
                  </tr>
                ))}
                {payrollData.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">Chưa có dữ liệu tính lương.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 4: LỊCH SỬ CHẤM CÔNG THỰC TẾ & GIÁM SÁT ĐI MUỘN VỀ SỚM */}
      {activeTab === 'logs' && (
        <div className="flex flex-col gap-6">
          <div className="glass-effect p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-xl">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-white/10">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-coffee-dark dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-user-clock text-indigo-600"></i>
                  Giám Sát Chấm Công & Đi Muộn Về Sớm
                </h3>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                  Nhật ký thời gian thực theo dõi chính xác từng phút nhân viên ra/vào ca.
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-200 dark:border-white/10">
                <button
                  onClick={() => setLogFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${logFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Tất Cả ({timeLogs.length})
                </button>
                <button
                  onClick={() => setLogFilter('LATE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${logFilter === 'LATE' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  🟠 Trễ Giờ ({timeLogs.filter(l => l.checkInStatus?.includes('Trễ')).length})
                </button>
                <button
                  onClick={() => setLogFilter('EARLY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${logFilter === 'EARLY' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  🔴 Về Sớm ({timeLogs.filter(l => l.checkOutStatus?.includes('Về sớm')).length})
                </button>
                <button
                  onClick={() => setLogFilter('ONTIME')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${logFilter === 'ONTIME' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  🟢 Đúng Giờ ({timeLogs.filter(l => (!l.checkInStatus || l.checkInStatus === 'Đúng giờ') && (!l.checkOutStatus || l.checkOutStatus === 'Đúng giờ')).length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-400">
                    <th className="pb-4 pl-4">Nhân Viên</th>
                    <th className="pb-4">Ngày & Ca Làm</th>
                    <th className="pb-4 text-center">Giờ Check-in (Vào ca)</th>
                    <th className="pb-4 text-center">Giờ Check-out (Ra ca)</th>
                    <th className="pb-4 text-center">Tổng Giờ</th>
                    <th className="pb-4 pr-4 text-right">Lương Tạm Tính</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-bold text-sm">
                  {timeLogs
                    .filter(l => {
                      if (logFilter === 'LATE') return l.checkInStatus?.includes('Trễ')
                      if (logFilter === 'EARLY') return l.checkOutStatus?.includes('Về sớm')
                      if (logFilter === 'ONTIME') return (!l.checkInStatus || l.checkInStatus === 'Đúng giờ') && (!l.checkOutStatus || l.checkOutStatus === 'Đúng giờ')
                      return true
                    })
                    .map((log, idx) => {
                      const st = staff.find(s => String(s.NguoiDungID) === String(log.userId))
                      const roleName = st?.vaitro?.TenVaiTro || 'Nhân Viên'
                      const sType = getStaffType(log.userId, roleName)
                      const salaryRate = getStaffSalaryRate(roleName, sType)
                      const rate = sType === 'Full-time' ? 'Cố định tháng' : `${Math.round((log.totalHours || 0) * salaryRate.hourly).toLocaleString('vi-VN')} đ`

                      const inStatus = log.checkInStatus || 'Đúng giờ'
                      const outStatus = log.checkOutStatus || 'Đúng giờ'

                      return (
                        <tr key={log.id || idx} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                          <td className="py-4 pl-4 text-coffee-dark dark:text-white">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black shrink-0 text-sm">
                                {log.userName?.charAt(0) || 'N'}
                              </div>
                              <div>
                                <span className="block font-black">{log.userName}</span>
                                <span className="text-[11px] text-gray-400">{roleName} • {sType}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="block text-coffee-dark dark:text-white font-black">{log.date}</span>
                            <span className="text-xs text-indigo-500 font-medium">{log.shiftName || 'Ca Làm'}</span>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-mono text-green-600 dark:text-green-400 font-bold">
                                {log.checkInTime ? (log.checkInTime.includes('T') ? new Date(log.checkInTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : log.checkInTime) : '--'}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase mt-1 ${inStatus.includes('Trễ') ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>
                                {inStatus}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-mono text-red-500 dark:text-red-400 font-bold">
                                {log.checkOutTime ? (log.checkOutTime.includes('T') ? new Date(log.checkOutTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : log.checkOutTime) : '--'}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase mt-1 ${outStatus.includes('Về sớm') ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>
                                {outStatus}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <span className="px-3 py-1 rounded-xl bg-gray-100 dark:bg-slate-800 text-coffee-dark dark:text-gray-200 font-black">
                              {log.totalHours}h
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {rate}
                          </td>
                        </tr>
                      )
                    })}
                  {timeLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-gray-400">
                        <i className="fa-solid fa-clock-rotate-left text-3xl mb-3 block opacity-40"></i>
                        Chưa có nhật ký chấm công nào được ghi nhận.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM NHÂN SỰ */}
      {showModal && (
        <div className="fixed inset-0 bg-coffee-dark/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-effect p-8 rounded-[2.5rem] relative max-w-md w-full shadow-2xl border border-white dark:border-white/10 animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar text-coffee-dark dark:text-white">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors font-bold">&times;</button>
            <h3 className="text-2xl font-black text-coffee-green uppercase mb-6 tracking-tighter text-center">Thêm Nhân Sự Mới</h3>
            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 ml-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">Họ & Tên</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full py-3 px-4 rounded-2xl bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 ml-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tên Đăng Nhập</label>
                <input type="text" required value={formUser} onChange={(e) => setFormUser(e.target.value)} className="w-full py-3 px-4 rounded-2xl bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 ml-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mật Khẩu</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="w-full py-3 px-4 pr-12 rounded-2xl bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-indigo-500 transition-colors">
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 ml-2 italic">Mặc định là 123456 nếu bỏ trống</span>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 ml-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">Số Điện Thoại</label>
                <input type="text" required value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full py-3 px-4 rounded-2xl bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 ml-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vai Trò</label>
                  <CustomDropdown
                    options={[
                      { value: 2, label: 'Quản Lý', icon: 'fa-user-tie', color: 'bg-amber-100 text-amber-800' },
                      { value: 3, label: 'Thu Ngân', icon: 'fa-cash-register', color: 'bg-blue-100 text-blue-800' },
                      { value: 4, label: 'Pha Chế', icon: 'fa-blender', color: 'bg-emerald-100 text-emerald-800' },
                      { value: 5, label: 'Phục Vụ', icon: 'fa-concierge-bell', color: 'bg-purple-100 text-purple-800' }
                    ]}
                    value={formRole}
                    onChange={(val) => setFormRole(Number(val))}
                    placeholder="Chọn vai trò"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 ml-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phân Loại</label>
                  <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl border border-gray-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormType('Part-time')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                        formType === 'Part-time' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      🟢 Part-Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('Full-time')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                        formType === 'Full-time' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      🔵 Full-Time
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-base uppercase tracking-wider shadow-lg mt-6 transition-all">
                Tạo Tài Khoản
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default StaffView
