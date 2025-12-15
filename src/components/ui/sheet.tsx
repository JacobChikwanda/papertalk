'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: 'left' | 'right' | 'top' | 'bottom'
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, side = 'right', children }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Sheet */}
      <div
        className={cn(
          'fixed z-50 bg-white shadow-lg transition-transform duration-300 ease-in-out dark:bg-zinc-900',
          side === 'left' && 'left-0 top-0 h-full w-full max-w-md',
          side === 'right' && 'right-0 top-0 h-full w-full max-w-md',
          side === 'top' && 'left-0 top-0 h-full max-h-[80vh] w-full',
          side === 'bottom' && 'bottom-0 left-0 h-full max-h-[80vh] w-full',
          open
            ? 'translate-x-0'
            : side === 'left'
              ? '-translate-x-full'
              : side === 'right'
                ? 'translate-x-full'
                : 'translate-x-0'
        )}
      >
        {children}
      </div>
    </div>
  )
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  onClose?: () => void
}

export function SheetContent({ children, onClose, className, ...props }: SheetContentProps) {
  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)} {...props}>
      {children}
    </div>
  )
}

interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function SheetHeader({ children, className, ...props }: SheetHeaderProps) {
  return (
    <div
      className={cn('flex flex-col space-y-2 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800', className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

export function SheetTitle({ children, className, ...props }: SheetTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h2>
  )
}

interface SheetDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export function SheetDescription({ children, className, ...props }: SheetDescriptionProps) {
  return (
    <p className={cn('text-sm text-zinc-600 dark:text-zinc-400', className)} {...props}>
      {children}
    </p>
  )
}

interface SheetCloseProps {
  onClose: () => void
}

export function SheetClose({ onClose }: SheetCloseProps) {
  return (
    <button
      onClick={onClose}
      className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-500 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300 dark:data-[state=open]:bg-zinc-800 dark:data-[state=open]:text-zinc-400"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  )
}

interface SheetBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function SheetBody({ children, className, ...props }: SheetBodyProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

