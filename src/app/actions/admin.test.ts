import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateMemberRole } from '@/app/actions/admin'

const prismaMock = vi.hoisted(() => ({
  membership: {
    count: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}))

const tenantContext = vi.hoisted(() => ({
  userId: 'user-1',
  email: 'owner@store.com',
  organizationId: 'org-1',
  workspaceId: 'workspace-1',
  storeId: 'store-1',
  role: 'owner',
  permissions: ['manageMembers', 'viewAdmin'],
}))

const requireTenantContextMock = vi.hoisted(() => vi.fn())
const writeAuditLogMock = vi.hoisted(() => vi.fn())
const revalidatePathMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/tenancy', () => ({
  requireTenantContext: requireTenantContextMock,
  writeAuditLog: writeAuditLogMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

describe('admin server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireTenantContextMock.mockResolvedValue(tenantContext)
    writeAuditLogMock.mockResolvedValue(undefined)
    prismaMock.membership.findFirst.mockResolvedValue({ id: 'membership-1', role: 'viewer' })
    prismaMock.membership.count.mockResolvedValue(2)
    prismaMock.membership.update.mockResolvedValue({ id: 'membership-1', role: 'editor' })
  })

  it('updates a member role and clears stale explicit permissions', async () => {
    await updateMemberRole(memberRoleForm('membership-1', 'editor'))

    expect(requireTenantContextMock).toHaveBeenCalledWith({ permission: 'manageMembers' })
    expect(prismaMock.membership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: {
        role: 'editor',
        permissions: [],
      },
    })
    expect(writeAuditLogMock).toHaveBeenCalledWith(tenantContext, expect.objectContaining({
      action: 'membership.role_updated',
      resourceType: 'membership',
      resourceId: 'membership-1',
      metadata: {
        previousRole: 'viewer',
        nextRole: 'editor',
      },
    }))
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin')
  })

  it('blocks admins from assigning owner access', async () => {
    requireTenantContextMock.mockResolvedValueOnce({ ...tenantContext, role: 'admin' })

    await expect(updateMemberRole(memberRoleForm('membership-1', 'owner'))).rejects.toThrow('Only owners can assign owner access.')
    expect(prismaMock.membership.update).not.toHaveBeenCalled()
  })

  it('blocks admins from changing owner access', async () => {
    requireTenantContextMock.mockResolvedValueOnce({ ...tenantContext, role: 'admin' })
    prismaMock.membership.findFirst.mockResolvedValueOnce({ id: 'membership-1', role: 'owner' })

    await expect(updateMemberRole(memberRoleForm('membership-1', 'viewer'))).rejects.toThrow('Only owners can change owner access.')
    expect(prismaMock.membership.update).not.toHaveBeenCalled()
  })

  it('keeps at least one owner in the organization', async () => {
    prismaMock.membership.findFirst.mockResolvedValueOnce({ id: 'membership-1', role: 'owner' })
    prismaMock.membership.count.mockResolvedValueOnce(1)

    await expect(updateMemberRole(memberRoleForm('membership-1', 'admin'))).rejects.toThrow('At least one owner is required.')
    expect(prismaMock.membership.update).not.toHaveBeenCalled()
  })
})

function memberRoleForm(membershipId: string, role: string) {
  const formData = new FormData()
  formData.set('membershipId', membershipId)
  formData.set('role', role)
  return formData
}
