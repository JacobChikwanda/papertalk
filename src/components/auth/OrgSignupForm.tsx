'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signUpOrganization } from '@/actions/auth'

export function OrgSignupForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSubmittingRef = useRef(false)
  const [formData, setFormData] = useState({
    organizationName: '',
    adminName: '',
    adminEmail: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent duplicate submissions using ref (more reliable than state)
    if (isSubmittingRef.current || isLoading) {
      return
    }
    
    isSubmittingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await signUpOrganization(formData)
      if (result.success) {
        router.push('/auth/signin?message=Organization created successfully')
        // Don't set isLoading(false) on success - let redirect happen
      } else {
        setError(result.error || 'Failed to create organization')
        setIsLoading(false)
        isSubmittingRef.current = false // Re-enable form on error
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
      isSubmittingRef.current = false // Re-enable form on error
    }
    // Note: Don't reset on success - let redirect happen
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Your Organization</CardTitle>
        <CardDescription>
          Set up your school or institution account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="orgName" className="text-sm font-medium">
              Organization Name
            </label>
            <Input
              id="orgName"
              type="text"
              placeholder="Acme High School"
              value={formData.organizationName}
              onChange={(e) =>
                setFormData({ ...formData, organizationName: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="adminName" className="text-sm font-medium">
              Your Name
            </label>
            <Input
              id="adminName"
              type="text"
              placeholder="John Doe"
              value={formData.adminName}
              onChange={(e) =>
                setFormData({ ...formData, adminName: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="adminEmail" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="admin@school.com"
              value={formData.adminEmail}
              onChange={(e) =>
                setFormData({ ...formData, adminEmail: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Organization'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

