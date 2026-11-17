import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import CustomDropdown from '../components/CustomDropdown'

const RecipeView = ({ showNotify, readOnly = false }) => {
  const [recipes, setRecipes] = useState([])
  const [products, setProducts] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  const [formProdId, setFormProdId] = useState('')
  const [formVersion, setFormVersion] = useState('1')
  const [formIngredients, setFormIngredients] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)

  const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

  const fetchRecipesAndMetadata = async () => {
    if (!isConfigured) return
    setLoading(true)
    try {
      const { data: prodData } = await supabase
        .from('sanpham')
        .select('SanPhamID, TenSanPham')
        .eq('DaXoa', false)
      if (prodData) setProducts(prodData)

      const { data: ingData } = await supabase
        .from('nguyenlieu')
        .select('NguyenLieuID, TenNguyenLieu, DonViTinh')
      if (ingData) setIngredients(ingData)

      // Fetch recipes safely (manual join to avoid FK missing errors)
      const { data: ctData, error: ctErr } = await supabase
        .from('congthucphache')
        .select('*')
        .order('SanPhamID', { ascending: true })

      if (ctErr) throw ctErr
      
      if (ctData) {
        const enriched = ctData.map(ct => {
          const prod = prodData?.find(p => p.SanPhamID === ct.SanPhamID)
          const ing = ingData?.find(i => i.NguyenLieuID === ct.NguyenLieuID)
          return {
            ...ct,
            sanpham: prod ? { TenSanPham: prod.TenSanPham } : null,
            nguyenlieu: ing ? { TenNguyenLieu: ing.TenNguyenLieu, DonViTinh: ing.DonViTinh } : null
          }
        })
        setRecipes(enriched)
      }

    } catch (err) {
      console.error('Lỗi tải công thức pha chế:', err.message)
      alert('Không thể tải công thức: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipesAndMetadata()
  }, [])

  // Group recipes by Product
  const groupedRecipes = useMemo(() => {
    const groups = {}
    recipes.forEach(r => {
      if (!groups[r.SanPhamID]) {
        groups[r.SanPhamID] = {
          sanPhamId: r.SanPhamID,
          tenSanPham: r.sanpham?.TenSanPham || `Món ID: ${r.SanPhamID}`,
          phienBan: r.PhienBan || '1.0',
          ingredients: []
        }
      }
      groups[r.SanPhamID].ingredients.push({
        id: r.CongThucID,
        nguyenLieuId: r.NguyenLieuID,
        tenNguyenLieu: r.nguyenlieu?.TenNguyenLieu || `Nguyên liệu ID: ${r.NguyenLieuID}`,
        soLuong: r.SoLuongCan,
        donViTinh: r.DonViTinh
      })
    })
    return Object.values(groups)
  }, [recipes])

  const openAddModal = () => {
    setIsEditing(false)
    const available = products.filter(p => !groupedRecipes.some(g => g.sanPhamId === p.SanPhamID))
    setFormProdId(available.length > 0 ? available[0].SanPhamID : (products.length > 0 ? products[0].SanPhamID : ''))
    setFormVersion('1')
    setFormIngredients([{
      nguyenLieuId: ingredients.length > 0 ? ingredients[0].NguyenLieuID : '',
      soLuong: 10,
      donViTinh: ingredients.length > 0 ? (ingredients[0].DonViTinh || 'g') : 'g'
    }])
    setShowModal(true)
  }

  const openEditModal = (group) => {
    setIsEditing(true)
    setFormProdId(group.sanPhamId)
    setFormVersion(group.phienBan)
    setFormIngredients(group.ingredients.map(ing => ({
      nguyenLieuId: ing.nguyenLieuId,
      soLuong: ing.soLuong,
      donViTinh: ing.donViTinh
    })))
    setShowModal(true)
  }

  const addIngredientRow = () => {
    setFormIngredients([
      ...formIngredients, 
      {
        nguyenLieuId: ingredients.length > 0 ? ingredients[0].NguyenLieuID : '',
        soLuong: 10,
        donViTinh: ingredients.length > 0 ? (ingredients[0].DonViTinh || 'g') : 'g'
      }
    ])
  }

  const removeIngredientRow = (index) => {
    setFormIngredients(formIngredients.filter((_, idx) => idx !== index))
  }

  const updateIngredientRow = (index, field, value) => {
    const updated = [...formIngredients]
    updated[index][field] = value
    if (field === 'nguyenLieuId') {
      const ing = ingredients.find(i => String(i.NguyenLieuID) === String(value))
      if (ing && ing.DonViTinh) {
        updated[index].donViTinh = ing.DonViTinh
      }
    }
    setFormIngredients(updated)
  }

  const handleSaveRecipeGroup = async (e) => {
    e.preventDefault()
    if (!formProdId) {
      alert("Vui lòng chọn món!")
      return
    }
    if (formIngredients.length === 0) {
      alert("Công thức phải có ít nhất 1 nguyên liệu!")
      return
    }

    // Validation: SoLuongCan must be > 0 (prevents check constraint error)
    for (let i = 0; i < formIngredients.length; i++) {
      const qty = Number(formIngredients[i].soLuong);
      if (!qty || qty <= 0) {
        alert(`Vui lòng nhập số lượng hợp lệ (lớn hơn 0) ở dòng nguyên liệu số ${i + 1}`);
        return;
      }
    }

    if (isConfigured) {
      try {
        console.log("Bat dau luu cong thuc cho mon:", formProdId)
        
        // 1. Delete existing rows
        const { error: delErr } = await supabase.from('congthucphache').delete().eq('SanPhamID', formProdId)
        if (delErr) {
          console.error("Lỗi xóa db cũ:", delErr)
          alert("Lỗi xóa dữ liệu cũ: " + delErr.message)
          return
        }
        
        // 2. Insert new rows
        const inserts = formIngredients.map(ing => ({
          SanPhamID: Number(formProdId),
          NguyenLieuID: Number(ing.nguyenLieuId),
          SoLuongCan: Number(ing.soLuong),
          DonViTinh: ing.donViTinh,
          PhienBan: parseInt(formVersion, 10) || 1
        }))
        
        console.log("Du lieu chuan bi them vao DB:", inserts)
        const { error: insErr } = await supabase.from('congthucphache').insert(inserts)
        if (insErr) {
          console.error("Lỗi thêm db mới:", insErr)
          alert("Lỗi lưu dữ liệu: " + insErr.message)
          return
        }
        
        fetchRecipesAndMetadata()
        setShowModal(false)
        const prod = products.find(p => p.SanPhamID === Number(formProdId))
        showNotify(`Đã lưu công thức món: ${prod ? prod.TenSanPham : formProdId}`)
      } catch (err) {
        console.error('Lỗi ngoại lệ khi lưu:', err.message)
        alert('Lỗi hệ thống: ' + err.message)
      }
    }
  }

  const handleDeleteRecipeGroup = async (prodId, prodName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa toàn bộ công thức của món "${prodName}"?`)) return
    if (isConfigured) {
      try {
        await supabase.from('congthucphache').delete().eq('SanPhamID', prodId)
        fetchRecipesAndMetadata()
        showNotify(`Đã xóa công thức món: ${prodName}`)
      } catch (err) {
        console.error('Lỗi xóa công thức DB:', err.message)
      }
    }
  }

  const availableProductsForAdd = products.filter(p => !groupedRecipes.some(g => g.sanPhamId === p.SanPhamID))

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto no-scrollbar flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-size-2 font-black uppercase text-coffee-dark tracking-tighter mb-1">
            Quản Lý Định Lượng
          </h2>
          <p className="text-size-0 font-bold text-gray-500 uppercase tracking-widest">
            Công thức pha chế chuẩn cho Barista
          </p>
        </div>
        {!readOnly && (
          <button className="btn-primary py-2.5 px-5 text-size-0 whitespace-nowrap" onClick={openAddModal}>
            <i className="fa-solid fa-flask"></i> Thêm Công Thức
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border border-white">
          <i className="fa-solid fa-spinner animate-spin text-size-2 text-coffee-green mb-4"></i>
          <p className="text-size-1 font-bold text-gray-500">Đang tải công thức...</p>
        </div>
      ) : (
        <div className="glass-effect p-6 rounded-[2rem] border border-white shadow-md overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 text-size-0 font-black uppercase tracking-wider text-gray-400">
                <th className="pb-4 pl-4">Sản Phẩm</th>
                <th className="pb-4">Số Nguyên Liệu</th>
                <th className="pb-4">Chi Tiết Định Lượng</th>
                <th className="pb-4">Phiên Bản</th>
                {!readOnly && <th className="pb-4 pr-4 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody>
              {groupedRecipes.map(g => (
                <tr key={g.sanPhamId} className="border-b border-gray-50 hover:bg-white/40 transition-colors">
                  <td className="py-4 pl-4 text-coffee-dark font-black text-size-1">{g.tenSanPham}</td>
                  <td className="py-4 text-gray-600 font-bold">
                    <span className="px-3 py-1 bg-gray-100 rounded-full">{g.ingredients.length} loại</span>
                  </td>
                  <td className="py-4 text-gray-500 text-size-0 min-w-[200px] align-top">
                    <button 
                      onClick={() => setExpandedRow(expandedRow === g.sanPhamId ? null : g.sanPhamId)} 
                      className="text-coffee-green font-bold hover:underline flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full transition-colors hover:bg-emerald-100"
                    >
                      <i className={`fa-solid ${expandedRow === g.sanPhamId ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      {expandedRow === g.sanPhamId ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
                    </button>
                    {expandedRow === g.sanPhamId && (
                      <div className="mt-3 flex flex-col gap-2 p-3 bg-white border border-gray-100 rounded-xl shadow-inner animate-fade-in">
                        {g.ingredients.map(ing => (
                          <div key={ing.id} className="flex justify-between items-center border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                            <span className="text-gray-600 font-bold">{ing.tenNguyenLieu}</span>
                            <span className="text-coffee-dark font-black bg-gray-100 px-2 py-0.5 rounded-md text-[0.8rem]">
                              {ing.soLuong} {ing.donViTinh}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-4">
                    <span className="text-[0.7rem] font-black uppercase px-2 py-1 rounded-full border text-blue-600 bg-blue-50 border-blue-100">
                      v{g.phienBan}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="py-4 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(g)} className="btn-icon bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white" title="Sửa công thức">
                          <i className="fa-solid fa-pen text-size-0"></i>
                        </button>
                        <button onClick={() => handleDeleteRecipeGroup(g.sanPhamId, g.tenSanPham)} className="btn-icon text-red-500 bg-red-50 hover:bg-red-500 hover:text-white" title="Xóa toàn bộ">
                          <i className="fa-solid fa-trash text-size-0"></i>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {groupedRecipes.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500 font-bold">Chưa thiết lập công thức định lượng nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-coffee-dark/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-effect p-8 rounded-[2.5rem] relative max-w-2xl w-full shadow-2xl border border-white animate-fade-in max-h-[90vh] flex flex-col">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 btn-icon z-10">&times;</button>
            
            <h3 className="text-size-2 font-black text-coffee-green uppercase mb-6 tracking-tighter text-center shrink-0">
              {isEditing ? 'Sửa Công Thức Pha Chế' : 'Tạo Công Thức Mới'}
            </h3>

            <div className="overflow-y-auto no-scrollbar flex-1 pr-2">
              <form id="recipe-form" onSubmit={handleSaveRecipeGroup} className="space-y-6">
                
                {/* Header info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-size-0 font-bold mb-1 ml-2 text-gray-500 uppercase tracking-wider">Sản Phẩm</label>
                    <CustomDropdown
                      options={(isEditing ? products : (availableProductsForAdd.length > 0 ? availableProductsForAdd : products)).map(p => ({ 
                        value: p.SanPhamID, 
                        label: p.TenSanPham, 
                        icon: 'fa-mug-hot', 
                        color: 'bg-amber-100 text-amber-800' 
                      }))}
                      value={formProdId}
                      onChange={(val) => setFormProdId(Number(val))}
                      placeholder="Chọn món pha chế"
                      disabled={isEditing}
                    />
                  </div>
                  <div>
                    <label className="block text-size-0 font-bold mb-1 ml-2 text-gray-500 uppercase tracking-wider">Phiên Bản (VD: 1)</label>
                    <input type="number" step="1" required value={formVersion} onChange={(e) => setFormVersion(e.target.value)} className="w-full py-2.5 px-4 rounded-2xl bg-white/80 border border-gray-200 text-size-1 font-bold outline-none focus:border-coffee-green transition-colors" placeholder="1" />
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4"></div>

                {/* Ingredients list */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-size-0 font-black text-coffee-dark uppercase tracking-wider">
                      Thành phần nguyên liệu ({formIngredients.length})
                    </label>
                    <button type="button" onClick={addIngredientRow} className="btn-secondary py-1.5 px-3 text-[0.8rem]">
                      <i className="fa-solid fa-plus"></i> Thêm thành phần
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formIngredients.map((ing, idx) => (
                      <div key={idx} className="relative flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white/60 p-3 rounded-2xl border border-gray-100 shadow-sm transition-all hover:bg-white/80">
                        <div className="flex-1 w-full min-w-[200px]">
                          <CustomDropdown
                            options={ingredients.map(i => ({
                              value: i.NguyenLieuID,
                              label: i.TenNguyenLieu,
                              icon: 'fa-leaf',
                              color: 'bg-emerald-100 text-emerald-800'
                            }))}
                            value={ing.nguyenLieuId}
                            onChange={(val) => updateIngredientRow(idx, 'nguyenLieuId', Number(val))}
                            placeholder="-- Chọn nguyên liệu --"
                          />
                        </div>
                        
                        <div className="flex gap-3 w-full sm:w-auto">
                          <div className="w-24 shrink-0">
                            <input 
                              type="number" step="0.1" min="0.1" required 
                              value={ing.soLuong} 
                              onChange={(e) => updateIngredientRow(idx, 'soLuong', e.target.value)} 
                              className="w-full h-full py-2.5 px-3 rounded-2xl bg-white/90 border-2 border-gray-200/80 hover:border-coffee-green/60 focus:border-coffee-green focus:ring-2 focus:ring-coffee-green/20 text-size-1 font-black outline-none text-center shadow-sm transition-all text-coffee-dark" 
                              placeholder="SL" 
                            />
                          </div>
                          <div className="w-32 shrink-0">
                            <CustomDropdown
                              options={[
                                { value: 'g', label: 'Gram (g)', icon: 'fa-scale-balanced' },
                                { value: 'ml', label: 'Mililit (ml)', icon: 'fa-flask' },
                                { value: 'lít', label: 'Lít (l)', icon: 'fa-flask' },
                                { value: 'kg', label: 'Kg', icon: 'fa-scale-balanced' },
                                { value: 'muỗng', label: 'Muỗng', icon: 'fa-spoon' },
                                { value: 'gói', label: 'Gói', icon: 'fa-box' }
                              ]}
                              value={ing.donViTinh}
                              onChange={(val) => updateIngredientRow(idx, 'donViTinh', val)}
                              placeholder="Đơn vị"
                            />
                          </div>
                          {formIngredients.length > 1 && (
                            <button type="button" onClick={() => removeIngredientRow(idx)} className="btn-icon bg-red-50 text-red-500 hover:bg-red-500 hover:text-white shrink-0 self-center">
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </form>
            </div>
            
            <div className="shrink-0 pt-6 mt-2 border-t border-gray-100">
              <button type="submit" form="recipe-form" className="w-full btn-primary py-3.5 text-size-1 shadow-lg shadow-coffee-green/20">
                <i className="fa-solid fa-floppy-disk mr-2"></i>
                {isEditing ? 'Lưu Cập Nhật' : 'Lưu Công Thức'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecipeView
