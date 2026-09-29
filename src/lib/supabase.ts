import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iinhptjqgwfwimhmcumd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_FVkdEonxu5iWU6SNhfOBqw_wEUayIg3'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
