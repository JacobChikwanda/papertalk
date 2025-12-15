'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function getOrganization() {
  const user = await requireAuth()
  requirePermission(user.role, 'org:manage')

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
  })

  return organization
}

export async function updateOrganization(data: {
  name?: string
  domain?: string
  settings?: {
    autoSendFeedback?: boolean
    autoApproveFeedback?: boolean
    defaultVoiceId?: string
  }
}) {
  const user = await requireAuth()
  requirePermission(user.role, 'org:manage')

  const currentOrg = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { settings: true },
  })

  const currentSettings = (currentOrg?.settings as any) || {}

  const organization = await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.domain !== undefined && { domain: data.domain }),
      ...(data.settings && {
        settings: {
          ...currentSettings,
          ...data.settings,
        },
      }),
    },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/settings')
  return organization
}

