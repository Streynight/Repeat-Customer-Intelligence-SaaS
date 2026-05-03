export type MembershipRole = 'owner' | 'admin' | 'analyst' | 'billing' | 'viewer'

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
  ],
  analyst: ['manageImports', 'readAnalytics'],
  billing: ['manageBilling', 'readAnalytics'],
  viewer: ['readAnalytics'],
}

export function permissionsForRole(role: MembershipRole, extraPermissions: Permission[] = []) {
  return Array.from(new Set([...rolePermissions[role], ...extraPermissions]))
}

export function hasPermission(role: MembershipRole, permission: Permission, extraPermissions: Permission[] = []) {
  return permissionsForRole(role, extraPermissions).includes(permission)
}
