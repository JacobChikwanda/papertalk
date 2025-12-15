import { UserRole } from '@prisma/client'

export type Permission = 
  | 'org:manage'
  | 'teacher:add'
  | 'course:create'
  | 'course:edit'
  | 'course:delete'
  | 'test:create'
  | 'test:edit'
  | 'test:delete'
  | 'test:view'
  | 'submission:grade'
  | 'submission:view'
  | 'submission:delete'

const rolePermissions: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'org:manage',
    'teacher:add',
    'course:create',
    'course:edit',
    'course:delete',
    'test:create',
    'test:edit',
    'test:delete',
    'test:view',
    'submission:grade',
    'submission:view',
    'submission:delete',
  ],
  ORG_ADMIN: [
    'org:manage',
    'teacher:add',
    'course:create',
    'course:edit',
    'course:delete',
    'test:create',
    'test:edit',
    'test:delete',
    'test:view',
    'submission:grade',
    'submission:view',
    'submission:delete',
  ],
  TEACHER: [
    'course:create',
    'course:edit',
    'course:delete',
    'test:create',
    'test:edit',
    'test:delete',
    'test:view',
    'submission:grade',
    'submission:view',
    'submission:delete',
  ],
  STUDENT: [
    'submission:view',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function requirePermission(role: UserRole, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error(`User with role ${role} does not have permission: ${permission}`)
  }
}

