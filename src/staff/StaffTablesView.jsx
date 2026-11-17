import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const TABLE_POSITIONS = [
  { left: '38%', top: '22%' }, // Bàn 1
  { left: '55%', top: '22%' }, // Bàn 2
  { left: '82%', top: '25%' }, // Bàn 3
  { left: '18%', top: '75%' }, // Bàn 4
  { left: '48%', top: '55%' }, // Bàn 5
  { left: '75%', top: '55%' }, // Bàn 6
  { left: '45%', top: '82%' }, // Bàn 7
  { left: '68%', top: '82%' }, // Bàn 8
  { left: '88%', top: '82%' }, // Bàn 9
]

const StaffTablesView = ({ showNotify }) => {
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)

  const fetchTables = async () => {
    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!isConfigured) return

    try {
      const { data: tableData, error: tableErr } = await supabase
        .from('ban')
        .select('*')
        .order('BanID')

      if (tableErr) throw tableErr
      if (tableData) {
        const mapped = tableData.map((t, idx) => {
          const pos = TABLE_POSITIONS[idx % TABLE_POSITIONS.length] || { left: '50%', top: '50%' }
          return {
            id: t.BanID,
            name: t.TenBan,
            seats: t.SucChua,
            type: t.SucChua > 4 ? 'rect' : 'round',
            top: t.ToaDoY || pos.top,
            left: t.ToaDoX || pos.left,
            status: t.TrangThai
          }
        })
        setTables(mapped)
      }
    } catch (err) {
      console.error('Lỗi khi tải sơ đồ bàn:', err.message)
    }
  }

  useEffect(() => {
    fetchTables()

    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!isConfigured) return

    const channelBan = supabase
      .channel('staff_ban_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ban' },
        () => {
          fetchTables()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelBan)
    }
  }, [])

  const handleUpdateTableStatus = async (tableId, newStatus) => {
    const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    try {
      if (isConfigured) {
        const { error } = await supabase
          .from('ban')
          .update({ TrangThai: newStatus })
          .eq('BanID', tableId)

        if (error) throw error
      }
      
      setTables(prev =>
        prev.map(t => (t.id === tableId ? { ...t, status: newStatus } : t))
      )
      setSelectedTable(null)
      showNotify(`Cập nhật bàn thành công!`)
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái bàn:', err.message)
    }
  }

  const renderChairs = (seats, type) => {
    let chairs = []
    for (let i = 0; i < seats; i++) {
      let posClass = ''
      if (type === 'round') {
        const angle = (i / seats) * 360
        posClass = `absolute w-3 h-3 bg-gray-300 rounded-full border border-gray-400`
        chairs.push(
          <div
            key={i}
            className={posClass}
            style={{
              transform: `rotate(${angle}deg) translateY(-140%)`,
              top: '50%',
              left: '50%',
              marginTop: '-0.375rem',
              marginLeft: '-0.375rem'
            }}
          ></div>
        )
      } else {
        const isTop = i < seats / 2
        const lr = seats > 4 ? (i % (seats / 2) * 35) + 15 : (i % 2 * 50) + 25
        posClass = `absolute w-4 h-3 bg-gray-300 rounded-full border border-gray-400 ${
          isTop ? '-top-2' : '-bottom-2'
        }`
        chairs.push(
          <div
            key={i}
            className={posClass}
            style={{ left: `${lr}%`, transform: 'translateX(-50%)' }}
          ></div>
        )
      }
    }
    return chairs
  }

  return (
    <div className="p-6 md:p-8 h-full flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-size-2 font-black uppercase text-coffee-dark tracking-tighter mb-1">
            Sơ Đồ Bàn
          </h2>
          <p className="text-size-0 font-bold text-gray-500 uppercase tracking-widest">
            Quản lý khách tại bàn
          </p>
        </div>
      </div>

      <div className="flex-1 glass-effect p-6 rounded-[2rem] border border-white shadow-md relative flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-4 pl-2 shrink-0">
          <h3 className="text-size-1 font-black uppercase tracking-widest text-coffee-dark">
            Mặt Bằng Cửa Hàng
          </h3>
          <div className="flex gap-4 text-size-0 font-bold text-gray-500">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-300 rounded-full"></div> Trống</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Đang dùng</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400 rounded-full"></div> Đã đặt</span>
          </div>
        </div>
        
        <div className="relative flex-1 bg-white/50 rounded-[2rem] border-2 border-dashed border-gray-300 overflow-hidden shadow-inner w-full max-w-5xl mx-auto">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              opacity: 0.5
            }}
          ></div>
          
          <div className="absolute top-0 left-0 w-[25%] h-[35%] bg-coffee-dark rounded-br-[2rem] flex flex-col items-center justify-center text-coffee-cup shadow-lg z-10 border-r-4 border-b-4 border-coffee-dark/80">
            <i className="fa-solid fa-mug-hot text-size-2 mb-1"></i>
            <span className="text-size-1 font-black uppercase text-white">Quầy Bar</span>
          </div>

          {tables.map((t) => {
            const isSelected = selectedTable?.id === t.id
            const baseClass = t.type === 'round' ? 'rounded-full' : 'rounded-xl'
            const sizeClass = t.type === 'round' ? 'w-10 h-10 md:w-14 md:h-14' : t.seats > 4 ? 'w-16 h-10 md:w-24 md:h-14' : 'w-12 h-10 md:w-16 md:h-14'

            let stateColor = 'bg-white border-gray-300 text-gray-700'
            if (t.status === 'DangDung') stateColor = 'bg-red-500 border-red-500 text-white'
            if (t.status === 'DaDat') stateColor = 'bg-coffee-yellow border-coffee-yellow text-coffee-dark'
            if (t.status === 'BaoTri') stateColor = 'bg-gray-400 border-gray-400 text-white'
            if (isSelected) stateColor = 'bg-indigo-500 border-indigo-500 text-white shadow-lg scale-110 z-20'

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTable(t)}
                className={`absolute flex items-center justify-center border-2 transition-all duration-300 cursor-pointer shadow-sm hover:scale-105 ${baseClass} ${sizeClass} ${stateColor}`}
                style={{ top: t.top, left: t.left, transform: 'translate(-50%, -50%)' }}
              >
                <span className="text-[0.6rem] md:text-[0.8rem] font-black z-10 leading-none text-center">
                  {t.name}
                </span>
                {renderChairs(t.seats, t.type)}
              </div>
            )
          })}
        </div>

        {/* Quick status edit overlay */}
        {selectedTable && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 p-4 bg-white/95 rounded-2xl border border-gray-200 shadow-2xl flex items-center gap-4 animate-slide-up">
            <span className="text-size-1 font-black text-coffee-dark whitespace-nowrap">
              Thiết lập {selectedTable.name}:
            </span>
            <div className="flex gap-2">
              {['Trong', 'DangDung', 'DaDat'].map(st => {
                let btnLabel = 'Trống'
                if (st === 'DangDung') btnLabel = 'Mở Bàn'
                if (st === 'DaDat') btnLabel = 'Đã đặt'

                return (
                  <button
                    key={st}
                    onClick={() => handleUpdateTableStatus(selectedTable.id, st)}
                    className={`px-4 py-2 rounded-xl text-[0.9rem] font-bold transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap ${
                      selectedTable.status === st
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {btnLabel}
                  </button>
                )
              })}
              <button
                onClick={() => setSelectedTable(null)}
                className="btn-secondary px-3 py-2"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffTablesView
