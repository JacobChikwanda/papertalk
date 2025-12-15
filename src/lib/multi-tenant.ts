import { Prisma } from '@prisma/client'

/**
 * Ensures all queries are scoped to a specific organization
 */
export function scopeToOrganization<T extends { organizationId: string }>(
  organizationId: string,
  data: Omit<T, 'organizationId'>
): T {
  return {
    ...data,
    organizationId,
  } as T
}

/**
 * Creates a where clause that filters by organization
 */
export function whereOrganization(organizationId: string) {
  return {
    organizationId,
  }
}

/**
 * Validates that a resource belongs to the user's organization
 */
export async function validateOrganizationAccess(
  organizationId: string,
  userOrganizationId: string
) {
  if (organizationId !== userOrganizationId) {
    throw new Error('Access denied: Resource does not belong to your organization')
  }
}

