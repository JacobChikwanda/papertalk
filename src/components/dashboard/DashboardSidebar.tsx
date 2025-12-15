'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  GraduationCap,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'

interface DashboardSidebarProps {
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

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  matchPattern?: (pathname: string) => boolean
}

const adminNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Teachers',
    href: '/admin/teachers',
    icon: Users,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

const teacherNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/teacher',
    icon: LayoutDashboard,
    matchPattern: (pathname: string) => pathname === '/teacher',
  },
  {
    title: 'Courses',
    href: '/teacher/courses',
    icon: BookOpen,
    matchPattern: (pathname: string) => pathname.startsWith('/teacher/courses'),
  },
  {
    title: 'Tests',
    href: '/teacher/tests',
    icon: FileText,
    matchPattern: (pathname: string) => pathname.startsWith('/teacher/tests'),
  },
  {
    title: 'Submissions',
    href: '/teacher/submissions',
    icon: GraduationCap,
    matchPattern: (pathname: string) => pathname.startsWith('/teacher/submissions') || pathname.startsWith('/grade/'),
  },
  {
    title: 'Settings',
    href: '/teacher/settings',
    icon: Settings,
    matchPattern: (pathname: string) => pathname.startsWith('/teacher/settings'),
  },
]

// Simple global state for mobile menu
let mobileMenuState = { isOpen: false, listeners: new Set<() => void>() }

export function setMobileMenuOpen(open: boolean) {
  mobileMenuState.isOpen = open
  mobileMenuState.listeners.forEach((listener) => listener())
}

function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(mobileMenuState.isOpen)

  useEffect(() => {
    const listener = () => setIsOpen(mobileMenuState.isOpen)
    mobileMenuState.listeners.add(listener)
    setIsOpen(mobileMenuState.isOpen)
    return () => {
      mobileMenuState.listeners.delete(listener)
    }
  }, [])

  return isOpen
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const isMobileOpen = useMobileMenu()
  const pathname = usePathname()

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const navItems =
    user.role === UserRole.ORG_ADMIN || user.role === UserRole.SUPER_ADMIN
      ? adminNavItems
      : teacherNavItems

  const SidebarContent = () => (
    <div className="flex h-full flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Logo and organization */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">PaperTalk</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={closeMobileMenu}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="mb-4 px-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {user.role === UserRole.ORG_ADMIN || user.role === UserRole.SUPER_ADMIN
              ? 'Administration'
              : 'Teaching'}
          </div>
        </div>
        {navItems.map((item, index) => {
          const Icon = item.icon
          
          // Determine if this item is active
          let isActive = false
          
          if (item.matchPattern) {
            // For teacher nav items with custom match patterns
            isActive = item.matchPattern(pathname)
          } else {
            // For admin nav items, use the standard matching logic
            const matchingRoutes = navItems
              .map((navItem, idx) => ({
                item: navItem,
                index: idx,
                matches: pathname === navItem.href || pathname.startsWith(navItem.href + '/'),
              }))
              .filter(({ matches }) => matches)
              .sort((a, b) => {
                // Exact matches first
                if (pathname === a.item.href && pathname !== b.item.href) return -1
                if (pathname === b.item.href && pathname !== a.item.href) return 1
                // Then by length (longer = more specific)
                return b.item.href.length - a.item.href.length
              })
            
            // This item is active if it's the first (most specific) match
            isActive = matchingRoutes.length > 0 && matchingRoutes[0].item.href === item.href
          }
          
          // Use a unique key combining href and index to avoid duplicate key warnings
          const uniqueKey = `${item.href}-${index}-${item.title}`
          
          return (
            <Link
              key={uniqueKey}
              href={item.href}
              onClick={closeMobileMenu}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
              {isActive && (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Organization info */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Organization
          </div>
          <div className="mt-1 text-sm font-medium">{user.organization.name}</div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-zinc-900/50"
            onClick={closeMobileMenu}
          />
          <aside className="fixed left-0 top-0 h-full w-64">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
