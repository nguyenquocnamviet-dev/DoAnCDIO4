import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { getMembershipRank, calculateOrderPoints } from './utils/membershipUtils'

// Layout & Modals
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AuthModal from './components/AuthModal'
import ProductModal from './components/ProductModal'
import ReviewModal from './components/ReviewModal'
import CartPanel from './components/CartPanel'

// Client Views
import HomeView from './views/HomeView'
import FeaturesView from './views/FeaturesView'
import MenuView from './views/MenuView'
import BookingView from './views/BookingView'
import HistoryView from './views/HistoryView'
import ProfileView from './views/ProfileView'

// Admin & Staff Layout
import AdminLayout from './admin/AdminLayout'
import StaffLayout from './staff/StaffLayout'

function App() {
  const location = useLocation()
  const navigate = useNavigate()

  // Extract table ID if accessed via QR Code
  const queryParams = new URLSearchParams(location.search)
  const tableParam = queryParams.get('table')

  // App States
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('coffee_user')
    return saved ? JSON.parse(saved) : null
  })
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Review Modal triggers
  const [activeReview, setActiveReview] = useState(null) // { order, item }
  const [reviews, setReviews] = useState({}) // Key: orderCode-productId, value: {rating, comment}

  // Global Notification Banner
  const [notification, setNotification] = useState('')

  const showNotify = async (msg) => {
    setNotification(msg)
    try {
      if (localStorage.getItem('customer_sound_enabled') !== 'false') {
        const { playNotificationSound } = await import('./utils/audioUtils');
        const soundType = localStorage.getItem('notify_sound_type') || 'ting';
        playNotificationSound(soundType);
      }
    } catch (e) { console.error(e) }
    const duration = parseInt(localStorage.getItem('notify_duration')) || 3500;
    setTimeout(() => setNotification(''), duration)
  }

  const handleLogin = (loggedUser) => {
    setUser(loggedUser)
    sessionStorage.setItem('coffee_user', JSON.stringify(loggedUser))
    setAuthModalOpen(false)
    showNotify(`Chào mừng quay trở lại, ${loggedUser.HoTen}!`)

    // Redirect if it's an admin/staff logging in
    if ([1, 2].includes(loggedUser.VaiTroID)) {
      navigate('/admin')
    } else if ([3, 4, 5].includes(loggedUser.VaiTroID)) {
      navigate('/staff')
    }
  }

  // Protect specific routes from guests
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  // Route protection and access control
  useEffect(() => {
    if (user) {
      // Prevent Admin/Staff from accessing customer interface
      const isCustomerRoute = !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/staff')
      if (isCustomerRoute) {
        if ([1, 2].includes(user.VaiTroID)) {
          navigate('/admin', { replace: true })
        } else if ([3, 4, 5].includes(user.VaiTroID)) {
          navigate('/staff', { replace: true })
        }
      }
    } else {
      const isProtectedRoute = ['/history', '/profile'].includes(location.pathname)
      if (isProtectedRoute) {
        navigate('/')
        setAuthModalMode('login')
        setAuthModalOpen(true)
        showNotify('Vui lòng đăng nhập để sử dụng tính năng này!')
      }
    }
  }, [user, location.pathname, navigate])



  // Realtime order status notifications for customers
  useEffect(() => {
    if (!user || !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return

    const channelOrder = supabase
      .channel(`customer_order_notify_${user.NguoiDungID}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'donhang',
          filter: `KhachHangID=eq.${user.NguoiDungID}`
        },
        (payload) => {
          const newRow = payload.new
          const oldRow = payload.old
          if (newRow && oldRow && newRow.TrangThai !== oldRow.TrangThai) {
            if (newRow.TrangThai === 'DangGiao') {
              showNotify(`🚚 Đơn hàng #${newRow.MaDonHang || newRow.DonHangID} đang được giao đến bạn!`)
            } else if (newRow.TrangThai === 'HoanThanh') {
              showNotify(`✅ Đơn hàng #${newRow.MaDonHang || newRow.DonHangID} đã giao thành công và nhận hàng!`)
            } else if (newRow.TrangThai === 'DangPhaChe') {
              showNotify(`☕ Đơn hàng #${newRow.MaDonHang || newRow.DonHangID} đang được pha chế!`)
            } else if (newRow.TrangThai === 'DaHuy') {
              showNotify(`❌ Đơn hàng #${newRow.MaDonHang || newRow.DonHangID} đã bị hủy.`)
            }
          }
        }
      )
      .subscribe()

    const channelBooking = supabase
      .channel(`customer_booking_notify_${user.NguoiDungID}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'datban',
          filter: `KhachHangID=eq.${user.NguoiDungID}`
        },
        (payload) => {
          const newRow = payload.new
          const oldRow = payload.old
          if (newRow && oldRow && newRow.TrangThai !== oldRow.TrangThai) {
            if (newRow.TrangThai === 'DaXacNhan') {
              showNotify(`🎉 Yêu cầu đặt bàn của bạn đã được nhà hàng xác nhận thành công!`)
            } else if (newRow.TrangThai === 'DaHuy') {
              showNotify(`❌ Yêu cầu đặt bàn của bạn đã bị từ chối/hủy. Vui lòng liên hệ quán để biết chi tiết.`)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelOrder)
      supabase.removeChannel(channelBooking)
    }
  }, [user])

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('coffee_user')
    showNotify('Đã đăng xuất tài khoản!')
    navigate('/')
  }

  const addToCart = (item) => {
    setCart((prev) => {
      // Find matching item (same ID, size, and toppings)
      const matches = prev.findIndex(
        (c) =>
          c.SanPhamID === item.SanPhamID &&
          c.selectedSize?.id === item.selectedSize?.id &&
          JSON.stringify(c.selectedToppings) === JSON.stringify(item.selectedToppings)
      )

      if (matches > -1) {
        const copy = [...prev]
        copy[matches].quantity += item.quantity
        return copy
      }
      return [...prev, item]
    })
    showNotify(`Đã thêm ${item.TenSanPham} vào giỏ hàng!`)
  }

  const removeFromCart = (cartId) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId))
  }

  const handleCheckout = (totalAmount, orderType, deliveryInfo) => {
    setCart([])
    setCartOpen(false)

    let completionMessage = `Đặt đơn ${deliveryInfo.code} thành công! Giá trị: ${totalAmount.toLocaleString()}đ.`

    if (orderType === 'Giao Hàng') {
      completionMessage += ` Đồ uống sẽ được giao tới SĐT: ${deliveryInfo.phone}.`
    } else {
      completionMessage += ' Vui lòng chờ nhận món tại quầy bar.'
    }

    showNotify(completionMessage)
    navigate('/history')
  }

  const handleReviewSubmit = (orderId, productId, ratingData) => {
    setReviews((prev) => ({
      ...prev,
      [`${orderId}-${productId}`]: ratingData
    }))
    setActiveReview(null)
    showNotify('Cảm ơn bạn đã gửi đánh giá cho đồ uống!')
  }

  const isAdminRoute = location.pathname.startsWith('/admin')
  const isStaffRoute = location.pathname.startsWith('/staff')

  // Render Admin panel cleanly separated from customer interfaces
  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminLayout user={user} onLogin={handleLogin} onLogout={handleLogout} />} />
      </Routes>
    )
  }

  // Render Staff panel cleanly separated
  if (isStaffRoute) {
    return (
      <Routes>
        <Route path="/staff/*" element={<StaffLayout user={user} onLogin={handleLogin} onLogout={handleLogout} />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative w-full overflow-x-hidden">
      {/* Grid Caro Background */}
      <div className="bg-grid-pattern fixed inset-0 -z-20"></div>

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

      {/* Main Navbar */}
      <Navbar
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        setCartOpen={setCartOpen}
        user={user}
        setAuthModalOpen={setAuthModalOpen}
        setAuthModalMode={setAuthModalMode}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

      {/* Main Routes */}
      <div className="flex-1 w-full flex flex-col justify-start pt-20">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/features" element={<FeaturesView />} />
          <Route path="/menu" element={<MenuView onProductSelect={setSelectedProduct} />} />
          <Route
            path="/booking"
            element={
              <BookingView
                user={user}
                showNotify={showNotify}
                onRequireLogin={() => setAuthModalOpen(true)}
              />
            }
          />
          <Route
            path="/history"
            element={
              <HistoryView
                user={user}
                reviews={reviews}
                onOpenReview={(order, item) => setActiveReview({ order, item })}
                showNotify={showNotify}
                onUpdateUser={(updated) => {
                  setUser(updated)
                  sessionStorage.setItem('coffee_user', JSON.stringify(updated))
                }}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <ProfileView
                user={user}
                onLogout={handleLogout}
                onUpdateUser={(updated) => {
                  setUser(updated)
                  sessionStorage.setItem('coffee_user', JSON.stringify(updated))
                  showNotify('Đã cập nhật thông tin cá nhân thành công!')
                }}
                showNotify={showNotify}
              />
            }
          />
        </Routes>
      </div>

      {/* Bottom Footer */}
      <Footer />

      {/* Modals & Sidebar Panels */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onLogin={handleLogin}
          initialMode={authModalMode}
        />
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}

      {activeReview && (
        <ReviewModal
          order={activeReview.order}
          item={activeReview.item}
          user={user}
          onClose={() => setActiveReview(null)}
          onSubmit={handleReviewSubmit}
        />
      )}

      <CartPanel
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        removeFromCart={removeFromCart}
        checkout={handleCheckout}
        user={user}
        tableParam={tableParam}
      />
    </div>
  )
}

export default App
