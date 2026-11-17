// Utility functions for staff classification, shift schedules, attendance check-in, and payroll calculation
// Syncs across tabs and broadcasts real-time updates between Admin and Staff interfaces.
import { supabase } from '../supabaseClient'

const STAFF_TYPES_KEY = 'coffee_staff_types'
const WEEKLY_SHIFTS_KEY = 'coffee_weekly_shifts'
const TIMECLOCK_LOGS_KEY = 'coffee_timeclock_logs'
const ACTIVE_CHECKINS_KEY = 'coffee_active_checkins'
const SCHEDULE_LOCKED_KEY = 'coffee_schedule_locked'

export const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']

export const SHIFT_SLOTS = [
  { id: 'morning', name: 'Ca Sáng', time: '08:00 - 12:00', hours: 4, icon: 'fa-sun', color: 'from-amber-500 to-orange-500', desc: 'Ca làm sáng sớm, chuẩn bị nguyên liệu và phục vụ khách sáng.' },
  { id: 'afternoon', name: 'Ca Chiều', time: '13:00 - 17:00', hours: 4, icon: 'fa-cloud-sun', color: 'from-blue-500 to-cyan-500', desc: 'Ca buổi chiều, duy trì hoạt động và dọn dẹp khu vực bar.' },
  { id: 'evening', name: 'Ca Tối', time: '18:00 - 22:00', hours: 4, icon: 'fa-moon', color: 'from-indigo-600 to-purple-600', desc: 'Ca cao điểm buổi tối, phục vụ khách và chốt ca cuối ngày.' }
]

// List of old fake/mock staff names to automatically purge from localStorage
const FAKE_MOCK_NAMES = [
  'Nguyễn Văn Minh',
  'Trần Thị Mai',
  'Lê Hoàng Nam',
  'Phạm Thanh Sơn',
  'Hoàng Lan Anh',
  'Nhân viên Demo'
]

const SYNC_CHANNEL_NAME = 'coffee_hr_realtime_sync_channel'
export let syncChannel = null
try {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME)
} catch (e) { }

// Helper to broadcast synchronization event across all Admin and Staff components/tabs
export const broadcastUpdate = () => {
  const ts = String(Date.now())
  try {
    localStorage.setItem('coffee_sync_timestamp', ts)
  } catch (e) { }
  try {
    window.dispatchEvent(new CustomEvent('staff_data_updated', { detail: { timestamp: ts } }))
  } catch (e) { }
  try {
    if (syncChannel) {
      syncChannel.postMessage({ type: 'UPDATE', timestamp: ts })
    }
  } catch (e) { }
}

export const getSyncTimestamp = () => {
  try {
    return localStorage.getItem('coffee_sync_timestamp') || '0'
  } catch (e) {
    return '0'
  }
}

// Schedule lock status
export const getScheduleLockStatus = () => {
  try {
    return localStorage.getItem(SCHEDULE_LOCKED_KEY) === 'true'
  } catch (e) {
    return false
  }
}

export const setScheduleLockStatus = (isLocked) => {
  try {
    localStorage.setItem(SCHEDULE_LOCKED_KEY, String(isLocked))
    broadcastUpdate()
    if (supabase) {
      supabase.from('hr_settings').upsert({ key: 'schedule_locked', value: String(isLocked) }).then()
    }
  } catch (e) {
    console.error('Error saving schedule lock status:', e)
  }
}

// Salary rate matrix by role and type
export const getStaffSalaryRate = (roleName = '', type = 'Part-time') => {
  const roleStr = String(roleName || '').toLowerCase()
  let monthly = 5500000
  let hourly = 28000

  if (roleStr.includes('quản lý') || roleStr.includes('manager')) {
    monthly = 10000000
    hourly = 50000
  } else if (roleStr.includes('pha chế') || roleStr.includes('barista')) {
    monthly = 7000000
    hourly = 35000
  } else if (roleStr.includes('thu ngân') || roleStr.includes('cashier')) {
    monthly = 6500000
    hourly = 35000
  } else {
    monthly = 5500000
    hourly = 28000
  }

  const formatted = type === 'Full-time'
    ? `${monthly.toLocaleString('vi-VN')}đ / tháng`
    : `${hourly.toLocaleString('vi-VN')}đ / giờ`

  return { monthly, hourly, formatted }
}

// 1. Staff Classification (Full-time vs Part-time)
export const getStaffType = (userId, defaultRoleName = '') => {
  try {
    const saved = localStorage.getItem(STAFF_TYPES_KEY)
    const typesMap = saved ? JSON.parse(saved) : {}
    if (typesMap[userId]) {
      return typesMap[userId]
    }
    // Default logic: Quản lý & Thu ngân -> Full-time; Pha chế & Phục vụ -> Part-time
    if (defaultRoleName && (defaultRoleName.includes('Quản Lý') || defaultRoleName.includes('Thu Ngân'))) {
      return 'Full-time'
    }
    return 'Part-time'
  } catch (e) {
    return 'Part-time'
  }
}

export const setStaffType = (userId, type) => {
  try {
    const saved = localStorage.getItem(STAFF_TYPES_KEY)
    const typesMap = saved ? JSON.parse(saved) : {}
    typesMap[userId] = type
    localStorage.setItem(STAFF_TYPES_KEY, JSON.stringify(typesMap))
    broadcastUpdate()
    if (supabase) {
      supabase.from('hr_staff_types').upsert({ user_id: userId, staff_type: type }).then()
    }
  } catch (e) {
    console.error('Error saving staff type:', e)
  }
}

export const getAllStaffTypesMap = () => {
  try {
    const saved = localStorage.getItem(STAFF_TYPES_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch (e) {
    return {}
  }
}

// Helper: automatically clean out old mock names from shifts structure
const cleanMockShifts = (shiftsMap) => {
  let hasChanged = false
  DAYS_OF_WEEK.forEach(day => {
    if (!shiftsMap[day]) {
      shiftsMap[day] = { morning: [], afternoon: [], evening: [] }
      hasChanged = true
    } else {
      SHIFT_SLOTS.forEach(slot => {
        if (!shiftsMap[day][slot.id]) {
          shiftsMap[day][slot.id] = []
          hasChanged = true
        } else {
          const origLen = shiftsMap[day][slot.id].length
          shiftsMap[day][slot.id] = shiftsMap[day][slot.id].filter(s => !FAKE_MOCK_NAMES.includes(s.name))
          if (shiftsMap[day][slot.id].length !== origLen) {
            hasChanged = true
          }
        }
      })
    }
  })
  if (hasChanged) {
    try {
      localStorage.setItem(WEEKLY_SHIFTS_KEY, JSON.stringify(shiftsMap))
    } catch (e) { }
  }
  return shiftsMap
}

// 2. Weekly Shifts Schedule (No mock/fake seeds! Automatically purges old localStorage mocks)
export const getWeeklyShifts = () => {
  try {
    const saved = localStorage.getItem(WEEKLY_SHIFTS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return cleanMockShifts(parsed)
    }
  } catch (e) {
    console.error('Error reading weekly shifts:', e)
  }

  // Return clean empty shifts if none exist yet
  const emptyShifts = {}
  DAYS_OF_WEEK.forEach(day => {
    emptyShifts[day] = { morning: [], afternoon: [], evening: [] }
  })
  return emptyShifts
}

export const saveWeeklyShifts = (shiftsMap) => {
  try {
    localStorage.setItem(WEEKLY_SHIFTS_KEY, JSON.stringify(shiftsMap))
    broadcastUpdate()
  } catch (e) {
    console.error('Error saving weekly shifts:', e)
  }
}

export const toggleStaffShift = (day, shiftId, staffMember) => {
  const currentShifts = getWeeklyShifts()
  if (!currentShifts[day]) currentShifts[day] = { morning: [], afternoon: [], evening: [] }
  if (!currentShifts[day][shiftId]) currentShifts[day][shiftId] = []

  const staffList = currentShifts[day][shiftId]
  const existingIndex = staffList.findIndex(s => String(s.id) === String(staffMember.id || staffMember.NguoiDungID))

  let isRemoving = existingIndex > -1

  if (isRemoving) {
    // Remove from shift
    staffList.splice(existingIndex, 1)
  } else {
    // Add to shift
    staffList.push({
      id: staffMember.id || staffMember.NguoiDungID,
      name: staffMember.name || staffMember.HoTen || 'Nhân viên',
      role: staffMember.role || staffMember.vaitro?.TenVaiTro || 'Nhân Viên',
      type: staffMember.type || getStaffType(staffMember.id || staffMember.NguoiDungID, staffMember.role || staffMember.vaitro?.TenVaiTro)
    })
  }

  saveWeeklyShifts(currentShifts)

  if (supabase) {
    const uid = staffMember.id || staffMember.NguoiDungID
    if (isRemoving) {
      supabase.from('hr_shifts').delete().match({ day_of_week: day, shift_id: shiftId, user_id: uid }).then()
    } else {
      supabase.from('hr_shifts').insert({
        day_of_week: day,
        shift_id: shiftId,
        user_id: uid,
        user_name: staffMember.name || staffMember.HoTen || 'Nhân viên',
        user_role: staffMember.role || staffMember.vaitro?.TenVaiTro || 'Nhân Viên'
      }).then()
    }
  }

  return currentShifts
}

export const getStaffScheduledHours = (staffId) => {
  const shifts = getWeeklyShifts()
  let totalHours = 0
  let totalShiftsCount = 0

  DAYS_OF_WEEK.forEach(day => {
    SHIFT_SLOTS.forEach(slot => {
      const list = shifts[day]?.[slot.id] || []
      if (list.some(s => String(s.id) === String(staffId))) {
        totalHours += slot.hours
        totalShiftsCount += 1
      }
    })
  })

  return { totalHours, totalShiftsCount }
}

// 3. Timeclock & Attendance Logs (Real timestamps only, purges old mocks)
export const getActiveCheckIn = (userId) => {
  try {
    const saved = localStorage.getItem(ACTIVE_CHECKINS_KEY)
    const map = saved ? JSON.parse(saved) : {}
    return map[userId] || null
  } catch (e) {
    return null
  }
}

export const checkInStaff = (userId, userName, shiftIdParam = null) => {
  try {
    const saved = localStorage.getItem(ACTIVE_CHECKINS_KEY)
    const map = saved ? JSON.parse(saved) : {}

    const now = new Date()
    const currentHour = now.getHours()
    const currentMins = now.getMinutes()
    const totalMinsNow = currentHour * 60 + currentMins

    // Auto-detect or use provided shift
    let targetSlot = null
    if (shiftIdParam) {
      targetSlot = SHIFT_SLOTS.find(s => s.id === shiftIdParam)
    }
    if (!targetSlot) {
      if (currentHour < 12) targetSlot = SHIFT_SLOTS[0] // morning 08:00
      else if (currentHour < 17) targetSlot = SHIFT_SLOTS[1] // afternoon 13:00
      else targetSlot = SHIFT_SLOTS[2] // evening 18:00
    }

    // Calculate Punctuality (Grace period <= 5 mins)
    let expectedStartHour = 8
    if (targetSlot.id === 'afternoon') expectedStartHour = 13
    if (targetSlot.id === 'evening') expectedStartHour = 18
    const expectedStartMins = expectedStartHour * 60

    let checkInStatus = 'Đúng giờ'
    if (totalMinsNow > expectedStartMins + 5) {
      const lateMins = totalMinsNow - expectedStartMins
      checkInStatus = `Trễ giờ (${lateMins}p)`
    }

    const checkInData = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      userId,
      userName,
      shiftId: targetSlot.id,
      shiftName: targetSlot.name,
      checkInTime: now.toISOString(),
      checkInStatus,
      expectedEndHour: expectedStartHour + targetSlot.hours,
      timestamp: Date.now()
    }

    map[userId] = checkInData
    localStorage.setItem(ACTIVE_CHECKINS_KEY, JSON.stringify(map))
    broadcastUpdate()

    if (supabase) {
      supabase.from('hr_timeclock').insert({
        id: checkInData.id,
        user_id: userId,
        user_name: userName,
        shift_id: checkInData.shiftId,
        shift_name: checkInData.shiftName,
        check_in_time: checkInData.checkInTime,
        check_in_status: checkInData.checkInStatus,
        date_str: now.toLocaleDateString('vi-VN')
      }).then()
    }

    return checkInData
  } catch (e) {
    console.error('Error check in:', e)
    return null
  }
}

export const checkOutStaff = (userId) => {
  try {
    const saved = localStorage.getItem(ACTIVE_CHECKINS_KEY)
    const activeMap = saved ? JSON.parse(saved) : {}
    const activeSession = activeMap[userId]

    if (!activeSession) return null

    const now = new Date()
    const currentHour = now.getHours()
    const currentMins = now.getMinutes()
    const totalMinsNow = currentHour * 60 + currentMins

    const nowTs = Date.now()
    let elapsedHours = (nowTs - activeSession.timestamp) / (1000 * 60 * 60)

    // Ensure minimum recording accuracy
    if (elapsedHours < 0.01) {
      elapsedHours = 0.01 // minimum ~36 seconds for test recording if clicked immediately
    }

    // Calculate Early Leave (Grace period 5 mins before expected end time)
    let expectedEndHour = activeSession.expectedEndHour || 12
    if (activeSession.shiftId === 'afternoon') expectedEndHour = 17
    if (activeSession.shiftId === 'evening') expectedEndHour = 22
    const expectedEndMins = expectedEndHour * 60

    let checkOutStatus = 'Đúng giờ'
    if (totalMinsNow < expectedEndMins - 5) {
      const earlyMins = expectedEndMins - totalMinsNow
      checkOutStatus = `Về sớm (${earlyMins}p)`
    }

    const logEntry = {
      id: activeSession.id || Date.now().toString(),
      userId: activeSession.userId,
      userName: activeSession.userName,
      shiftId: activeSession.shiftId || 'morning',
      shiftName: activeSession.shiftName || 'Ca Sáng',
      checkInTime: activeSession.checkInTime,
      checkOutTime: now.toISOString(),
      checkInStatus: activeSession.checkInStatus || 'Đúng giờ',
      checkOutStatus,
      totalHours: Number(elapsedHours.toFixed(2)),
      date: now.toLocaleDateString('vi-VN')
    }

    // Save to logs
    const logsSaved = localStorage.getItem(TIMECLOCK_LOGS_KEY)
    let logs = logsSaved ? JSON.parse(logsSaved) : []
    // Clean mock logs if present
    logs = logs.filter(l => !FAKE_MOCK_NAMES.includes(l.userName))

    logs.unshift(logEntry)
    localStorage.setItem(TIMECLOCK_LOGS_KEY, JSON.stringify(logs))

    // Remove from active checkins
    delete activeMap[userId]
    localStorage.setItem(ACTIVE_CHECKINS_KEY, JSON.stringify(activeMap))

    broadcastUpdate()

    if (supabase) {
      if (activeSession.id) {
        supabase.from('hr_timeclock').update({
          check_out_time: logEntry.checkOutTime,
          check_out_status: logEntry.checkOutStatus,
          total_hours: logEntry.totalHours
        }).eq('id', activeSession.id).then()
      } else {
        supabase.from('hr_timeclock').insert({
          id: logEntry.id,
          user_id: logEntry.userId,
          user_name: logEntry.userName,
          shift_id: logEntry.shiftId,
          shift_name: logEntry.shiftName,
          check_in_time: logEntry.checkInTime,
          check_in_status: logEntry.checkInStatus,
          check_out_time: logEntry.checkOutTime,
          check_out_status: logEntry.checkOutStatus,
          total_hours: logEntry.totalHours,
          date_str: logEntry.date
        }).then()
      }
    }

    return logEntry
  } catch (e) {
    console.error('Error check out:', e)
    return null
  }
}

export const getTimeclockLogs = (userId = null) => {
  try {
    const saved = localStorage.getItem(TIMECLOCK_LOGS_KEY)
    let logs = saved ? JSON.parse(saved) : []

    // Clean old mock names
    const origLen = logs.length
    logs = logs.filter(l => !FAKE_MOCK_NAMES.includes(l.userName))
    if (logs.length !== origLen) {
      try { localStorage.setItem(TIMECLOCK_LOGS_KEY, JSON.stringify(logs)) } catch (e) { }
    }

    if (userId) {
      return logs.filter(l => String(l.userId) === String(userId))
    }
    return logs
  } catch (e) {
    return []
  }
}

// 4. Payroll Calculation (Uses real scheduled shifts & actual worked timeclock hours)
export const calculateSingleStaffPayroll = (staffId, staffName, roleName, type) => {
  const { totalHours: scheduledHours, totalShiftsCount: scheduledShifts } = getStaffScheduledHours(staffId)
  const logs = getTimeclockLogs()

  // Filter logs for this specific staff AND for the current month
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const staffLogs = logs.filter(l => {
    if (String(l.userId) !== String(staffId)) return false
    const parts = String(l.date).split('/')
    if (parts.length === 3) {
      const logMonth = parseInt(parts[1], 10) - 1
      const logYear = parseInt(parts[2], 10)
      return logMonth === currentMonth && logYear === currentYear
    }
    return true
  })

  const actualWorkedHours = staffLogs.reduce((sum, l) => sum + (Number(l.totalHours) || 0), 0)

  const salaryRate = getStaffSalaryRate(roleName, type)
  let estimatedWeeklySalary = 0
  let estimatedMonthlySalary = 0

  if (type === 'Full-time') {
    estimatedMonthlySalary = salaryRate.monthly
    estimatedWeeklySalary = Math.round(salaryRate.monthly / 4)
  } else {
    estimatedWeeklySalary = Math.round(scheduledHours * salaryRate.hourly)
    const effectiveHours = Math.max(scheduledHours * 4, actualWorkedHours)
    estimatedMonthlySalary = Math.round(effectiveHours * salaryRate.hourly)
  }

  return {
    id: staffId,
    name: staffName,
    role: roleName,
    type: type,
    baseRateFormatted: salaryRate.formatted,
    scheduledShifts,
    scheduledHours,
    actualWorkedHours,
    estimatedWeeklySalary,
    estimatedMonthlySalary
  }
}

// ============================================================================
// SUPABASE REAL-TIME HYBRID SYNC LAYER
// Bắt buộc dữ liệu localStorage đồng bộ trực tiếp với Supabase để dùng chéo thiết bị
// ============================================================================

export const syncWithSupabase = async () => {
  if (!supabase) return

  try {
    // 1. Đồng bộ Staff Types
    const { data: typesData } = await supabase.from('hr_staff_types').select('*')
    if (typesData) {
      const newTypes = {}
      typesData.forEach(r => newTypes[r.user_id] = r.staff_type)
      localStorage.setItem(STAFF_TYPES_KEY, JSON.stringify(newTypes))
    }

    // 2. Đồng bộ Settings (Khóa lịch)
    const { data: settingsData } = await supabase.from('hr_settings').select('*')
    if (settingsData) {
      const lockedRow = settingsData.find(r => r.key === 'schedule_locked')
      if (lockedRow) {
        localStorage.setItem(SCHEDULE_LOCKED_KEY, lockedRow.value)
      }
    }

    // 3. Đồng bộ Timeclock Logs
    const { data: logsData } = await supabase.from('hr_timeclock').select('*').order('check_out_time', { ascending: false, nullsFirst: false })
    if (logsData) {
      const completeLogs = logsData.filter(r => r.check_out_time).map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        shiftId: r.shift_id,
        shiftName: r.shift_name,
        checkInTime: r.check_in_time,
        checkOutTime: r.check_out_time,
        checkInStatus: r.check_in_status,
        checkOutStatus: r.check_out_status,
        totalHours: r.total_hours,
        date: r.date_str
      }))
      localStorage.setItem(TIMECLOCK_LOGS_KEY, JSON.stringify(completeLogs))

      // Tái tạo Active Checkins (Ca đang chạy, chưa checkout)
      const activeLogs = logsData.filter(r => !r.check_out_time)
      if (activeLogs.length > 0) {
        const map = {}
        activeLogs.forEach(r => {
          map[r.user_id] = {
            id: r.id,
            userId: r.user_id,
            userName: r.user_name,
            shiftId: r.shift_id,
            shiftName: r.shift_name,
            checkInTime: r.check_in_time,
            checkInStatus: r.check_in_status,
            expectedEndHour: new Date(r.check_in_time).getHours() + 4,
            timestamp: new Date(r.check_in_time).getTime()
          }
        })
        localStorage.setItem(ACTIVE_CHECKINS_KEY, JSON.stringify(map))
      }
    }

    // 4. Đồng bộ Weekly Shifts
    const { data: shiftsData } = await supabase.from('hr_shifts').select('*')
    if (shiftsData) {
      const newShifts = {}
      DAYS_OF_WEEK.forEach(day => { newShifts[day] = { morning: [], afternoon: [], evening: [] } })

      const savedTypes = localStorage.getItem(STAFF_TYPES_KEY)
      const typesMap = savedTypes ? JSON.parse(savedTypes) : {}

      shiftsData.forEach(r => {
        if (!newShifts[r.day_of_week]) newShifts[r.day_of_week] = { morning: [], afternoon: [], evening: [] }
        if (!newShifts[r.day_of_week][r.shift_id]) newShifts[r.day_of_week][r.shift_id] = []

        newShifts[r.day_of_week][r.shift_id].push({
          id: r.user_id,
          name: r.user_name,
          role: r.user_role,
          type: typesMap[r.user_id] || 'Part-time'
        })
      })
      localStorage.setItem(WEEKLY_SHIFTS_KEY, JSON.stringify(newShifts))
    }

    broadcastUpdate()
  } catch (e) {
    console.error('Lỗi khi đồng bộ từ Supabase:', e)
  }
}

let isSubscribed = false
export const initSupabaseSync = () => {
  if (!supabase || isSubscribed) return
  isSubscribed = true

  syncWithSupabase()

  supabase.channel('hr_realtime_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_staff_types' }, syncWithSupabase)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_settings' }, syncWithSupabase)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_shifts' }, syncWithSupabase)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_timeclock' }, syncWithSupabase)
    .subscribe()
}

// Auto init
setTimeout(() => {
  initSupabaseSync()
}, 1000)

export const calculateStaffPayroll = (staffList) => {
  return staffList.map(staff => {
    const staffId = staff.NguoiDungID || staff.id
    const staffName = staff.HoTen || staff.name
    const roleName = staff.vaitro?.TenVaiTro || staff.role || 'Nhân Viên'
    const type = getStaffType(staffId, roleName)

    return calculateSingleStaffPayroll(staffId, staffName, roleName, type)
  })
}
