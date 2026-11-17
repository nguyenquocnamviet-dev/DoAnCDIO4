import { supabase } from '../supabaseClient'

/**
 * Tự động trừ nguyên liệu dựa trên công thức khi đơn hàng hoàn thành
 * @param {number} orderId - ID của đơn hàng
 */
export const autoDeductInventoryForOrder = async (orderId) => {
  const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!isConfigured) return

  try {
    // 1. Fetch chi tiết đơn hàng (các sản phẩm size)
    const { data: orderDetails, error: orderErr } = await supabase
      .from('chitietdonhang')
      .select(`
        SoLuong,
        sanphamsize:SanPhamSizeID (
          SanPhamID
        )
      `)
      .eq('DonHangID', orderId)

    if (orderErr) throw orderErr
    if (!orderDetails || orderDetails.length === 0) return

    // Nhóm số lượng theo SanPhamID
    const productQuantities = {}
    orderDetails.forEach(item => {
      const spId = item.sanphamsize?.SanPhamID
      if (spId) {
        productQuantities[spId] = (productQuantities[spId] || 0) + item.SoLuong
      }
    })

    const sanPhamIds = Object.keys(productQuantities).map(Number)
    if (sanPhamIds.length === 0) return

    // 2. Fetch công thức pha chế của các SanPhamID này
    const { data: recipes, error: recipeErr } = await supabase
      .from('congthucphache')
      .select('SanPhamID, NguyenLieuID, SoLuongCan')
      .in('SanPhamID', sanPhamIds)

    if (recipeErr) throw recipeErr
    if (!recipes || recipes.length === 0) return

    // Tính tổng nguyên liệu cần thiết (soLuongCan * số lượng SP)
    const ingredientDeductions = {}
    recipes.forEach(recipe => {
      const spQty = productQuantities[recipe.SanPhamID] || 0
      const totalNeeded = recipe.SoLuongCan * spQty

      if (totalNeeded > 0) {
        ingredientDeductions[recipe.NguyenLieuID] = (ingredientDeductions[recipe.NguyenLieuID] || 0) + totalNeeded
      }
    })

    const nguyenLieuIds = Object.keys(ingredientDeductions).map(Number)
    if (nguyenLieuIds.length === 0) return

    // 3. Fetch tồn kho hiện tại để trừ
    const { data: currentInventory, error: invErr } = await supabase
      .from('nguyenlieu')
      .select('NguyenLieuID, SoLuongTon')
      .in('NguyenLieuID', nguyenLieuIds)

    if (invErr) throw invErr
    if (!currentInventory) return

    // 4. Update số lượng tồn kho mới
    const promises = currentInventory.map(inv => {
      const deduction = ingredientDeductions[inv.NguyenLieuID] || 0
      let newQty = Number(inv.SoLuongTon) - deduction
      if (newQty < 0) newQty = 0 // Đảm bảo không âm

      return supabase.from('nguyenlieu')
        .update({ SoLuongTon: newQty })
        .eq('NguyenLieuID', inv.NguyenLieuID)
    })

    await Promise.all(promises)

    // 5. Lưu Lịch sử Xuất Kho (Phiếu Xuất Tự Động)
    try {
      const { data: ticketData, error: ticketErr } = await supabase.from('phieuxuatkho').insert({
        GhiChu: `Xuất tự động từ pha chế`,
        DonHangID: orderId
      }).select().single()

      if (ticketData && !ticketErr) {
        const detailInserts = currentInventory.map(inv => ({
          PhieuXuatID: ticketData.PhieuXuatID,
          NguyenLieuID: inv.NguyenLieuID,
          SoLuong: ingredientDeductions[inv.NguyenLieuID] || 0
        }))
        if (detailInserts.length > 0) {
          const { error: detErr } = await supabase.from('chitietxuatkho').insert(detailInserts)
          if (detErr) console.error("Lỗi thêm chi tiết phiếu xuất tự động:", detErr);
        }
      } else if (ticketErr) {
        console.error("Lỗi tạo phiếu xuất tự động:", ticketErr);
      }
    } catch (logErr) {
      console.warn('Lỗi lưu lịch sử phiếu xuất tự động:', logErr.message)
    }

    console.log(`Đã tự động trừ kho cho đơn hàng #${orderId}`)

  } catch (err) {
    console.error('Lỗi khi tự động trừ kho:', err.message)
  }
}
