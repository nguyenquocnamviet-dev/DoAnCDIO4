import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const Navbar = ({ cartCount, setCartOpen, user, setAuthModalOpen, setAuthModalMode, onLogout, isDarkMode, setIsDarkMode }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  
  const [notifications, setNotifications] = useState([])
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      return
    }

    const fetchNotifs = async () => {
      const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!isConfigured) return

      try {
        const { data, error } = await supabase
          .from('donhang')
          .select('DonHangID, MaDonHang, TrangThai, NgayCapNhat')
          .eq('KhachHangID', user.NguoiDungID)
          .order('NgayCapNhat', { ascending: false })
          .limit(15)

        if (error) throw error
        if (data) {
          const notifs = data.map(o => {
            let msg = ''
            let icon = 'fa-receipt'
            let color = 'text-gray-500'
            
            if (o.TrangThai === 'DangPhaChe') {
              msg = `Đơn hàng ${o.MaDonHang || `#DH${o.DonHangID}`} đang được pha chế.`
              icon = 'fa-blender'
              color = 'text-blue-500'
            } else if (o.TrangThai === 'DangGiao') {
              msg = `Đơn hàng ${o.MaDonHang || `#DH${o.DonHangID}`} đang được giao đến bạn!`
              icon = 'fa-motorcycle'
              color = 'text-purple-500'
            } else if (o.TrangThai === 'HoanThanh') {
              msg = `Đơn hàng ${o.MaDonHang || `#DH${o.DonHangID}`} đã hoàn thành.`
              icon = 'fa-circle-check'
              color = 'text-green-500'
            } else if (o.TrangThai === 'DaHuy') {
              msg = `Đơn hàng ${o.MaDonHang || `#DH${o.DonHangID}`} đã bị hủy.`
              icon = 'fa-circle-xmark'
              color = 'text-red-500'
            } else {
              msg = `Đơn hàng ${o.MaDonHang || `#DH${o.DonHangID}`} đang chờ xác nhận.`
              icon = 'fa-clock'
              color = 'text-amber-500'
            }

            return {
              id: o.DonHangID,
              title: 'Cập nhật đơn hàng',
              message: msg,
              isRead: o.TrangThai === 'HoanThanh' || o.TrangThai === 'DaHuy',
              time: new Date(o.NgayCapNhat).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              icon,
              color
            }
          })
          setNotifications(notifs)
        }
      } catch (err) {
        console.error('Lỗi tải thông báo:', err)
      }
    }

    fetchNotifs()

    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!isConfigured) return

    const channel = supabase
      .channel(`navbar_notif_${user.NguoiDungID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donhang', filter: `KhachHangID=eq.${user.NguoiDungID}` }, () => {
        setTimeout(fetchNotifs, 1000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const unreadCount = notifications.filter(n => !n.isRead).length

  // Helper to determine active route
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/') return 'home'
    if (path === '/features') return 'features'
    if (path === '/menu') return 'menu'
    if (path === '/booking') return 'booking'
    if (path === '/history') return 'history'
    if (path === '/profile') return 'profile'
    return ''
  }

  const activeTab = getActiveTab()

  const tabs = [
    { id: 'home', label: 'Trang chủ', path: '/', icon: 'fa-house' },
    { id: 'features', label: 'Góc Đọc & Acoustic', path: '/features', icon: 'fa-guitar' },
    { id: 'menu', label: 'Thực đơn', path: '/menu', icon: 'fa-mug-hot' },
    { id: 'booking', label: 'Đặt bàn', path: '/booking', icon: 'fa-chair' },
    { id: 'history', label: 'Ưu đãi & Lịch sử', path: '/history', icon: 'fa-gift' },
  ]

  const handleNavClick = (path) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-coffee-green/15 dark:border-slate-800 shadow-sm py-0' : 'bg-transparent py-2'}`}>
      <div className="max-w-[1200px] 2xl:max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-8 transition-all duration-500">
        <div className="flex items-center justify-between h-20 relative w-full gap-2">

          {/* Logo */}
          <div className="flex-none flex justify-start shrink-0 min-w-0">
            <div className="flex items-center space-x-2.5 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300" onClick={() => handleNavClick('/')}>
              <div className="w-10 h-10 xl:w-11 xl:h-11 bg-coffee-green rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                <i className="fa-solid fa-seedling text-base xl:text-lg"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-lg xl:text-xl sm:text-2xl font-black tracking-tighter text-coffee-green uppercase leading-none">Heritage</span>
                <span className="text-[9px] xl:text-[10px] font-extrabold tracking-widest text-coffee-yellow uppercase mt-0.5">Coffee & Tea</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Center Pill) */}
          <div className="hidden xl:flex flex-none justify-center z-10 mx-2">
            <nav className="flex items-center space-x-1 2xl:space-x-1.5 bg-gray-100/80 dark:bg-slate-800/80 p-1.5 rounded-full shadow-inner border border-gray-200/50 dark:border-slate-700/50">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleNavClick(tab.path)}
                    className={`group relative font-bold uppercase whitespace-nowrap rounded-full transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center h-10 w-10 2xl:h-auto 2xl:w-auto 2xl:px-4 2xl:py-2.5 gap-0 2xl:gap-1.5 ${isActive
                      ? 'bg-gradient-to-r from-coffee-green to-emerald-800 text-white shadow-md shadow-coffee-green/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 hover:text-coffee-green dark:hover:text-emerald-400'
                      }`}
                  >
                    <i className={`fa-solid ${tab.icon} text-base ${isActive ? 'text-coffee-yellow' : 'text-gray-400 group-hover:text-coffee-green'}`}></i>
                    <span className="hidden 2xl:inline text-sm tracking-wide">{tab.label}</span>

                    {/* Tooltip on Hover for laptops (hidden on 2xl where text is visible) */}
                    <div className="2xl:hidden absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-gray-900/95 dark:bg-black/95 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 pointer-events-none shadow-xl whitespace-nowrap border border-gray-700/50 flex flex-col items-center">
                      {tab.label}
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900/95 dark:bg-black/95 rotate-45 border-l border-t border-gray-700/50"></div>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden xl:flex flex-none justify-end items-center gap-1 xl:gap-1.5 shrink-0 z-10 min-w-0">

            <button
              onClick={() => setCartOpen(true)}
              className="text-[10px] xl:text-xs 2xl:text-sm font-bold bg-white dark:bg-slate-800 text-coffee-dark dark:text-gray-200 border border-coffee-green/30 dark:border-slate-600 px-2.5 xl:px-3 2xl:px-4 py-1.5 xl:py-2 2xl:py-2.5 rounded-full hover:bg-coffee-green dark:hover:bg-emerald-600 hover:text-white dark:hover:text-white hover:border-coffee-green dark:hover:border-emerald-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm flex items-center gap-1 xl:gap-1.5 2xl:gap-1.5 uppercase group"
            >
              <i className="fa-solid fa-basket-shopping text-coffee-green group-hover:text-white transition-colors text-sm xl:text-base"></i>
              <span>Giỏ</span>
              <span className="bg-coffee-green group-hover:bg-white text-white group-hover:text-coffee-green font-black text-[9px] xl:text-[10px] 2xl:text-xs px-1.5 2xl:px-2 py-0.5 rounded-full transition-colors">
                {cartCount}
              </span>
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="text-[10px] xl:text-xs 2xl:text-sm font-bold bg-white dark:bg-slate-800 text-coffee-dark dark:text-gray-200 border border-coffee-green/30 dark:border-slate-600 w-8 h-8 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm flex items-center justify-center shrink-0"
              title="Giao diện sáng/tối"
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-indigo-500'} text-base`}></i>
            </button>

            {/* Desktop Notification Bell */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className="w-8 h-8 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-full border border-coffee-green/30 dark:border-slate-600 bg-white dark:bg-slate-800 text-coffee-green flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all shadow-sm relative"
                  title="Thông báo"
                >
                  <i className="fa-solid fa-bell text-base"></i>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifMenu && (
                  <div className="absolute top-12 right-0 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-zoom-in z-50">
                    <div className="p-3.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30 flex justify-between items-center">
                      <h4 className="font-black text-coffee-dark dark:text-white uppercase tracking-wider text-sm">
                        Thông Báo
                      </h4>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold text-coffee-green bg-emerald-100 px-2 py-0.5 rounded-full">
                          {unreadCount} đơn đang xử lý
                        </span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto no-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm font-bold">
                          Không có thông báo nào.
                        </div>
                      ) : (
                        notifications.map((n, i) => (
                          <div 
                            key={i} 
                            onClick={() => {
                              setShowNotifMenu(false)
                              navigate('/history')
                            }}
                            className={`p-4 border-b border-gray-50 dark:border-slate-700/50 flex gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-600 ${n.color}`}>
                              <i className={`fa-solid ${n.icon}`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!n.isRead ? 'font-black text-coffee-dark dark:text-white' : 'font-bold text-gray-600 dark:text-gray-300'} leading-tight mb-1`}>
                                {n.message}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400">
                                {n.time}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div 
                      className="p-3 text-center bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer border-t border-gray-100 dark:border-slate-700 transition-colors"
                      onClick={() => {
                        setShowNotifMenu(false)
                        navigate('/history')
                      }}
                    >
                      <span className="text-xs font-black text-coffee-green uppercase tracking-widest">Xem Tất Cả Lịch Sử</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <button
                onClick={() => handleNavClick('/profile')}
                className="text-[10px] xl:text-xs 2xl:text-sm font-bold bg-coffee-dark text-white px-2.5 xl:px-3 2xl:px-4 py-1.5 xl:py-2 2xl:py-2.5 rounded-full hover:bg-coffee-green hover:scale-105 active:scale-95 transition-all duration-300 shadow-md flex items-center gap-1 xl:gap-1.5 2xl:gap-1.5 uppercase shrink-0"
              >
                <i className="fa-solid fa-user text-coffee-yellow"></i> {user.HoTen.split(' ').pop()}
              </button>

            ) : (
              <div className="flex items-center gap-1 xl:gap-1.5 2xl:gap-1.5 shrink-0">
                <button
                  onClick={() => { setAuthModalMode('register'); setAuthModalOpen(true); }}
                  className="text-[10px] xl:text-xs 2xl:text-sm font-bold bg-white dark:bg-slate-800 text-coffee-green dark:text-emerald-400 border border-coffee-green/30 dark:border-slate-600 px-2.5 xl:px-3 2xl:px-4 py-1.5 xl:py-2 2xl:py-2.5 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all duration-300 uppercase shadow-sm whitespace-nowrap"
                >
                  Đăng Ký
                </button>
                <button
                  onClick={() => { setAuthModalMode('login'); setAuthModalOpen(true); }}
                  className="text-[10px] xl:text-xs 2xl:text-sm font-bold bg-gradient-to-r from-coffee-yellow to-amber-500 text-coffee-dark px-2.5 xl:px-3 2xl:px-4 py-1.5 xl:py-2 2xl:py-2.5 rounded-full hover:scale-105 hover:shadow-lg hover:shadow-coffee-yellow/20 active:scale-95 transition-all duration-300 uppercase whitespace-nowrap"
                >
                  Đăng Nhập
                </button>
              </div>
            )}
          </div>

          {/* Mobile Right Controls (Cart + Hamburger Button) */}
          <div className="flex xl:hidden items-center justify-end gap-2 z-10">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-coffee-dark dark:text-gray-200 hover:bg-coffee-green dark:hover:bg-emerald-600 hover:text-white transition-all duration-300 border border-gray-200/80 dark:border-slate-700 shadow-sm"
              aria-label="Toggle Dark Mode"
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-indigo-500'} text-base`}></i>
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="text-sm font-bold bg-white dark:bg-slate-800 text-coffee-dark dark:text-gray-200 border border-coffee-green/30 dark:border-slate-600 px-3.5 py-2 rounded-full hover:bg-coffee-green hover:text-white transition-all duration-300 shadow-sm flex items-center gap-1.5 uppercase"
            >
              <i className="fa-solid fa-basket-shopping text-coffee-green"></i>
              <span className="bg-coffee-green text-white font-black text-xs px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-coffee-dark dark:text-gray-200 hover:bg-coffee-green dark:hover:bg-emerald-600 hover:text-white transition-all duration-300 border border-gray-200/80 dark:border-slate-700 shadow-sm"
              aria-label="Toggle Menu"
            >
              <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark text-lg' : 'fa-bars text-base'}`}></i>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Hamburger Menu Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-fade-in max-h-[85vh] overflow-y-auto">
          {/* Mobile Navigation Links */}
          <div className="space-y-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavClick(tab.path)}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold uppercase transition-all duration-200 flex items-center justify-between ${isActive
                    ? 'bg-gradient-to-r from-coffee-green to-emerald-800 text-white shadow-md shadow-coffee-green/15'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-slate-800 hover:text-coffee-green dark:hover:text-emerald-400'
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${isActive ? 'bg-white/20 text-coffee-yellow' : 'bg-gray-100 text-coffee-green'}`}>
                      <i className={`fa-solid ${tab.icon}`}></i>
                    </div>
                    <span className="text-sm tracking-wide">{tab.label}</span>
                  </div>
                  <i className={`fa-solid fa-chevron-right text-xs ${isActive ? 'text-white/70' : 'text-gray-300'}`}></i>
                </button>
              )
            })}
          </div>

          <div className="border-t border-gray-200/60 pt-3 mt-3"></div>

          {/* Mobile User / Auth Section */}
          <div className="space-y-2 pt-1">

            {user ? (
              <div className="space-y-2">
                <button
                  onClick={() => handleNavClick('/profile')}
                  className="w-full text-sm font-bold bg-coffee-dark text-white px-4 py-3 rounded-2xl shadow-md flex items-center justify-center gap-2.5 uppercase"
                >
                  <i className="fa-solid fa-user text-coffee-yellow"></i>
                  <span>Tài Khoản: {user.HoTen}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { setAuthModalMode('register'); setAuthModalOpen(true); setMobileMenuOpen(false); }}
                  className="w-full text-sm font-bold bg-white dark:bg-slate-800 text-coffee-green dark:text-emerald-400 border-2 border-coffee-green/30 dark:border-slate-700 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 uppercase tracking-wide text-center shadow-sm"
                >
                  Đăng Ký
                </button>
                <button
                  onClick={() => { setAuthModalMode('login'); setAuthModalOpen(true); setMobileMenuOpen(false); }}
                  className="w-full text-sm font-bold bg-gradient-to-r from-coffee-yellow to-amber-500 text-coffee-dark px-4 py-3 rounded-2xl shadow-md uppercase tracking-wide text-center"
                >
                  Đăng Nhập
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
