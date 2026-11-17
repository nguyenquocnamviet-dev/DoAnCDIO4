import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { getMembershipRank } from '../utils/membershipUtils'
import emailjs from '@emailjs/browser'

const AuthModal = ({ onClose, onLogin, isAdminMode = false, initialMode = 'login' }) => {
  const [authMode, setAuthMode] = useState(initialMode === 'login' ? 'login' : 'register')
  const [showPassword, setShowPassword] = useState(false)

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('')
  const [resetUsername, setResetUsername] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [resetUserId, setResetUserId] = useState(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Clear inputs when switching modes
  useEffect(() => {
    setError('')
    setSuccessMsg('')
  }, [authMode])

  const clearForm = () => {
    setUsername('')
    setPassword('')
    setFullName('')
    setPhone('')
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')

    const DUMMY_USER = {
      NguoiDungID: Math.floor(Math.random() * 1000) + 10,
      TenDangNhap: username,
      HoTen: fullName || 'Người dùng mới',
      VaiTroID: 6,
      VaiTro: 'Customer',
      HangThanhVienID: 1,
      TenHang: 'Thường',
      TongDiem: 0,
      GiamGia: 0,
      SoDienThoai: phone || '0987654321',
      DiaChi: '',
    }

    const DUMMY_ADMIN = {
      NguoiDungID: 2,
      TenDangNhap: 'admin',
      HoTen: 'Quản Trị Viên',
      VaiTroID: 1,
      VaiTro: 'Admin',
      HangThanhVienID: 1,
      TenHang: 'Thường',
      TongDiem: 0,
      GiamGia: 0,
      SoDienThoai: '0909090909',
      DiaChi: 'Hệ thống Coffee Journey',
    }

    try {
      const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

      if (isConfigured) {
        if (authMode === 'login') {
          // LOGIN LOGIC
          const { data, error: dbError } = await supabase
            .from('nguoidung')
            .select(`
              *,
              vaitro:vaitro ( TenVaiTro ),
              hangthanhvien:hangthanhvien ( TenHang, PhanTramGiam )
            `)
            .eq('TenDangNhap', username)
            .eq('MatKhau', password)
            .eq('DaXoa', false)
            .maybeSingle()

          if (dbError) throw dbError

          if (data) {
            if (data.TrangThai === 'BiKhoa') {
              throw new Error('Tài khoản của bạn đã bị khóa, vui lòng liên hệ hỗ trợ!')
            }

            const rankInfo = getMembershipRank(data.TongDiem || 0)
            const userObj = {
              NguoiDungID: data.NguoiDungID,
              TenDangNhap: data.TenDangNhap,
              HoTen: data.HoTen,
              VaiTroID: data.VaiTroID,
              VaiTro: data.vaitro?.TenVaiTro || 'Customer',
              HangThanhVienID: rankInfo.id,
              TenHang: rankInfo.name,
              TongDiem: data.TongDiem || 0,
              GiamGia: rankInfo.discount,
              SoDienThoai: data.SoDienThoai,
              DiaChi: data.DiaChi,
            }

            if (isAdminMode && ![1, 2, 3, 4, 5].includes(userObj.VaiTroID)) {
              setError('Tài khoản này không có quyền truy cập hệ thống nội bộ!')
              setLoading(false)
              return
            }



            clearForm()
            onLogin(userObj)
            setLoading(false)
            return
          } else {
            throw new Error('Sai tên đăng nhập hoặc mật khẩu!')
          }
        } else if (authMode === 'register') {
          // REGISTER LOGIC
          const { data: existingUser } = await supabase
            .from('nguoidung')
            .select('TenDangNhap')
            .eq('TenDangNhap', username)
            .maybeSingle()

          if (existingUser) {
            throw new Error('Tên đăng nhập đã tồn tại, vui lòng chọn tên khác!')
          }

          const { data: newUser, error: insertError } = await supabase
            .from('nguoidung')
            .insert({
              TenDangNhap: username,
              MatKhau: password,
              HoTen: fullName,
              SoDienThoai: phone,
              VaiTroID: 6, // Customer
              HangThanhVienID: 1 // Thường
            })
            .select(`
              *,
              vaitro:vaitro ( TenVaiTro ),
              hangthanhvien:hangthanhvien ( TenHang, PhanTramGiam )
            `)
            .single()

          if (insertError) throw insertError

          if (newUser) {
            const userObj = {
              NguoiDungID: newUser.NguoiDungID,
              TenDangNhap: newUser.TenDangNhap,
              HoTen: newUser.HoTen,
              VaiTroID: newUser.VaiTroID,
              VaiTro: newUser.vaitro?.TenVaiTro || 'Customer',
              HangThanhVienID: 1,
              TenHang: 'Thường',
              TongDiem: 0,
              GiamGia: 0,
              SoDienThoai: newUser.SoDienThoai,
              DiaChi: newUser.DiaChi,
            }
            clearForm()
            onLogin(userObj)
            setLoading(false)
            return
          }
        } else if (authMode === 'forgot_email') {
          const { data: userReset, error: resetErr } = await supabase
            .from('nguoidung')
            .select('NguoiDungID, Email, HoTen')
            .eq('TenDangNhap', resetUsername)
            .eq('Email', resetEmail)
            .eq('DaXoa', false)
            .maybeSingle()
            
          if (resetErr) throw resetErr
          if (!userReset) throw new Error('Tên đăng nhập hoặc Email không chính xác!')
          
          setResetUserId(userReset.NguoiDungID)
          const otp = Math.floor(100000 + Math.random() * 900000).toString()
          setGeneratedOtp(otp)
          
          try {
            await emailjs.send(
              'service_hvg7ggd',
              'template_kmpsw0j',
              {
                to_email: resetEmail,
                to_name: userReset.HoTen || resetUsername,
                otp: otp
              },
              'XXLjdbTZci0HiRQ0K'
            )
          } catch (emailErr) {
            console.error('Lỗi khi gửi email:', emailErr)
            throw new Error('Hệ thống gửi email đang bận, vui lòng thử lại sau!')
          }
          
          setAuthMode('forgot_otp')
          setLoading(false)
          return
        } else if (authMode === 'forgot_otp') {
          if (otpInput !== generatedOtp) {
            throw new Error('Mã OTP không chính xác!')
          }
          setAuthMode('forgot_new_pass')
          setLoading(false)
          return
        } else if (authMode === 'forgot_new_pass') {
          if (newPassword !== confirmNewPassword) {
            throw new Error('Mật khẩu xác nhận không khớp!')
          }
          if (newPassword.length < 6) {
            throw new Error('Mật khẩu phải có ít nhất 6 ký tự!')
          }
          
          const { error: updateErr } = await supabase
            .from('nguoidung')
            .update({ MatKhau: newPassword })
            .eq('NguoiDungID', resetUserId)
            
          if (updateErr) throw updateErr
          
          setSuccessMsg('Khôi phục mật khẩu thành công! Vui lòng đăng nhập lại.')
          setAuthMode('login')
          clearForm()
          setLoading(false)
          return
        }
      }
    } catch (err) {
      console.error('Lỗi khi truy vấn Supabase:', err.message)
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại!')
    }

    // Fallback logic if Supabase fails or not configured
    if (!import.meta.env.VITE_SUPABASE_URL) {
      if (isAdminMode) {
        if (username === 'admin' && password === 'admin123') {
          clearForm()
          onLogin(DUMMY_ADMIN)
        } else {
          setError('Sai tài khoản quản trị! (Thử: admin / admin123)')
        }
      } else {
        if (authMode === 'login') {
          if (username === 'khachhang' && password === '123') {
            clearForm()
            const mockRank = getMembershipRank(350)
            onLogin({ ...DUMMY_USER, TenDangNhap: 'khachhang', HoTen: 'Nguyễn Văn Khách', TongDiem: 350, TenHang: mockRank.name, HangThanhVienID: mockRank.id, GiamGia: mockRank.discount })
          } else if (username === 'admin' && password === 'admin123') {
            clearForm()
            onLogin(DUMMY_ADMIN)
          } else {
            setError('Sai tên đăng nhập hoặc mật khẩu! (Thử: khachhang / 123)')
          }
        } else if (authMode === 'register') {
          clearForm()
          onLogin(DUMMY_USER)
        } else {
          setError('Tính năng quên mật khẩu yêu cầu kết nối Supabase Backend thật để hoạt động!')
        }
      }
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (err) {
      setError('Tính năng đăng nhập Google hiện chưa được cấu hình hoàn chỉnh.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-coffee-dark/60 backdrop-blur-sm flex items-center justify-center z-[70] p-3 sm:p-4 transition-opacity duration-300">
      <div className="glass-effect p-5 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] relative max-w-md w-full shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto no-scrollbar animate-zoom-in">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-red-500 hover:text-white flex items-center justify-center text-size-1 text-gray-500 transition-all duration-300 shadow-sm"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}

        {/* Header Icon */}
        <div className="w-20 h-20 bg-gradient-to-tr from-coffee-green to-emerald-400 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-coffee-green/30 rotate-3 hover:rotate-0 transition-all duration-300">
          <i className={`fa-solid ${isAdminMode ? 'fa-user-shield' : 'fa-seedling'} text-[2.5rem] -rotate-3 hover:rotate-0 transition-all duration-300`}></i>
        </div>

        {/* Title */}
        <h2 className="text-size-2 font-black text-coffee-green mb-1 text-center uppercase tracking-tighter">
          {isAdminMode ? 'Hệ Thống Admin' : (
            authMode === 'login' ? 'Đăng Nhập' : 
            authMode === 'register' ? 'Đăng Ký' : 
            'Khôi Phục Mật Khẩu'
          )}
        </h2>
        <p className="text-[0.8rem] font-bold text-gray-500 text-center uppercase tracking-widest mb-6">
          {isAdminMode ? 'Dành Cho Quản Trị' : (
            authMode.startsWith('forgot') ? 'Lấy lại quyền truy cập' : 'Chào Mừng Đến Với Heritage'
          )}
        </p>

        {/* Toggle Login/Register for non-admin */}
        {!isAdminMode && !authMode.startsWith('forgot') && (
          <div className="flex bg-gray-100/50 p-1 rounded-2xl mb-6 shadow-inner border border-white/40">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 text-[0.85rem] ${authMode === 'login' ? 'bg-white text-coffee-green shadow-sm shadow-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Đăng Nhập
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 text-[0.85rem] ${authMode === 'register' ? 'bg-white text-coffee-green shadow-sm shadow-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Đăng Ký
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50/90 backdrop-blur-md rounded-2xl border border-red-200 flex items-center gap-3 animate-shake">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <p className="text-red-600 text-[0.85rem] font-bold">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3 bg-emerald-50/90 backdrop-blur-md rounded-2xl border border-emerald-200 flex items-center gap-3 animate-fade-in-up">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 shrink-0">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <p className="text-emerald-600 text-[0.85rem] font-bold">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">

          {/* FORGOT PASSWORD FLOW */}
          {authMode === 'forgot_email' && (
            <div className="space-y-4 animate-fade-in-up">
              <div>
                <label className="block text-[0.75rem] font-black mb-1 ml-2 text-gray-400 uppercase tracking-widest">Tên đăng nhập</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-coffee-green transition-colors">
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <input
                    type="text"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 transition-all shadow-sm"
                    required
                    placeholder="Nhập tên đăng nhập của bạn..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.75rem] font-black mb-1 ml-2 text-gray-400 uppercase tracking-widest">Email đăng ký</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-coffee-green transition-colors">
                    <i className="fa-solid fa-envelope"></i>
                  </div>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 transition-all shadow-sm"
                    required
                    placeholder="Nhập Email để nhận mã OTP..."
                  />
                </div>
              </div>
            </div>
          )}

          {authMode === 'forgot_otp' && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-[0.8rem] font-bold text-center border border-emerald-100">
                Mã OTP đã được gửi đến: <br/><span className="text-coffee-dark text-[0.9rem]">{resetEmail}</span>
              </div>
              <div>
                <label className="block text-[0.75rem] font-black mb-1 ml-2 text-gray-400 uppercase tracking-widest">Nhập mã OTP (6 số)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-coffee-green transition-colors">
                    <i className="fa-solid fa-key"></i>
                  </div>
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-black tracking-[0.5em] text-center outline-none focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 transition-all shadow-sm"
                    required
                    maxLength={6}
                    placeholder="------"
                  />
                </div>
              </div>
            </div>
          )}

          {authMode === 'forgot_new_pass' && (
            <div className="space-y-4 animate-fade-in-up">
              <div>
                <label className="block text-[0.75rem] font-black mb-1 ml-2 text-gray-400 uppercase tracking-widest">Mật khẩu mới</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-coffee-green transition-colors">
                    <i className="fa-solid fa-lock"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full py-3.5 pl-11 pr-12 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 transition-all shadow-sm"
                    required
                    placeholder="Nhập mật khẩu mới..."
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-coffee-green">
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[0.75rem] font-black mb-1 ml-2 text-gray-400 uppercase tracking-widest">Xác nhận mật khẩu</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-coffee-green transition-colors">
                    <i className="fa-solid fa-check-double"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full py-3.5 pl-11 pr-12 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 transition-all shadow-sm"
                    required
                    placeholder="Nhập lại mật khẩu..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* NORMAL LOGIN / REGISTER FLOW */}
          {(authMode === 'login' || authMode === 'register') && (
            <>
              {/* Register Extra Fields */}
              {authMode === 'register' && (
                <div className="space-y-4 animate-fade-in-up">
                  <div>
                    <label className="block text-[0.75rem] font-black mb-1 ml-2 text-gray-400 uppercase tracking-widest">Họ và tên</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-coffee-green transition-colors">
                        <i className="fa-solid fa-id-card"></i>
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 transition-all shadow-sm"
                        required
                        placeholder="Nhập họ và tên..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-black mb-1 ml-2 text-gray-400 uppercase tracking-widest">Số điện thoại</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-coffee-green transition-colors">
                        <i className="fa-solid fa-phone"></i>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 transition-all shadow-sm"
                        required
                        placeholder="Nhập số điện thoại..."
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[0.75rem] font-black mb-1 ml-2 text-gray-400 uppercase tracking-widest">Tên đăng nhập</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-coffee-green transition-colors">
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 transition-all shadow-sm"
                    required
                    placeholder={isAdminMode ? 'Nhập tên quản trị...' : 'Nhập tên đăng nhập...'}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.75rem] font-black mb-1 ml-2 text-gray-400 uppercase tracking-widest">Mật khẩu</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-coffee-green transition-colors">
                    <i className="fa-solid fa-lock"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-3.5 pl-11 pr-12 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 transition-all shadow-sm tracking-widest"
                    required
                    placeholder="Nhập mật khẩu..."
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-coffee-green transition-colors focus:outline-none"
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              
              {authMode === 'login' && !isAdminMode && (
                <div className="flex justify-end mt-2">
                  <button 
                    type="button"
                    onClick={() => setAuthMode('forgot_email')}
                    className="text-[0.75rem] font-bold text-gray-500 hover:text-coffee-green transition-colors uppercase tracking-widest"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-coffee-green to-emerald-500 hover:from-emerald-600 hover:to-coffee-green text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-coffee-green/30 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 mt-6"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner animate-spin"></i> Đang Xử Lý...
              </span>
            ) : (
              isAdminMode ? 'Đăng Nhập Quản Trị' : (
                authMode === 'login' ? 'Vào Quán' : 
                authMode === 'register' ? 'Tạo Tài Khoản' : 
                authMode === 'forgot_email' ? 'Nhận Mã OTP' : 
                authMode === 'forgot_otp' ? 'Xác Nhận OTP' : 'Lưu Mật Khẩu'
              )
            )}
          </button>
          
          {authMode.startsWith('forgot') && (
            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-[0.75rem] font-bold text-gray-500 hover:text-coffee-dark uppercase tracking-widest border-b border-dashed border-gray-400"
              >
                <i className="fa-solid fa-arrow-left mr-1"></i> Quay lại Đăng nhập
              </button>
            </div>
          )}
        </form>

        {!isAdminMode && !authMode.startsWith('forgot') && (
          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-gray-300 w-full"></div>
              <span className="bg-white/50 px-3 text-[0.75rem] font-bold text-gray-400 uppercase tracking-widest absolute">Hoặc</span>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Tiếp tục với Google
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default AuthModal
