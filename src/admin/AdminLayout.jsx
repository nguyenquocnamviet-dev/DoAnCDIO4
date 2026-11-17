import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthModal from '../components/AuthModal'

// Views
import DashboardView from './DashboardView'
import OrdersView from './OrdersView'
import TablesView from './TablesView'
import ProductsView from './ProductsView'
import UsersView from './UsersView'
import ReportsView from './ReportsView'
import SettingsView from './SettingsView'
import VoucherView from './VoucherView'
import InventoryView from './InventoryView'
import StaffView from './StaffView'
import RecipeView from './RecipeView'

const AdminLayout = ({ user, onLogin, onLogout }) => {
  const navigate = useNavigate()


  const [activeTab, setActiveTab] = useState('dashboard')
  const [notification, setNotification] = useState('')
  const [globalScale, setGlobalScale] = useState(16)

  // Sync scale settings
  useEffect(() => {
    document.documentElement.style.fontSize = `${globalScale}px`
    return () => {
      // Reset scale when leaving admin panel
      document.documentElement.style.fontSize = '16px'
    }
  }, [globalScale])

  const showNotify = async (msg) => {
    setNotification(msg)
    try {
      const { playNotificationSound } = await import('../utils/audioUtils');
      const soundType = localStorage.getItem('notify_sound_type') || 'ting';
      playNotificationSound(soundType);
    } catch (e) { console.error(e) }
    const duration = parseInt(localStorage.getItem('notify_duration')) || 3500;
    setTimeout(() => setNotification(''), duration)
  }

  // Global realtime notifications for Admin
  useEffect(() => {
    if (!user || ![1, 2, 3, 4, 5].includes(user.VaiTroID)) return

    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!isConfigured) return
    
    let channel;
    let isActive = true;
    
    import('../supabaseClient').then(({ supabase }) => {
      if (!isActive) return;
      channel = supabase
        .channel(`global_admin_donhang_alerts_${Math.random()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'donhang' },
          (payload) => {
            showNotify(`🔔 CÓ ĐƠN HÀNG MỚI (Mã: #${payload.new.DonHangID})`)
          }
        )
        .subscribe()
    })

    return () => {
      isActive = false;
      if (channel) {
        import('../supabaseClient').then(({ supabase }) => {
          supabase.removeChannel(channel)
        })
      }
    }
  }, [user])

  const handleLogin = (adminUser) => {
    if (onLogin) onLogin(adminUser)
    showNotify(`Xin chào admin: ${adminUser.HoTen}!`)
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      sessionStorage.removeItem('coffee_user')
      window.location.href = '/'
    }
  }

  if (!user || ![1, 2, 3, 4, 5].includes(user.VaiTroID)) {
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <div className="bg-grid-pattern fixed inset-0 -z-20"></div>
        <AuthModal onClose={() => window.location.href = '/'} onLogin={handleLogin} isAdminMode={true} />
      </div>
    )
  }

  const menu = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Tổng Quan' },
    { id: 'orders', icon: 'fa-receipt', label: 'Đơn Hàng' },
    { id: 'tables', icon: 'fa-chair', label: 'Sơ Đồ Bàn' },
    { id: 'products', icon: 'fa-box', label: 'Sản Phẩm' },
    { id: 'inventory', icon: 'fa-warehouse', label: 'Kho Hàng' },
    { id: 'recipes', icon: 'fa-flask', label: 'Định Lượng' },
    { id: 'vouchers', icon: 'fa-ticket', label: 'Khuyến Mãi' },
    { id: 'staff', icon: 'fa-user-tie', label: 'Nhân Sự' },
    { id: 'users', icon: 'fa-users', label: 'Khách Hàng' },
    { id: 'reports', icon: 'fa-chart-column', label: 'Báo Cáo' },
    { id: 'settings', icon: 'fa-gear', label: 'Cài Đặt' },
  ]

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col md:p-3 transition-all duration-300 text-coffee-dark dark:text-gray-200">
      <div className="bg-grid-pattern fixed inset-0 -z-20"></div>

      <div className="flex-1 w-full max-w-[1400px] mx-auto bg-white/30 dark:bg-white/5 backdrop-blur-2xl md:rounded-[2.5rem] border border-white dark:border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden transition-all duration-300">

        {/* Sidebar */}
        <div className="w-full md:w-64 glass-effect border-r border-white/50 dark:border-white/10 flex flex-col shrink-0 h-auto md:h-full md:rounded-l-[2.5rem] z-20">
          <div className="p-6 flex items-center gap-3 border-b border-white/50 cursor-default">
            <div className="w-10 h-10 bg-coffee-green rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <i className="fa-solid fa-seedling text-size-1"></i>
            </div>
            <div>
              <span className="text-size-2 font-black tracking-tighter text-coffee-dark uppercase leading-none block">Admin</span>
              <span className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest block mt-0.5">Heritage Coffee</span>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 flex md:flex-col gap-1">
            {menu.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap ${activeTab === item.id
                  ? 'bg-white shadow-sm border border-gray-100/60 font-black text-coffee-dark'
                  : 'hover:bg-white/50 text-gray-500'
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${activeTab === item.id ? 'bg-coffee-green text-white shadow-sm' : 'bg-gray-100'
                  }`}>
                  <i className={`fa-solid ${item.icon} text-size-0`}></i>
                </div>
                <span className="text-size-0 font-bold uppercase tracking-wider hidden md:block">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-white/50 flex flex-col gap-2">
            <button
              onClick={handleLogout}
              className="w-full btn-danger py-2 px-4 text-size-0"
            >
              <i className="fa-solid fa-right-from-bracket"></i> Đăng Xuất
            </button>
          </div>
        </div>

        {/* Content container */}
        <div className="flex-1 relative z-10 w-full h-full overflow-hidden flex flex-col bg-white/40">
          
          {/* Admin Header with Dark Mode Toggle */}
          <div className="absolute top-4 right-4 z-[60] flex items-center gap-2">
            <button
              onClick={() => {
                const isDark = document.documentElement.classList.contains('dark');
                if (isDark) {
                  document.documentElement.classList.remove('dark');
                  localStorage.setItem('theme', 'light');
                } else {
                  document.documentElement.classList.add('dark');
                  localStorage.setItem('theme', 'dark');
                }
              }}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-coffee-dark dark:text-gray-200 border border-coffee-green/30 dark:border-slate-600 shadow-sm hover:scale-105 active:scale-95 transition-all duration-300"
              title="Giao diện Sáng/Tối"
            >
              <i className="fa-solid fa-moon text-indigo-500 dark:hidden"></i>
              <i className="fa-solid fa-sun text-yellow-400 hidden dark:block"></i>
            </button>
          </div>

          {notification && (() => {
            const duration = parseInt(localStorage.getItem('notify_duration')) || 3500;
            return (
              <div className="fixed top-8 right-8 z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl rounded-2xl p-4 pr-10 flex items-start gap-4 w-[90%] md:w-[400px] animate-slide-in-right overflow-hidden group ring-1 ring-black/5 dark:ring-white/10 transition-all">
                
                <button 
                  onClick={() => setNotification('')}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors shadow-sm"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>

                <div className="relative mt-0.5 shrink-0">
                  <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-coffee-green to-emerald-600 flex items-center justify-center shadow-inner">
                    <i className="fa-solid fa-bell text-white text-xl animate-bounce"></i>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-ping"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <h4 className="text-coffee-dark dark:text-white font-black text-[15px] uppercase tracking-wide mb-1 flex items-center gap-2">
                    Thông báo hệ thống
                    <i className="fa-solid fa-circle-check text-coffee-green dark:text-emerald-400 text-xs"></i>
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed font-medium break-words">
                    {notification}
                  </p>
                </div>

                <div className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-coffee-green via-emerald-400 to-teal-300"
                     style={{ 
                       animation: `shrinkWidth ${duration}ms linear forwards`,
                       width: '100%' 
                     }}>
                </div>
              </div>
            )
          })()}

          <div className="flex-1 overflow-hidden relative mt-14 md:mt-0">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'orders' && <OrdersView showNotify={showNotify} />}
            {activeTab === 'tables' && <TablesView showNotify={showNotify} />}
            {activeTab === 'products' && <ProductsView showNotify={showNotify} />}
            {activeTab === 'inventory' && <InventoryView showNotify={showNotify} />}
            {activeTab === 'recipes' && <RecipeView showNotify={showNotify} />}
            {activeTab === 'vouchers' && <VoucherView showNotify={showNotify} />}
            {activeTab === 'staff' && <StaffView showNotify={showNotify} />}
            {activeTab === 'users' && <UsersView showNotify={showNotify} />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'settings' && (
              <SettingsView
                globalScale={globalScale}
                setGlobalScale={setGlobalScale}
                showNotify={showNotify}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default AdminLayout
