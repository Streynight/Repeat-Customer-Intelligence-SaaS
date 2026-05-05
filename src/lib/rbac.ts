export const membershipRoles = ['owner', 'admin', 'editor', 'analyst', 'billing', 'viewer'] as const

export type MembershipRole = (typeof membershipRoles)[number]

export type Permission =
  | 'manageOrganization'
  | 'manageMembers'
  | 'manageBilling'
  | 'manageIntegrations'
  | 'manageWorkspace'
  | 'manageImports'
  | 'manageAutomations'
  | 'readAnalytics'
  | 'viewAdmin'

export const rolePermissions: Record<MembershipRole, Permission[]> = {
  owner: [
    'manageOrganization',
    'manageMembers',
    'manageBilling',
    'manageIntegrations',
    'manageWorkspace',
    'manageImports',
    'manageAutomations',
    'readAnalytics',
    'viewAdmin',
  ],
  admin: [
    'manageMembers',
    'manageIntegrations',
    'manageWorkspace',
    'manageImports',
    'manageAutomations',
    'readAnalytics',
    'viewAdmin',
  ],
  editor: ['manageIntegrations', 'manageImports', 'readAnalytics'],
  analyst: ['manageImports', 'readAnalytics'],
  billing: ['manageBilling', 'readAnalytics'],
  viewer: ['readAnalytics'],
}

export const adminAssignableRoles = ['admin', 'editor', 'analyst', 'billing', 'viewer'] as const satisfies readonly MembershipRole[]
export const ownerAssignableRoles = membershipRoles

export function permissionsForRole(role: MembershipRole, extraPermissions: Permission[] = []) {
  return Array.from(new Set([...rolePermissions[role], ...extraPermissions]))
}

export function hasPermission(role: MembershipRole, permission: Permission, extraPermissions: Permission[] = []) {
  return permissionsForRole(role, extraPermissions).includes(permission)
}

export function isMembershipRole(value: unknown): value is MembershipRole {
  return typeof value === 'string' && membershipRoles.includes(value as MembershipRole)
}
