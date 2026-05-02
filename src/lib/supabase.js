import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const MEMBERS = ['임종락', '박주연', '서윤호', '이승규']

export const EVENT_TYPES = {
  tm: { label: 'TM', color: '#3B82F6', bg: '#EFF6FF' },
  sales: { label: '영업', color: '#10B981', bg: '#ECFDF5' },
  dm: { label: 'DM', color: '#8B5CF6', bg: '#F5F3FF' },
  confirmed: { label: '확정', color: '#F59E0B', bg: '#FFFBEB' },
}
