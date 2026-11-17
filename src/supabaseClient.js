import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zmazqklrhecrljndtvyt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptYXpxa2xyaGVjcmxqbmR0dnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNjgyODYsImV4cCI6MjEwOTg0NDI4Nn0.D7Bla-tm3N945dC3nUNVdcO6skAUzhr2ebkrXwBau40'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'LƯU Ý: Đang sử dụng cấu hình Supabase mặc định (zmazqklrhecrljndtvyt).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
