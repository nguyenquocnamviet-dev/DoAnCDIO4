import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ProductModal from '../components/ProductModal'

const POSView = ({ showNotify, user }) => {
  const [activeCat, setActiveCat] = useState('all')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([{ id: 'all', name: 'Tất Cả' }])
  const [loading, setLoading] = useState(false)

  const [cart, setCart] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('TienMat') // 'TienMat' | 'ChuyenKhoan'

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)

  useEffect(() => {
    const fetchMenuData = async () => {
      const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!isConfigured) return

      setLoading(true)
      try {
        const { data: catData, error: catErr } = await supabase
          .from('danhmuc')
          .select('DanhMucID, TenDanhMuc')
          .eq('DaXoa', false)

        if (catErr) throw catErr
        if (catData && catData.length > 0) {
          setCategories([{ id: 'all', name: 'Tất Cả' }, ...catData.map(c => ({ id: c.DanhMucID, name: c.TenDanhMuc }))])
        }

        const { data: prodData, error: prodErr } = await supabase
          .from('sanpham')
          .select(`
            SanPhamID,
            DanhMucID,
            TenSanPham,
            HinhAnh,
            sanphamsize ( Gia )
          `)
          .eq('DaXoa', false)
          .eq('ConBan', true)

        if (prodErr) throw prodErr
        if (prodData && prodData.length > 0) {
          const mapped = prodData.map(p => {
            const prices = p.sanphamsize?.map(s => parseFloat(s.Gia)) || []
            const basePrice = prices.length > 0 ? Math.min(...prices) : 25000
            return {
              SanPhamID: p.SanPhamID,
              DanhMucID: p.DanhMucID,
              TenSanPham: p.TenSanPham,
              Gia: basePrice,
              icon: p.HinhAnh || 'fa-mug-hot'
            }
          })
          setProducts(mapped)
        }
      } catch (err) {
        console.error('Lỗi khi tải Menu:', err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMenuData()
  }, [])

  const addToCart = (item) => {
    setCart((prev) => {
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
    showNotify(`Đã thêm ${item.TenSanPham}`)
  }

  const removeFromCart = (cartId) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId))
  }

  const subTotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0)

  const handleConfirmCheckout = async () => {
    if (cart.length === 0) return

    setIsProcessing(true)
    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    const orderCode = 'POS' + Date.now().toString().slice(-6)

    try {
      if (isConfigured) {
        // Create Order
        const { data: orderData, error: orderError } = await supabase
          .from('donhang')
          .insert({
            MaDonHang: orderCode,
            KhachHangID: null, // Khách vãng lai mua tại quầy
            TongTien: subTotal,
            GiamGia: 0,
            ThanhTien: subTotal,
            PhuongThucThanhToan: paymentMethod,
            TrangThai: 'ChoXacNhan', // Gửi xuống Bếp/Pha chế
            LoaiDonHangID: 1, // Tại quán
            GhiChu: `Bán tại quầy (Nhân viên: ${user?.HoTen || 'POS'})`
          })
          .select()
          .single()

        if (orderError) throw orderError
        const dbOrderId = orderData.DonHangID

        // Insert Items
        for (const item of cart) {
          let sizeId = 1
          if (item.DanhMucID === 1) { // Coffee sizes
            if (item.selectedSize?.id === 'M') sizeId = 2
            if (item.selectedSize?.id === 'L') sizeId = 3
            if (item.SanPhamID === 2) {
              sizeId = item.selectedSize?.id === 'M' ? 5 : item.selectedSize?.id === 'L' ? 6 : 4
            } else if (item.SanPhamID === 5) {
              sizeId = item.selectedSize?.id === 'M' ? 12 : item.selectedSize?.id === 'L' ? 13 : 11
            }
          } else if (item.DanhMucID === 2) { // Tea sizes
            if (item.SanPhamID === 3) sizeId = item.selectedSize?.id === 'M' ? 8 : item.selectedSize?.id === 'L' ? 9 : 7
            if (item.SanPhamID === 6) sizeId = item.selectedSize?.id === 'M' ? 15 : item.selectedSize?.id === 'L' ? 16 : 14
          } else if (item.DanhMucID === 3) { // Cake sizes
            if (item.SanPhamID === 4) sizeId = 10
            if (item.SanPhamID === 7) sizeId = 17
          }

          const { data: detailData, error: detailError } = await supabase
            .from('chitietdonhang')
            .insert({
              DonHangID: dbOrderId,
              SanPhamSizeID: sizeId,
              SoLuong: item.quantity,
              DonGia: item.Gia,
              ThanhTien: item.finalPrice * item.quantity,
              GhiChu: item.selectedToppings?.map(t => t.name).join(', ') || ''
            })
            .select()
            .single()

          if (detailError) throw detailError

          if (item.selectedToppings?.length > 0 && detailData) {
            const detailId = detailData.ChiTietDonHangID
            for (const t of item.selectedToppings) {
              await supabase.from('chitiettopping').insert({
                ChiTietDonHangID: detailId,
                ToppingID: t.id
              })
            }
          }
        }

        showNotify(`Thanh toán thành công đơn ${orderCode}! (Thu: ${subTotal.toLocaleString()}đ)`)
        setCompletedOrder({
          orderCode,
          items: [...cart],
          total: subTotal,
          paymentMethod,
          date: new Date().toLocaleString('vi-VN'),
          staff: user?.HoTen || 'POS'
        })
        setCart([])
        setShowPaymentModal(false)
        setShowReceiptModal(true)
      }
    } catch (err) {
      console.error('Lỗi thanh toán POS:', err.message)
      showNotify('Có lỗi xảy ra khi thanh toán!')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex h-full animate-fade-in">

      {/* Cột trái: Menu */}
      <div className="flex-[7] flex flex-col h-full border-r border-white/50 bg-white/40 overflow-hidden">
        {/* Header & Categories */}
        <div className="p-4 bg-white/60 shadow-sm border-b border-white z-10 shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`px-5 py-2 rounded-xl text-[0.9rem] font-bold uppercase whitespace-nowrap transition-all duration-300 ${activeCat === c.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <i className="fa-solid fa-spinner animate-spin text-size-2 text-indigo-500"></i>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products
                .filter((p) => activeCat === 'all' || p.DanhMucID === activeCat)
                .map((product) => (
                  <div
                    key={product.SanPhamID}
                    className="glass-effect p-4 rounded-2xl flex flex-col items-center text-center gap-3 cursor-pointer hover:shadow-lg transition-all duration-300 border border-white hover:border-indigo-200"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-size-1 text-indigo-500 shadow-inner overflow-hidden">
                      {(product.icon && (product.icon.startsWith('http') || product.icon.startsWith('/') || product.icon.startsWith('data:'))) ? (
                        <img src={product.icon} alt={product.TenSanPham} className="w-full h-full object-cover" />
                      ) : (
                        <i className={`fa-solid ${product.icon || 'fa-mug-hot'}`}></i>
                      )}
                    </div>
                    <div className="flex-1 w-full">
                      <h3 className="text-[0.95rem] font-black text-coffee-dark uppercase line-clamp-2 leading-tight mb-1">
                        {product.TenSanPham}
                      </h3>
                      <div className="text-[0.9rem] font-bold text-indigo-600">
                        {product.Gia.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Cột phải: Cart & Thanh Toán */}
      <div className="flex-[3] flex flex-col h-full bg-white/80 shrink-0">
        <div className="p-4 bg-indigo-600 text-white shadow-md shrink-0 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-wider text-size-1"><i className="fa-solid fa-receipt mr-2"></i> Hóa Đơn</h3>
          <button onClick={() => setCart([])} className="text-[0.8rem] text-indigo-200 hover:text-white uppercase font-bold px-2">
            Làm trống
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <i className="fa-solid fa-basket-shopping text-size-2 mb-3"></i>
              <p className="font-bold">Chưa có món nào</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartId} className="flex flex-col bg-gray-50 p-3 rounded-xl border border-gray-100 relative">
                <div className="flex justify-between items-start mb-1 pr-6">
                  <span className="font-bold text-coffee-dark text-[0.95rem] line-clamp-1">{item.TenSanPham}</span>
                  <span className="font-black text-indigo-600 text-[0.95rem]">{(item.finalPrice * item.quantity).toLocaleString()}</span>
                </div>
                <div className="text-[0.8rem] text-gray-500 font-medium">
                  Size: {item.selectedSize?.id} | SL: {item.quantity}
                  {item.selectedToppings?.length > 0 && <br />}
                  {item.selectedToppings?.map(t => t.name).join(', ')}
                </div>
                <button
                  onClick={() => removeFromCart(item.cartId)}
                  className="absolute top-2 right-2 w-6 h-6 text-gray-400 hover:text-red-500"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-100 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-end mb-4">
            <span className="text-size-1 font-black text-gray-400 uppercase tracking-widest">Tổng Tiền</span>
            <span className="text-indigo-600 text-[1.8rem] font-black leading-none">{subTotal.toLocaleString()}đ</span>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0 || isProcessing}
            className={`w-full py-4 text-size-1 rounded-2xl font-black uppercase tracking-wider transition-all shadow-md ${cart.length === 0 || isProcessing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30'
              }`}
          >
            Thanh Toán
          </button>
        </div>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-coffee-dark/60 backdrop-blur-sm"
            onClick={() => !isProcessing && setShowPaymentModal(false)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-zoom-in border border-white/20">

            {/* Cột trái: Chọn phương thức */}
            <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
              <h3 className="text-size-1 font-black text-coffee-dark dark:text-white uppercase tracking-wider mb-6">
                Xác Nhận Thanh Toán
              </h3>

              <div className="space-y-4 mb-8">
                <label
                  className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${paymentMethod === 'TienMat'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:border-indigo-200'
                    }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="TienMat"
                    checked={paymentMethod === 'TienMat'}
                    onChange={() => setPaymentMethod('TienMat')}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mr-4 shrink-0">
                    <i className="fa-solid fa-money-bill-wave"></i>
                  </div>
                  <div>
                    <div className="font-black text-[1.1rem]">Tiền Mặt</div>
                    <div className="text-sm font-medium opacity-80 mt-0.5">Thu tiền mặt trực tiếp tại quầy</div>
                  </div>
                </label>

                <label
                  className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${paymentMethod === 'ChuyenKhoan'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:border-indigo-200'
                    }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="ChuyenKhoan"
                    checked={paymentMethod === 'ChuyenKhoan'}
                    onChange={() => setPaymentMethod('ChuyenKhoan')}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl mr-4 shrink-0">
                    <i className="fa-solid fa-qrcode"></i>
                  </div>
                  <div>
                    <div className="font-black text-[1.1rem]">Chuyển Khoản (QR)</div>
                    <div className="text-sm font-medium opacity-80 mt-0.5">Tạo mã QR cho khách quét</div>
                  </div>
                </label>
              </div>

              <div className="mt-auto bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 mb-1">
                  <span className="font-bold text-sm uppercase">Số lượng:</span>
                  <span className="font-bold">{cart.reduce((s, i) => s + i.quantity, 0)} món</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="font-black text-coffee-dark dark:text-gray-300 uppercase tracking-widest text-sm">Cần thu:</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-2xl leading-none">{subTotal.toLocaleString()}đ</span>
                </div>
              </div>
            </div>

            {/* Cột phải: View QR hoặc Xác nhận */}
            <div className="flex-[0.8] p-6 md:p-8 flex flex-col items-center justify-center bg-white dark:bg-slate-900 relative">
              <button
                onClick={() => !isProcessing && setShowPaymentModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

              {paymentMethod === 'ChuyenKhoan' ? (
                <div className="w-full flex flex-col items-center animate-fade-in">
                  <h4 className="font-bold text-coffee-dark dark:text-white uppercase mb-4 tracking-widest text-sm text-center">
                    Quét QR Để Thanh Toán
                  </h4>
                  <div className="w-full max-w-[240px] aspect-square bg-gray-50 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900 overflow-hidden shadow-inner flex items-center justify-center relative group">
                    <img
                      src={`https://img.vietqr.io/image/BIDV-6261335973-compact2.jpg?amount=${subTotal}&addInfo=Thanh toan don POS&accountName=Heritage%20Coffee`}
                      alt="VietQR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs font-bold text-gray-400 mt-4 text-center">
                    *Nhân viên vui lòng kiểm tra App ngân hàng để xác nhận giao dịch thành công.
                  </p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center py-10 animate-fade-in opacity-80">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 text-4xl mb-4">
                    <i className="fa-solid fa-hand-holding-dollar"></i>
                  </div>
                  <h4 className="font-black text-coffee-dark dark:text-white uppercase text-center mb-1">Thu Tiền Mặt</h4>
                  <p className="text-sm font-bold text-gray-400 text-center">Nhận {subTotal.toLocaleString()}đ từ khách</p>
                </div>
              )}

              <button
                onClick={handleConfirmCheckout}
                disabled={isProcessing}
                className="w-full mt-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner animate-spin"></i> Đang Xử Lý...
                  </span>
                ) : (
                  paymentMethod === 'ChuyenKhoan' ? 'Đã Nhận Tiền (Chốt Đơn)' : 'Xác Nhận (Chốt Đơn)'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && completedOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-coffee-dark/80 backdrop-blur-sm"
            onClick={() => setShowReceiptModal(false)}
          ></div>
          <div className="relative bg-white w-full max-w-[400px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-zoom-in">

            <div className="p-4 bg-gray-100 flex justify-between items-center border-b border-gray-200">
              <h3 className="font-black text-coffee-dark uppercase text-sm tracking-wider">In Hóa Đơn</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6 bg-white overflow-y-auto max-h-[60vh] font-mono text-sm text-gray-800" id="receipt-content">
              <div className="text-center border-b pb-4 mb-4">
                <div className="font-bold text-xl mb-1 uppercase">Heritage Coffee</div>
                <div className="text-xs text-gray-500">ĐC: 123 Đường B, TP. HCM</div>
                <div className="text-xs text-gray-500">SĐT: 0123 456 789</div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span>Mã ĐH:</span> <span className="font-bold">{completedOrder.orderCode}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Ngày:</span> <span>{completedOrder.date}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Thu ngân:</span> <span>{completedOrder.staff}</span>
                </div>
                <div className="flex justify-between">
                  <span>PTTT:</span> <span>{completedOrder.paymentMethod === 'TienMat' ? 'Tiền Mặt' : 'Chuyển Khoản'}</span>
                </div>
              </div>

              <div className="border-b pb-2 mb-2 font-bold flex justify-between">
                <span>Tên món (SL)</span>
                <span>Thành tiền</span>
              </div>

              <div className="border-b pb-4 mb-4">
                {completedOrder.items.map((item, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="flex justify-between">
                      <span className="max-w-[70%]">{item.TenSanPham} (x{item.quantity})</span>
                      <span>{(item.finalPrice * item.quantity).toLocaleString()}đ</span>
                    </div>
                    {(item.selectedSize?.id || item.selectedToppings?.length > 0) && (
                      <div className="text-xs text-gray-500 ml-2">
                        {item.selectedSize?.id && `Size: ${item.selectedSize.id}`}
                        {item.selectedToppings?.length > 0 && ` | ${item.selectedToppings.map(t => t.name).join(', ')}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-end font-bold text-lg">
                <span>TỔNG CỘNG:</span>
                <span>{completedOrder.total.toLocaleString()}đ</span>
              </div>

              <div className="text-center mt-6 text-xs text-gray-500 italic">
                Cảm ơn quý khách và hẹn gặp lại!
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold uppercase text-sm transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const content = document.getElementById('receipt-content').innerHTML;
                  const iframe = document.createElement('iframe');
                  iframe.style.display = 'none';
                  document.body.appendChild(iframe);
                  iframe.contentWindow.document.open();
                  iframe.contentWindow.document.write(`
                    <html>
                      <head>
                        <title>In Hóa Đơn - ${completedOrder.orderCode}</title>
                        <style>
                          body { font-family: monospace; padding: 20px; font-size: 14px; margin: 0; color: #000; }
                          .text-center { text-align: center; }
                          .font-bold { font-weight: bold; }
                          .text-xl { font-size: 20px; }
                          .border-b { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                          .flex { display: flex; }
                          .justify-between { justify-content: space-between; }
                          .mb-1 { margin-bottom: 4px; }
                          .mb-2 { margin-bottom: 8px; }
                          .mb-4 { margin-bottom: 16px; }
                          .mt-4 { margin-top: 16px; }
                          .mt-6 { margin-top: 24px; }
                          .pb-4 { padding-bottom: 16px; }
                          .text-xs { font-size: 12px; }
                          .text-lg { font-size: 18px; }
                          .text-gray-500 { color: #555; }
                          .italic { font-style: italic; }
                          .uppercase { text-transform: uppercase; }
                          .ml-2 { margin-left: 8px; }
                          .max-w-\\[70\\%\\] { max-width: 70%; word-break: break-word; }
                        </style>
                      </head>
                      <body>${content}</body>
                    </html>
                  `);
                  iframe.contentWindow.document.close();
                  iframe.contentWindow.focus();
                  setTimeout(() => {
                    iframe.contentWindow.print();
                    setTimeout(() => document.body.removeChild(iframe), 1000);
                  }, 200);
                }}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-print"></i> In Hóa Đơn
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default POSView
