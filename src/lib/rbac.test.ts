import { describe, expect, it } from 'vitest'
import { hasPermission, permissionsForRole } from '@/lib/rbac'

describe('rbac', () => {
  it('gives owners full production permissions', () => {
    expect(permissionsForRole('owner')).toEqual(expect.arrayContaining([
      'manageOrganization',
      'manageMembers',
      'manageBilling',
      'manageIntegrations',
      'manageWorkspace',
      'manageImports',
      'manageAutomations',
      'readAnalytics',
      'viewAdmin',
    ]))
  })

  it('keeps viewers read-only', () => {
    expect(hasPermission('viewer', 'readAnalytics')).toBe(true)
    expect(hasPermission('viewer', 'manageBilling')).toBe(false)
    expect(hasPermission('viewer', 'manageIntegrations')).toBe(false)
  })

  it('allows explicit extra permissions without widening the base role', () => {
    expect(hasPermission('analyst', 'manageBilling')).toBe(false)
    expect(hasPermission('analyst', 'manageBilling', ['manageBilling'])).toBe(true)
    expect(hasPermission('analyst', 'viewAdmin')).toBe(false)
  })
})
