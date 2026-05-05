import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTeamInvitation, removeTeamMember, revokeTeamInvitation, updateMemberRole } from '@/app/actions/admin'

const prismaMock = vi.hoisted(() => ({
  organization: {
    findUnique: vi.fn(),
  },
  membership: {
    count: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  invitation: {
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
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
const sendTeamInvitationEmailMock = vi.hoisted(() => vi.fn())

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

vi.mock('@/lib/team-invitations', () => ({
  createInvitationToken: vi.fn(() => ({ token: 'invite-token', tokenHash: 'token-hash' })),
  invitationExpiryDate: vi.fn(() => new Date('2099-05-12T00:00:00.000Z')),
  invitationUrl: vi.fn(() => 'https://www.repeattree.com/team/invite/invite-token'),
  sendTeamInvitationEmail: sendTeamInvitationEmailMock,
}))

describe('admin server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireTenantContextMock.mockResolvedValue(tenantContext)
    writeAuditLogMock.mockResolvedValue(undefined)
    sendTeamInvitationEmailMock.mockResolvedValue(undefined)
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Store Team' })
    prismaMock.membership.findFirst.mockResolvedValue({ id: 'membership-1', role: 'viewer', userId: 'user-2' })
    prismaMock.membership.count.mockResolvedValue(2)
    prismaMock.membership.delete.mockResolvedValue({ id: 'membership-1' })
    prismaMock.membership.update.mockResolvedValue({ id: 'membership-1', role: 'editor' })
    prismaMock.invitation.create.mockResolvedValue({
      id: 'invitation-1',
      email: 'teammate@store.com',
      role: 'editor',
    })
    prismaMock.invitation.findFirst.mockResolvedValue(null)
    prismaMock.invitation.update.mockResolvedValue({
      id: 'invitation-1',
      email: 'teammate@store.com',
      role: 'editor',
    })
    prismaMock.invitation.delete.mockResolvedValue({ id: 'invitation-1' })
    prismaMock.invitation.deleteMany.mockResolvedValue({ count: 1 })
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
    prismaMock.membership.findFirst.mockResolvedValueOnce({ id: 'membership-1', role: 'owner', userId: 'user-2' })

    await expect(updateMemberRole(memberRoleForm('membership-1', 'viewer'))).rejects.toThrow('Only owners can change owner access.')
    expect(prismaMock.membership.update).not.toHaveBeenCalled()
  })

  it('keeps at least one owner in the organization', async () => {
    prismaMock.membership.findFirst.mockResolvedValueOnce({ id: 'membership-1', role: 'owner', userId: 'user-2' })
    prismaMock.membership.count.mockResolvedValueOnce(1)

    await expect(updateMemberRole(memberRoleForm('membership-1', 'admin'))).rejects.toThrow('At least one owner is required.')
    expect(prismaMock.membership.update).not.toHaveBeenCalled()
  })

  it('blocks members from changing their own role', async () => {
    prismaMock.membership.findFirst.mockResolvedValueOnce({ id: 'membership-1', role: 'admin', userId: 'user-1' })

    await expect(updateMemberRole(memberRoleForm('membership-1', 'viewer'))).rejects.toThrow('You cannot change your own role.')
    expect(prismaMock.membership.update).not.toHaveBeenCalled()
  })

  it('creates and sends a teammate invitation with a hashed token', async () => {
    prismaMock.membership.findFirst.mockResolvedValueOnce(null)

    const result = await createTeamInvitation({ email: 'Teammate@Store.com', role: 'editor' })

    expect(result).toEqual({ ok: true, message: 'Invitation sent.' })
    expect(prismaMock.invitation.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        email: 'teammate@store.com',
        role: 'editor',
        tokenHash: 'token-hash',
        invitedByUserId: 'user-1',
        expiresAt: new Date('2099-05-12T00:00:00.000Z'),
      },
    })
    expect(sendTeamInvitationEmailMock).toHaveBeenCalledWith({
      to: 'teammate@store.com',
      organizationName: 'Store Team',
      invitedByEmail: 'owner@store.com',
      role: 'editor',
      url: 'https://www.repeattree.com/team/invite/invite-token',
    })
  })

  it('blocks admins from inviting owners', async () => {
    requireTenantContextMock.mockResolvedValueOnce({ ...tenantContext, role: 'admin' })

    const result = await createTeamInvitation({ email: 'owner-2@store.com', role: 'owner' })

    expect(result).toEqual({ ok: false, error: 'Only owners can invite another owner.' })
    expect(prismaMock.invitation.create).not.toHaveBeenCalled()
  })

  it('removes the saved invitation when email delivery fails', async () => {
    prismaMock.membership.findFirst.mockResolvedValueOnce(null)
    sendTeamInvitationEmailMock.mockRejectedValueOnce(new Error('email provider down'))

    const result = await createTeamInvitation({ email: 'teammate@store.com', role: 'editor' })

    expect(result).toEqual({ ok: false, error: 'email provider down' })
    expect(prismaMock.invitation.deleteMany).toHaveBeenCalledWith({ where: { id: 'invitation-1' } })
  })

  it('revokes a pending teammate invitation', async () => {
    prismaMock.invitation.findFirst.mockResolvedValueOnce({
      id: 'invitation-1',
      email: 'teammate@store.com',
      role: 'editor',
    })

    const result = await revokeTeamInvitation('invitation-1')

    expect(result).toEqual({ ok: true, message: 'Invitation revoked.' })
    expect(prismaMock.invitation.delete).toHaveBeenCalledWith({ where: { id: 'invitation-1' } })
    expect(writeAuditLogMock).toHaveBeenCalledWith(tenantContext, expect.objectContaining({
      action: 'invitation.revoked',
      resourceType: 'invitation',
      resourceId: 'invitation-1',
    }))
  })

  it('removes a teammate without allowing self-removal', async () => {
    prismaMock.membership.findFirst.mockResolvedValueOnce({
      id: 'membership-2',
      role: 'editor',
      userId: 'user-2',
      user: { email: 'teammate@store.com' },
    })

    const result = await removeTeamMember('membership-2')

    expect(result).toEqual({ ok: true, message: 'Teammate removed.' })
    expect(prismaMock.membership.delete).toHaveBeenCalledWith({ where: { id: 'membership-2' } })
    expect(writeAuditLogMock).toHaveBeenCalledWith(tenantContext, expect.objectContaining({
      action: 'membership.removed',
      resourceType: 'membership',
      resourceId: 'membership-2',
    }))

    prismaMock.membership.findFirst.mockResolvedValueOnce({
      id: 'membership-1',
      role: 'owner',
      userId: 'user-1',
      user: { email: 'owner@store.com' },
    })

    const selfResult = await removeTeamMember('membership-1')
    expect(selfResult).toEqual({ ok: false, error: 'You cannot remove yourself from the team.' })
  })
})

function memberRoleForm(membershipId: string, role: string) {
  const formData = new FormData()
  formData.set('membershipId', membershipId)
  formData.set('role', role)
  return formData
}
