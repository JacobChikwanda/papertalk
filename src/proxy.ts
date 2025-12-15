import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from './lib/supabase-server'

export async function proxy(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  
  // Get the session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/signup',
    '/auth/signin',
    '/submit/',
  ]

  const isPublicRoute = publicRoutes.some((route) => 
    pathname === route || pathname.startsWith(route)
  )

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Protected routes require authentication
  if (!session) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Get user from database to check role
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  
  if (!supabaseUser) {
    const signInUrl = new URL('/auth/signin', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // Role-based route protection
  if (pathname.startsWith('/admin')) {
    // Admin routes - check if user is ORG_ADMIN or SUPER_ADMIN
    // This will be checked in the page component as well
  }

  if (pathname.startsWith('/teacher')) {
    // Teacher routes - check if user is TEACHER, ORG_ADMIN, or SUPER_ADMIN
    // This will be checked in the page component as well
  }

  return NextResponse.next()
}

