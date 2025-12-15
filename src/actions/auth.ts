'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'

export async function signUpOrganization(data: {
  organizationName: string
  adminName: string
  adminEmail: string
  password: string
}) {
  try {
    const supabase = await createServerSupabaseClient()

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.adminEmail,
      password: data.password,
      options: {
        data: {
          name: data.adminName,
        },
      },
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create user' }
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: data.organizationName,
      },
    })

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email: data.adminEmail,
        name: data.adminName,
        role: UserRole.ORG_ADMIN,
        organizationId: organization.id,
        supabaseUserId: authData.user.id,
      },
    })

    revalidatePath('/')
    return { success: true, userId: user.id, organizationId: organization.id }
  } catch (error) {
    console.error('Error signing up organization:', error)
    return { success: false, error: 'Failed to create organization' }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      // Handle rate limiting specifically
      if (error?.message?.toLowerCase().includes('rate limit') || 
          error?.message?.toLowerCase().includes('too many requests') ||
          error?.status === 429) {
        return { 
          success: false, 
          error: 'Too many login attempts. Please wait a few minutes before trying again. This is a security measure to prevent unauthorized access.' 
        }
      }
      
      // Handle other specific errors
      if (error?.message?.toLowerCase().includes('invalid login')) {
        return { success: false, error: 'Invalid email or password' }
      }
      
      return { success: false, error: error?.message || 'Invalid credentials' }
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: data.user.id },
    })

    if (!user) {
      return { success: false, error: 'User not found in database' }
    }

    revalidatePath('/')
    return { success: true, user }
  } catch (error) {
    console.error('Error signing in:', error)
    return { success: false, error: 'Failed to sign in' }
  }
}

export async function signOut() {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { success: false, error: 'Failed to sign out' }
  }
}
