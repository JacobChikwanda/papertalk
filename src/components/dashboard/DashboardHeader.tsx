'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Bell,
  Search,
  Settings,
  Menu,
  ChevronDown,
  LogOut,
  User,
} from 'lucide-react'
import { signOut } from '@/actions/auth'
import { UserRole } from '@prisma/client'
import { setMobileMenuOpen } from '@/components/dashboard/DashboardSidebar'

interface DashboardHeaderProps {
  user: {
    id: string
    name: string | null
    email: string
    role: UserRole
    organization: {
      name: string
    }
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationCount] = useState(0) // TODO: Implement actual notification fetching
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/auth/signin'
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Left side - Mobile menu button and search */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Toggle sidebar"
          onClick={() => {
            setMobileMenuOpen(true)
          }}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search..."
            className="h-9 w-64 rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Right side - Actions and user menu */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                {notificationCount}
              </span>
            )}
          </Button>
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <div className="p-4">
                <h3 className="font-semibold">Notifications</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  No new notifications
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden text-left md:block">
              <div className="text-sm font-medium">{user.name || 'User'}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {user.organization.name}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-56 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <div className="p-2">
                <div className="px-3 py-2 text-sm">
                  <div className="font-medium">{user.name || 'User'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {user.email}
                  </div>
                </div>
                <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

