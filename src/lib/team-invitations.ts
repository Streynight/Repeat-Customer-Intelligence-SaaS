import { createHash, randomBytes } from 'crypto'
import { appUrl } from '@/lib/app-url'
import { requireResend } from '@/lib/platform/resend'
import type { MembershipRole } from '@/lib/rbac'

const invitationTokenBytes = 32
const invitationExpiryDays = 7

export function createInvitationToken() {
  const token = randomBytes(invitationTokenBytes).toString('base64url')

  return {
    token,
    tokenHash: hashInvitationToken(token),
  }
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function invitationExpiryDate(now = new Date()) {
  return new Date(now.getTime() + invitationExpiryDays * 24 * 60 * 60 * 1000)
}

export function invitationUrl(token: string) {
  return appUrl(`/team/invite/${encodeURIComponent(token)}`)
}

export async function sendTeamInvitationEmail(input: {
  to: string
  organizationName: string
  invitedByEmail: string
  role: MembershipRole
  url: string
}) {
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!from) throw new Error('RESEND_FROM_EMAIL is required for team invitations.')

  const resend = requireResend()
  const subject = `${input.invitedByEmail} invited you to ${input.organizationName} on RepeatTree`
  const text = [
    `${input.invitedByEmail} invited you to join ${input.organizationName} as ${input.role}.`,
    '',
    `Accept the invitation: ${input.url}`,
    '',
    'This invite expires in 7 days.',
  ].join('\n')

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text,
    html: [
      `<p>${escapeHtml(input.invitedByEmail)} invited you to join <strong>${escapeHtml(input.organizationName)}</strong> as <strong>${escapeHtml(input.role)}</strong>.</p>`,
      `<p><a href="${escapeHtml(input.url)}">Accept invitation</a></p>`,
      '<p>This invite expires in 7 days.</p>',
    ].join(''),
  })

  if (error) {
    throw new Error(error.message || 'Team invitation email failed to send.')
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
