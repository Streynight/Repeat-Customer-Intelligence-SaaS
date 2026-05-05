import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTenantContext } from '@/lib/tenancy'

const prismaMock = vi.hoisted(() => ({
  membership: {
    findFirst: vi.fn(),
  },
}))

const getActiveOrganizationIdMock = vi.hoisted(() => vi.fn())
const ensureAuthUserProfileMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/active-organization', () => ({
  getActiveOrganizationId: getActiveOrganizationIdMock,
}))

vi.mock('@/lib/server/auth-profile', () => ({
  ensureAuthUserProfile: ensureAuthUserProfileMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'member@store.com' } },
      }),
    },
  }),
}))

describe('tenant context active organization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureAuthUserProfileMock.mockResolvedValue({ id: 'user-1' })
    getActiveOrganizationIdMock.mockResolvedValue('org-invited')
  })

  it('uses the active organization membership when the user belongs to it', async () => {
    prismaMock.membership.findFirst.mockResolvedValueOnce(membership('org-invited', 'workspace-invited', 'store-invited'))

    const context = await getTenantContext()

    expect(prismaMock.membership.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 'user-1',
        organizationId: 'org-invited',
      },
    }))
    expect(context?.organizationId).toBe('org-invited')
    expect(context?.workspaceId).toBe('workspace-invited')
    expect(context?.storeId).toBe('store-invited')
  })

  it('falls back to the first membership when the active organization is not accessible', async () => {
    prismaMock.membership.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(membership('org-default', 'workspace-default', 'store-default'))

    const context = await getTenantContext()

    expect(prismaMock.membership.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'asc' },
    }))
    expect(context?.organizationId).toBe('org-default')
  })
})

function membership(organizationId: string, workspaceId: string, storeId: string) {
  return {
    organizationId,
    role: 'editor',
    permissions: [],
    organization: {
      workspaces: [
        {
          id: workspaceId,
          stores: [{ id: storeId }],
        },
      ],
    },
  }
}
