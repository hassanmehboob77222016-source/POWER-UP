import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient<Database> | null = null
let configurationError: string | null = null

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [!supabaseUrl && 'VITE_SUPABASE_URL', !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean).join(' and ')
  configurationError = `Supabase is not configured. Set ${missing} in .env.local and restart the Vite server.`
} else {
  try {
    const parsedUrl = new URL(supabaseUrl)
    if (!['https:', 'http:'].includes(parsedUrl.protocol) || (parsedUrl.protocol === 'http:' && parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1')) {
      throw new Error('VITE_SUPABASE_URL must be an HTTPS Supabase project URL (HTTP is allowed only for localhost).')
    }
    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  } catch (error) {
    configurationError = error instanceof Error ? error.message : 'Supabase configuration is invalid. Check .env.local.'
  }
}

export const isSupabaseConfigured = Boolean(client)
export const supabaseConfigurationError = configurationError
export const supabase = client
