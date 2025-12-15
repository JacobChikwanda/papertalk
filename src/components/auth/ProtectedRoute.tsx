'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { UserRole } from '@prisma/client'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/')
        return
      }
    }

    checkAuth()
  }, [router, allowedRoles])

  return <>{children}</>
}

