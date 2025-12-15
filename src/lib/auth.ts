import { createServerSupabaseClient } from './supabase-server'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

export async function getCurrentUser() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
      include: { organization: true },
    })

    return dbUser
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function getSession() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

