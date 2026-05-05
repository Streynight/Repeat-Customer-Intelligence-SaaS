import { beforeEach, describe, expect, it, vi } from 'vitest'
import { acceptTeamInvitation, loadTeamInvitation } from '@/app/actions/team-invitations'

const txMock = vi.hoisted(() => ({
  auditLog: {
    create: vi.fn(),
  },
  invitation: {
    update: vi.fn(),
  },
  membership: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
}))

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  invitation: {
    findUnique: vi.fn(),
  },
}))

const getUserMock = vi.hoisted(() => vi.fn())
const ensureAuthUserProfileMock = vi.hoisted(() => vi.fn())
const redirectMock = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`redirect:${url}`)
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: getUserMock,
    },
  }),
}))

vi.mock('@/lib/server/auth-profile', () => ({
  ensureAuthUserProfile: ensureAuthUserProfileMock,
}))

vi.mock('@/lib/team-invitations', () => ({
  hashInvitationToken: vi.fn((token: string) => `hash-${token}`),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

describe('team invitation acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-2', email: 'teammate@store.com' } } })
    ensureAuthUserProfileMock.mockResolvedValue({ id: 'user-2' })
    txMock.membership.findFirst.mockResolvedValue(null)
    txMock.membership.create.mockResolvedValue({ id: 'membership-2' })
    txMock.invitation.update.mockResolvedValue({ id: 'invitation-1' })
    txMock.auditLog.create.mockResolvedValue({ id: 'audit-1' })
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock))
    prismaMock.invitation.findUnique.mockResolvedValue({
      id: 'invitation-1',
      organizationId: 'org-1',
      email: 'teammate@store.com',
      role: 'editor',
      acceptedAt: null,
      expiresAt: new Date('2099-05-12T00:00:00.000Z'),
      invitedBy: { email: 'owner@store.com' },
      organization: { name: 'Store Team' },
    })
  })

  it('loads a pending invitation without exposing the token hash', async () => {
    const state = await loadTeamInvitation('token-1')

    expect(prismaMock.invitation.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: 'hash-token-1' },
      include: {
        invitedBy: true,
        organization: true,
      },
    })
    expect(state).toEqual({
      status: 'pending',
      organizationName: 'Store Team',
      email: 'teammate@store.com',
      role: 'editor',
      invitedByEmail: 'owner@store.com',
      signedInEmail: 'teammate@store.com',
    })
  })

  it('creates membership and marks the invitation accepted for the invited email', async () => {
    await expect(acceptTeamInvitation('token-1')).rejects.toThrow('redirect:/dashboard')

    expect(ensureAuthUserProfileMock).toHaveBeenCalledWith('user-2', 'teammate@store.com')
    expect(txMock.membership.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        userId: 'user-2',
        role: 'editor',
        permissions: [],
      },
    })
    expect(txMock.invitation.update).toHaveBeenCalledWith({
      where: { id: 'invitation-1' },
      data: { acceptedAt: expect.any(Date) },
    })
  })

  it('blocks acceptance from a different signed-in email', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-3', email: 'other@store.com' } } })

    await expect(acceptTeamInvitation('token-1')).rejects.toThrow(
      'This invitation was sent to teammate@store.com. Sign in with that email to accept it.',
    )
    expect(txMock.membership.create).not.toHaveBeenCalled()
  })
})
