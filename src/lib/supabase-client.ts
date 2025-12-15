import { createClient } from '@supabase/supabase-js'

// Client-side Supabase instance
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Create a Supabase client that doesn't use cookie storage
// This is used for admin operations that shouldn't affect the current session
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // Use a memory-only storage adapter that doesn't persist
  const memoryStorage: { [key: string]: string } = {}
  
  const storageAdapter = {
    getItem: (key: string): string | null => {
      return memoryStorage[key] ?? null
    },
    setItem: (key: string, value: string): void => {
      memoryStorage[key] = value
      // Don't persist to cookies - this is a temporary client
    },
    removeItem: (key: string): void => {
      delete memoryStorage[key]
    },
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
    },
  })
}

