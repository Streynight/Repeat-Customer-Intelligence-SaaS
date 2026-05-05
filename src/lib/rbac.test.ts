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

  it('lets admins manage operations and view admin diagnostics without billing ownership', () => {
    expect(hasPermission('admin', 'viewAdmin')).toBe(true)
    expect(hasPermission('admin', 'manageWorkspace')).toBe(true)
    expect(hasPermission('admin', 'manageMembers')).toBe(true)
    expect(hasPermission('admin', 'manageBilling')).toBe(false)
    expect(hasPermission('admin', 'manageOrganization')).toBe(false)
  })

  it('lets editors edit operational data without admin controls', () => {
    expect(hasPermission('editor', 'manageImports')).toBe(true)
    expect(hasPermission('editor', 'manageIntegrations')).toBe(true)
    expect(hasPermission('editor', 'readAnalytics')).toBe(true)
    expect(hasPermission('editor', 'manageMembers')).toBe(false)
    expect(hasPermission('editor', 'viewAdmin')).toBe(false)
  })

  it('allows explicit extra permissions without widening the base role', () => {
    expect(hasPermission('analyst', 'manageBilling')).toBe(false)
    expect(hasPermission('analyst', 'manageBilling', ['manageBilling'])).toBe(true)
    expect(hasPermission('analyst', 'viewAdmin')).toBe(false)
  })
})
