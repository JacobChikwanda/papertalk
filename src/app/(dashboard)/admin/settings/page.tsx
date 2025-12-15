import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getOrganization } from '@/actions/organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserRole } from '@prisma/client'
import { Settings, Building2, Globe } from 'lucide-react'
import { OrganizationSettingsForm } from '@/components/admin/OrganizationSettingsForm'

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== UserRole.ORG_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect('/')
  }

  const organization = await getOrganization()

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage your organization settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Organization Settings
          </CardTitle>
          <CardDescription>
            Update your organization information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettingsForm organization={organization} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Name:</span>
              <p className="text-sm">{organization?.name}</p>
            </div>
            {organization?.domain && (
              <div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Domain:</span>
                <p className="text-sm">{organization.domain}</p>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Created:</span>
              <p className="text-sm">
                {organization?.createdAt
                  ? new Date(organization.createdAt).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Organization ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
              {organization?.id}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

