'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateOrganization } from '@/actions/organizations'
import { useRouter } from 'next/navigation'

interface OrganizationSettingsFormProps {
  organization: {
    id: string
    name: string
    domain: string | null
    settings: any
  } | null
}

export function OrganizationSettingsForm({ organization }: OrganizationSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const settings = (organization?.settings as any) || {}
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    domain: organization?.domain || '',
    autoSendFeedback: settings.autoSendFeedback || false,
    autoApproveFeedback: settings.autoApproveFeedback || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await updateOrganization({
        name: formData.name || undefined,
        domain: formData.domain || undefined,
        settings: {
          autoSendFeedback: formData.autoSendFeedback,
          autoApproveFeedback: formData.autoApproveFeedback,
        },
      })
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to update organization')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
          Organization updated successfully
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Organization Name
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter organization name"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="domain" className="text-sm font-medium">
          Domain (Optional)
        </label>
        <Input
          id="domain"
          type="text"
          value={formData.domain}
          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
          placeholder="example.com"
        />
        <p className="text-xs text-zinc-500">
          Optional domain for your organization
        </p>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold">Feedback Settings</h3>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="autoApproveFeedback">Auto-Approve Feedback</Label>
            <p className="text-xs text-zinc-500">
              Automatically approve feedback when grades are finalized
            </p>
          </div>
          <Switch
            id="autoApproveFeedback"
            checked={formData.autoApproveFeedback}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, autoApproveFeedback: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="autoSendFeedback">Auto-Send Feedback</Label>
            <p className="text-xs text-zinc-500">
              Automatically send feedback to students when approved
            </p>
          </div>
          <Switch
            id="autoSendFeedback"
            checked={formData.autoSendFeedback}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, autoSendFeedback: checked })
            }
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}

