import React, { useState, useEffect } from 'react'
import {
  DAYS_OF_WEEK,
  SHIFT_SLOTS,
  getStaffType,
  getWeeklyShifts,
  toggleStaffShift,
  getStaffScheduledHours,
  getActiveCheckIn,
  checkInStaff,
  checkOutStaff,
  getTimeclockLogs,
  getScheduleLockStatus,
  getStaffSalaryRate,
  syncChannel,
  getSyncTimestamp,
  calculateSingleStaffPayroll
} from '../utils/shiftUtils'

const StaffAccountView = ({ user, showNotify }) => {
  const [activeTab, setActiveTab] = useState('timeclock') // 'timeclock' | 'shifts'
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Responsive Shift View Mode: 'day' (tabbed by day, compact & clean) vs 'week' (all 7 days grid)
  const [shiftViewMode, setShiftViewMode] = useState('day')
  const [selectedDay, setSelectedDay] = useState('Thứ 2')

  // Real user from Database / Props
  const userId = user?.NguoiDungID || 101
  const userName = user?.HoTen || 'Nhân Viên'
  const roleName = user?.vaitro?.TenVaiTro || 'Nhân Viên'
  
  const [staffType, setStaffTypeState] = useState(() => getStaffType(userId, roleName))
  const [weeklyShifts, setWeeklyShifts] = useState(() => getWeeklyShifts())
  const [activeCheckIn, setActiveCheckInState] = useState(() => getActiveCheckIn(userId))
  const [myLogs, setMyLogs] = useState(() => getTimeclockLogs(userId))
  const [scheduleLocked, setScheduleLocked] = useState(() => getScheduleLockStatus())
  const [elapsedString, setElapsedString] = useState('00:00:00')
  const [lastTs, setLastTs] = useState(() => getSyncTimestamp())

  // 1. Precise Real-Time Clock & Duration Counter
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)

      if (activeCheckIn) {
        const diff = now.getTime() - activeCheckIn.timestamp
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const secs = Math.floor((diff % (1000 * 60)) / 1000)
        setElapsedString(
          `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        )
      } else {
        setElapsedString('00:00:00')
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeCheckIn])

  // 2. Real-time Two-Way Event Sync with Admin across all tabs/windows
  useEffect(() => {
    const handleSync = () => {
      setWeeklyShifts(getWeeklyShifts())
      setStaffTypeState(getStaffType(userId, roleName))
      setActiveCheckInState(getActiveCheckIn(userId))
      setMyLogs(getTimeclockLogs(userId))
      setScheduleLocked(getScheduleLockStatus())
    }

    window.addEventListener('staff_data_updated', handleSync)
    window.addEventListener('storage', handleSync)
    if (syncChannel) {
      syncChannel.addEventListener('message', handleSync)
    }

    // Background polling for multi-window sync resilience
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
  }, [userId, roleName, lastTs])

  const handleCheckIn = () => {
    const result = checkInStaff(userId, userName)
    if (result) {
      setActiveCheckInState(result)
      showNotify(`🎯 Đã BẮT ĐẦU ca làm việc lúc: ${new Date(result.checkInTime).toLocaleTimeString('vi-VN')}`)
    }
  }

  const handleCheckOut = () => {
    const log = checkOutStaff(userId)
    if (log) {
      setActiveCheckInState(null)
      setMyLogs(getTimeclockLogs(userId))
      const earnings = staffType === 'Part-time' ? ` (Thu nhập: ${(log.totalHours * getStaffSalaryRate(roleName, staffType).hourly).toLocaleString('vi-VN')}đ)` : ''
      showNotify(`🏁 Đã KẾT THÚC ca làm việc: ${log.totalHours} giờ${earnings}`)
    }
  }

  const handleToggleShift = (day, shiftId) => {
    if (scheduleLocked) {
      showNotify('🔒 Bảng phân ca đang bị KHÓA bởi Admin! Bạn không thể thay đổi ca lúc này.')
      return
    }
    if (staffType !== 'Part-time') {
      showNotify('⚠️ Tính năng tự đăng ký/hủy ca chỉ áp dụng cho nhân viên Part-Time!')
      return
    }
    const updated = toggleStaffShift(day, shiftId, {
      id: userId,
      name: userName,
      role: roleName,
      type: staffType
    })
    setWeeklyShifts({ ...updated })
    showNotify(`Đã cập nhật lịch làm việc cho ${day}!`)
  }

  // Calculate my scheduled stats using the synced payroll logic!
  const myPayroll = calculateSingleStaffPayroll(userId, userName, roleName, staffType)
  const mySalaryRate = getStaffSalaryRate(roleName, staffType)

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto no-scrollbar flex flex-col gap-5 animate-fade-in text-coffee-dark dark:text-gray-100">
      
      {/* Compact Header & Profile Strip (No clipping, sleek horizontal responsive layout) */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 text-white p-5 md:p-6 shadow-xl border border-white/10 shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 p-1 shadow-lg shrink-0 flex items-center justify-center text-white text-2xl font-black">
              {userName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight truncate">{userName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-amber-300">
                  {roleName}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  staffType === 'Part-time' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
                }`}>
                  {staffType} ({mySalaryRate.formatted})
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium mt-1 flex items-center gap-3 flex-wrap">
                <span><i className="fa-solid fa-calendar-day text-amber-400 mr-1"></i>{currentTime.toLocaleDateString('vi-VN')}</span>
                <span><i className="fa-solid fa-clock text-amber-400 mr-1 animate-pulse"></i><strong className="font-mono text-amber-300">{currentTime.toLocaleTimeString('vi-VN')}</strong></span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[11px]">Tuần này: <strong>{myPayroll.scheduledShifts} ca ({myPayroll.scheduledHours}h)</strong> ~ <strong>{myPayroll.estimatedWeeklySalary.toLocaleString('vi-VN')}đ</strong></span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[11px]">Dự kiến tháng: <strong>{myPayroll.estimatedMonthlySalary.toLocaleString('vi-VN')}đ</strong></span>
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 flex items-center gap-2.5 self-stretch md:self-auto justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping shrink-0"></div>
            <span className="text-xs font-black text-white uppercase tracking-wider">Đồng Bộ Thực & DB</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-200 dark:border-white/10 gap-4 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => setActiveTab('timeclock')}
          className={`pb-2.5 px-4 text-sm md:text-base font-black uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'timeclock'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          1. Chấm Công & Bấm Giờ
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`pb-2.5 px-4 text-sm md:text-base font-black uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'shifts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
          }`}
        >
          <i className="fa-solid fa-calendar-days"></i>
          2. Đăng Ký Ca Làm Việc (Part-time)
          {staffType === 'Part-time' && (
            <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase ml-1">Quan trọng</span>
          )}
        </button>
      </div>

      {/* TAB 1: TIMECLOCK (CHẤM CÔNG THEO THỜI GIAN THỰC) */}
      {activeTab === 'timeclock' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Check-In / Check-Out Card */}
          <div className="lg:col-span-1 glass-effect p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden h-fit">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl shadow-lg mb-3 animate-pulse">
              <i className="fa-solid fa-stopwatch"></i>
            </div>
            
            <h3 className="text-lg font-black uppercase tracking-tight text-coffee-dark dark:text-white mb-1">
              Bấm Giờ Chấm Công
            </h3>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-5">
              Đồng bộ chính xác với hệ thống máy chủ và thời gian thực
            </p>

            {activeCheckIn ? (
              <div className="w-full bg-green-50 dark:bg-green-950/40 border-2 border-green-500 rounded-2xl p-5 mb-5 flex flex-col items-center shadow-inner">
                <span className="text-xs font-black uppercase tracking-wider text-green-700 dark:text-green-300 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                  Đang làm việc (Đã Check-In)
                </span>
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2 flex-wrap">
                  <span>Giờ vào ca: <strong className="text-green-700 dark:text-green-300">{new Date(activeCheckIn.checkInTime).toLocaleTimeString('vi-VN')}</strong></span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${activeCheckIn.checkInStatus?.includes('Trễ') ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                    {activeCheckIn.checkInStatus || 'Đúng giờ'}
                  </span>
                </div>
                
                <div className="my-3 py-2 px-5 bg-black/80 rounded-xl border border-green-500/40 shadow-lg w-full">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Thời gian thực đang làm:</span>
                  <div className="text-2xl font-mono font-black text-green-400 tracking-wider">
                    {elapsedString}
                  </div>
                </div>

                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Thù lao tạm tính ca này: <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                    {staffType === 'Part-time' 
                      ? `${Math.round(((Date.now() - activeCheckIn.timestamp) / 3600000) * mySalaryRate.hourly).toLocaleString('vi-VN')} đ` 
                      : 'Cố định tháng'}
                  </strong>
                </span>
              </div>
            ) : (
              <div className="w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-2xl p-5 mb-5 flex flex-col items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Trạng thái hiện tại
                </span>
                <div className="text-base font-black text-gray-700 dark:text-gray-300">
                  Chưa vào ca làm việc
                </div>
                <span className="text-xs text-gray-400 mt-0.5">
                  Nhấn nút xanh bên dưới để bắt đầu ca
                </span>
              </div>
            )}

            {/* Real Timeclock Action Button */}
            {!activeCheckIn ? (
              <button
                onClick={handleCheckIn}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-play"></i>
                BẮT ĐẦU CA LÀM (CHECK-IN)
              </button>
            ) : (
              <button
                onClick={handleCheckOut}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-stop"></i>
                KẾT THÚC CA (CHECK-OUT)
              </button>
            )}
          </div>

          {/* Attendance History Table */}
          <div className="lg:col-span-2 glass-effect p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-xl flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-coffee-dark dark:text-white">
                  Lịch Sử Chấm Công Cá Nhân
                </h3>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  Các ca làm việc thực tế và số tiền thù lao tương ứng
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-black shrink-0">
                {myLogs.length} lượt ghi nhận
              </span>
            </div>

            <div className="flex-1 overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-[11px] font-black uppercase tracking-wider text-gray-400">
                    <th className="pb-3 pl-2">Ngày</th>
                    <th className="pb-3">Giờ Vào</th>
                    <th className="pb-3">Giờ Ra</th>
                    <th className="pb-3 text-center">Tổng Giờ</th>
                    <th className="pb-3 text-right pr-2">Lương Tạm Tính</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-bold text-xs">
                  {myLogs.map((log, idx) => {
                    const earnings = staffType === 'Part-time' 
                      ? Math.round(log.totalHours * mySalaryRate.hourly).toLocaleString('vi-VN') + ' đ'
                      : 'Cố định tháng'
                    return (
                      <tr key={log.id || idx} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 pl-2 text-coffee-dark dark:text-white flex items-center gap-1.5 text-sm">
                          <i className="fa-solid fa-calendar-day text-indigo-500 text-xs"></i>
                          {log.date}
                        </td>
                        <td className="py-3 font-mono">
                          <span className="text-green-600 dark:text-green-400 block font-bold">
                            {log.checkInTime ? (log.checkInTime.includes('T') ? new Date(log.checkInTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit', second: '2-digit'}) : log.checkInTime) : '--'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase inline-block mt-0.5 ${log.checkInStatus?.includes('Trễ') ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                            {log.checkInStatus || 'Đúng giờ'}
                          </span>
                        </td>
                        <td className="py-3 font-mono">
                          <span className="text-red-500 dark:text-red-400 block font-bold">
                            {log.checkOutTime ? (log.checkOutTime.includes('T') ? new Date(log.checkOutTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit', second: '2-digit'}) : log.checkOutTime) : '--'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase inline-block mt-0.5 ${log.checkOutStatus?.includes('Về sớm') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {log.checkOutStatus || 'Đúng giờ'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-coffee-dark dark:text-gray-200 font-black inline-block">
                            {log.totalHours}h
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                          {earnings}
                        </td>
                      </tr>
                    )
                  })}
                  {myLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-gray-400 font-medium">
                        <i className="fa-solid fa-inbox text-2xl mb-2 block opacity-50"></i>
                        Chưa có lịch sử chấm công nào trong hệ thống.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SHIFT REGISTRATION (RESPONSIVE CUSTOMIZED SCHEDULE) */}
      {activeTab === 'shifts' && (
        <div className="flex flex-col gap-5">
          {scheduleLocked && (
            <div className="p-5 rounded-3xl bg-red-500/10 border-2 border-red-500 text-red-900 dark:text-red-200 flex items-center gap-4 shadow-lg animate-pulse">
              <i className="fa-solid fa-lock text-3xl text-red-500 shrink-0"></i>
              <div>
                <h4 className="font-black text-sm uppercase">🔒 BẢNG PHÂN CA LÀM ĐÃ BỊ QUẢN LÝ KHÓA!</h4>
                <p className="text-xs font-bold mt-0.5 opacity-80">
                  Lịch trực trong tuần đã được chốt. Bạn không thể tự ý bấm đăng ký hay hủy ca vào lúc này. Vui lòng liên hệ Quản lý nếu có việc khẩn cấp.
                </p>
              </div>
            </div>
          )}

          <div className="glass-effect p-5 md:p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-xl">
            
            {/* Header & View Mode Switcher */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5 pb-5 border-b border-gray-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-coffee-dark dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-calendar-check text-indigo-600"></i>
                  Đăng Ký & Chọn Ca Làm Việc
                </h3>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                  {staffType === 'Part-time' ? (
                    <span>Nhân viên Part-time: Nhấp nút <strong className="text-indigo-600 dark:text-indigo-400">"+ Đăng ký làm ca này"</strong> để nhận ca ngay.</span>
                  ) : (
                    <span>Nhân viên Full-time: Quản lý sẽ phân lịch trực theo tuần cho bạn.</span>
                  )}
                </p>
              </div>

              {/* View Mode Toggle Button */}
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-white/10 w-full sm:w-auto justify-center shrink-0">
                <button
                  onClick={() => setShiftViewMode('day')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    shiftViewMode === 'day'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <i className="fa-solid fa-calendar-day"></i> Xem từng ngày (Chi tiết)
                </button>
                <button
                  onClick={() => setShiftViewMode('week')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    shiftViewMode === 'week'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <i className="fa-solid fa-table-cells"></i> Xem toàn tuần (Lưới)
                </button>
              </div>
            </div>

            {/* MODE 1: DAY VIEW (RESPONSIVE, BUTTON AT TOP/PROMINENT FOR EASY INTERACTION) */}
            {shiftViewMode === 'day' && (
              <div className="flex flex-col gap-5">
                
                {/* Horizontal Day Selector Bar */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {DAYS_OF_WEEK.map(day => {
                    const dayShiftsCount = SHIFT_SLOTS.reduce((sum, slot) => {
                      const list = weeklyShifts[day]?.[slot.id] || []
                      return sum + (list.some(s => String(s.id) === String(userId)) ? 1 : 0)
                    }, 0)
                    const isSelected = selectedDay === day

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`py-2 px-4 rounded-xl font-black text-xs md:text-sm uppercase transition-all shrink-0 flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md scale-105'
                            : 'bg-white/80 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-indigo-400'
                        }`}
                      >
                        <i className={`fa-solid ${day === 'Chủ Nhật' ? 'fa-sun text-amber-400' : 'fa-calendar-day'}`}></i>
                        {day}
                        {dayShiftsCount > 0 && (
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isSelected ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                          }`}>
                            {dayShiftsCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected Day Shift Cards (Spacious 3-Column Grid with prominent buttons) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                  {SHIFT_SLOTS.map(slot => {
                    const staffAssigned = weeklyShifts[selectedDay]?.[slot.id] || []
                    const isMyShift = staffAssigned.some(s => String(s.id) === String(userId))

                    return (
                      <div
                        key={slot.id}
                        className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between relative overflow-hidden shadow-md ${
                          isMyShift
                            ? 'bg-gradient-to-br from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/40 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20'
                            : 'bg-white/80 dark:bg-slate-800/80 border-gray-200/80 dark:border-white/10 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          {/* Slot Header */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${slot.color} text-white flex items-center justify-center text-lg shadow-sm shrink-0`}>
                                <i className={`fa-solid ${slot.icon}`}></i>
                              </div>
                              <div>
                                <h4 className="text-base font-black uppercase tracking-tight text-coffee-dark dark:text-white leading-tight">
                                  {slot.name}
                                </h4>
                                <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400">
                                  🕒 {slot.time} ({slot.hours}h)
                                </span>
                              </div>
                            </div>

                            {isMyShift && (
                              <span className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-lg shadow-sm">
                                ★ Đã chọn
                              </span>
                            )}
                          </div>

                          {/* Action Button AT THE TOP FOR IMMEDIATE INTERACTION (No scroll required!) */}
                          <div className="mb-4">
                            <button
                              onClick={() => handleToggleShift(selectedDay, slot.id)}
                              disabled={staffType !== 'Part-time' || scheduleLocked}
                              className={`w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
                                staffType !== 'Part-time' || scheduleLocked
                                  ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-white/10'
                                  : isMyShift
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]'
                              }`}
                            >
                              {scheduleLocked ? (
                                <>
                                  <i className="fa-solid fa-lock"></i> Đã bị Khóa bởi Admin
                                </>
                              ) : staffType !== 'Part-time' ? (
                                <>
                                  <i className="fa-solid fa-lock"></i> Quản lý xếp lịch
                                </>
                              ) : isMyShift ? (
                                <>
                                  <i className="fa-solid fa-xmark text-sm"></i> ✓ Đã Nhận Ca (Nhấp để hủy)
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-plus text-sm"></i> + ĐĂNG KÝ LÀM CA NÀY
                                </>
                              )}
                            </button>
                          </div>

                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 leading-relaxed bg-white/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                            {slot.desc}
                          </p>

                          {/* Staff Assigned List */}
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1.5 flex items-center justify-between">
                              <span>Nhân sự cùng ca ({staffAssigned.length}):</span>
                            </span>

                            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                              {staffAssigned.map((s, sIdx) => {
                                const isMe = String(s.id) === String(userId)
                                return (
                                  <div
                                    key={sIdx}
                                    className={`py-1.5 px-2.5 rounded-lg flex items-center justify-between text-xs font-bold border ${
                                      isMe
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                        : 'bg-gray-100 dark:bg-slate-700/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/5'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${isMe ? 'bg-white text-indigo-600' : 'bg-gray-300 dark:bg-slate-600 text-gray-800 dark:text-white'}`}>
                                        {s.name.charAt(0)}
                                      </div>
                                      <span className="truncate">{isMe ? `${s.name} (Bạn)` : s.name}</span>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isMe ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300'}`}>
                                      {s.role}
                                    </span>
                                  </div>
                                )
                              })}
                              {staffAssigned.length === 0 && (
                                <div className="text-center py-3 text-xs italic text-gray-400 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                                  Trống ca làm việc.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

              </div>
            )}

            {/* MODE 2: WEEK VIEW (7-DAY GRID, COMPACT FOR WIDE SCREENS) */}
            {shiftViewMode === 'week' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="flex flex-col bg-white/70 dark:bg-slate-800/70 rounded-2xl p-3 border border-gray-200/80 dark:border-white/10 shadow-sm">
                    <div className="text-center pb-2 mb-2 border-b border-gray-200 dark:border-white/10">
                      <span className="text-sm font-black text-coffee-dark dark:text-white uppercase tracking-wider block">
                        {day}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {day === 'Chủ Nhật' ? 'Cuối tuần' : 'Ngày thường'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 flex-1">
                      {SHIFT_SLOTS.map(slot => {
                        const staffAssigned = weeklyShifts[day]?.[slot.id] || []
                        const isMyShift = staffAssigned.some(s => String(s.id) === String(userId))

                        return (
                          <div
                            key={slot.id}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                              isMyShift
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm font-bold'
                                : 'bg-gray-50/90 dark:bg-slate-900/60 border-gray-200/80 dark:border-white/5'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-black uppercase flex items-center gap-1 ${isMyShift ? 'text-white' : 'text-coffee-dark dark:text-gray-200'}`}>
                                  <i className={`fa-solid ${slot.icon} ${isMyShift ? 'text-amber-300' : 'text-indigo-500'}`}></i>
                                  {slot.name}
                                </span>
                              </div>
                              <div className={`text-[10px] mb-2 font-bold ${isMyShift ? 'text-indigo-100' : 'text-gray-400'}`}>
                                🕒 {slot.time}
                              </div>

                              <div className="flex flex-col gap-1 mb-2">
                                {staffAssigned.map((s, sIdx) => {
                                  const isMe = String(s.id) === String(userId)
                                  return (
                                    <div
                                      key={sIdx}
                                      className={`px-2 py-1 rounded-lg flex items-center justify-between text-[11px] font-bold ${
                                        isMyShift
                                          ? isMe ? 'bg-white/20 text-white' : 'bg-white/10 text-indigo-100'
                                          : isMe ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200/80 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                      }`}
                                    >
                                      <span className="truncate">{isMe ? `${s.name} (Bạn)` : s.name}</span>
                                    </div>
                                  )
                                })}
                                {staffAssigned.length === 0 && (
                                  <span className={`text-[10px] italic text-center py-1 rounded block ${isMyShift ? 'text-indigo-200' : 'text-gray-400 bg-white/50 dark:bg-slate-800/50'}`}>
                                    Trống ca
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleShift(day, slot.id)}
                              disabled={staffType !== 'Part-time' || scheduleLocked}
                              className={`w-full py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                                staffType !== 'Part-time' || scheduleLocked
                                  ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed opacity-60'
                                  : isMyShift
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60'
                              }`}
                            >
                              {scheduleLocked ? (
                                <span>🔒 Đã khóa</span>
                              ) : staffType !== 'Part-time' ? (
                                <span>🔒 Quản lý xếp</span>
                              ) : isMyShift ? (
                                <span>✓ Hủy ca này</span>
                              ) : (
                                <span>+ Đăng ký ca</span>
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default StaffAccountView
