import { cookies } from 'next/headers'

const activeOrganizationCookie = 'repeattree.active_organization_id'
const activeOrganizationMaxAge = 60 * 60 * 24 * 365

export async function getActiveOrganizationId() {
  const cookieStore = await cookies().catch(() => null)
  const value = cookieStore?.get(activeOrganizationCookie)?.value.trim()

  if (!value || value.length > 128) return null
  return value
}

export async function setActiveOrganizationId(organizationId: string) {
  const value = organizationId.trim()
  if (!value) throw new Error('Organization id is required.')

  const cookieStore = await cookies()
  cookieStore.set({
    name: activeOrganizationCookie,
    value,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: activeOrganizationMaxAge,
  })
}
