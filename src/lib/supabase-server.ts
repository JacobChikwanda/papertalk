import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side Supabase instance (for server actions)
// In Next.js 16, cookies() returns a Promise and must be awaited
export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const cookieStore = await cookies()
  
  // Create a simple storage adapter that works with Next.js cookies
  const storageAdapter = {
    getItem: (key: string): string | null => {
      try {
        const cookie = cookieStore.get(key)
        return cookie?.value ?? null
      } catch (error) {
        return null
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        cookieStore.set(key, value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        })
      } catch (error) {
        // Silently fail if cookie setting fails
      }
    },
    removeItem: (key: string): void => {
      try {
        cookieStore.delete(key)
      } catch (error) {
        // Silently fail if cookie deletion fails
      }
    },
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
    },
  })
}

// Admin Supabase client for server-side storage operations
// Uses service role key to bypass RLS policies
// IMPORTANT: Never expose this key to the client!
export function createAdminStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for storage operations')
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

