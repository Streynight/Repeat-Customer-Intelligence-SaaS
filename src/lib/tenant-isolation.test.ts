import { describe, expect, it } from 'vitest'
import { storeAccessWhere, workspaceAccessWhere } from '@/lib/tenant-isolation'

describe('tenant isolation helpers', () => {
  it('scopes store access to the active workspace, not just the store id', () => {
    expect(storeAccessWhere('store_a', { organizationId: 'org_a', workspaceId: 'workspace_a' })).toEqual({
      id: 'store_a',
      workspaceId: 'workspace_a',
    })
  })

  it('scopes workspace access to the active organization', () => {
    expect(workspaceAccessWhere('workspace_a', { organizationId: 'org_a', workspaceId: 'workspace_a' })).toEqual({
      id: 'workspace_a',
      organizationId: 'org_a',
    })
  })
})
