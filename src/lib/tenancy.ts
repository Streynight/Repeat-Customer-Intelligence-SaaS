import { headers } from 'next/headers'
import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { hasPermission, permissionsForRole, type MembershipRole, type Permission } from '@/lib/rbac'
import { ensureAuthUserProfile } from '@/lib/server/auth-profile'
import { createClient } from '@/lib/supabase/server'
import { storeAccessWhere } from '@/lib/tenant-isolation'

export type TenantContext = {
  userId: string
  email: string
  organizationId: string
  workspaceId: string
  storeId: string
  role: MembershipRole
  permissions: Permission[]
}

export async function requireTenantContext(options: { permission?: Permission } = {}): Promise<TenantContext> {
  const context = await getTenantContext()
  if (!context) throw new Error('Not authenticated')

  if (options.permission && !hasPermission(context.role, options.permission, context.permissions)) {
    await writeAuditLog(context, {
      action: 'permission.denied',
      resourceType: 'permission',
      resourceId: options.permission,
    })
    throw new Error('You do not have permission to perform this action.')
  }

  return context
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const authUser = data.user
  const email = authUser?.email?.trim().toLowerCase()

  if (!authUser || !email) return null

  await ensureAuthUserProfile(authUser.id, email)

  const membership = await prisma.membership.findFirst({
    where: { userId: authUser.id },
    orderBy: { createdAt: 'asc' },
    include: {
      organization: {
        include: {
          workspaces: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
            take: 1,
            include: { stores: { orderBy: { createdAt: 'asc' }, take: 1 } },
          },
        },
      },
    },
  })

  if (membership) {
    const workspace = membership.organization.workspaces[0] ?? await createWorkspaceForOrganization(membership.organizationId)
    const store = workspace.stores[0] ?? await createStoreForWorkspace(workspace.id)
    const role = membership.role as MembershipRole

    return {
      userId: authUser.id,
      email,
      organizationId: membership.organizationId,
      workspaceId: workspace.id,
      storeId: store.id,
      role,
      permissions: permissionsForRole(role, membership.permissions as Permission[]),
    }
  }

  return createDefaultTenant(authUser.id, email)
}

export async function assertStoreAccess(storeId: string, context?: TenantContext) {
  const activeContext = context ?? await requireTenantContext()
  const store = await prisma.store.findFirst({
    where: storeAccessWhere(storeId, activeContext),
    select: { id: true },
  })

  if (!store) throw new Error('Store not found')
  return store.id
}

export async function writeAuditLog(
  context: TenantContext,
  input: {
    action: string
    resourceType: string
    resourceId?: string
    metadata?: Record<string, unknown>
  },
) {
  const headerStore = await headers().catch(() => null)

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
      actorUserId: context.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: headerStore?.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: headerStore?.get('user-agent') ?? null,
    },
  })
}

async function createDefaultTenant(userId: string, email: string): Promise<TenantContext> {
  const ownerSlug = slugify(email.split('@')[0] || 'workspace')
  const organization = await prisma.organization.create({
    data: {
      name: `${displayNameFromEmail(email)} Organization`,
      slug: await uniqueOrganizationSlug(ownerSlug),
      createdByUserId: userId,
      memberships: {
        create: {
          userId,
          role: 'owner',
          permissions: [],
        },
      },
      workspaces: {
        create: {
          name: 'Default Workspace',
          slug: 'default',
          isDefault: true,
          stores: {
            create: {
              name: 'Primary Store',
              legacyUserId: userId,
            },
          },
        },
      },
      billingSubscription: {
        create: {
          plan: 'starter',
          status: 'trialing',
        },
      },
    },
    include: {
      memberships: true,
      workspaces: {
        include: { stores: true },
      },
    },
  })
  const workspace = organization.workspaces[0]
  const store = workspace.stores[0]
  const role = organization.memberships[0].role as MembershipRole
  const context = {
    userId,
    email,
    organizationId: organization.id,
    workspaceId: workspace.id,
    storeId: store.id,
    role,
    permissions: permissionsForRole(role),
  }

  await writeAuditLog(context, {
    action: 'organization.created',
    resourceType: 'organization',
    resourceId: organization.id,
  })

  return context
}

async function createWorkspaceForOrganization(organizationId: string) {
  return prisma.workspace.create({
    data: {
      organizationId,
      name: 'Default Workspace',
      slug: 'default',
      isDefault: true,
      stores: { create: { name: 'Primary Store' } },
    },
    include: { stores: true },
  })
}

async function createStoreForWorkspace(workspaceId: string) {
  return prisma.store.create({
    data: {
      workspaceId,
      name: 'Primary Store',
    },
  })
}

async function uniqueOrganizationSlug(base: string) {
  let slug = base || 'organization'
  let suffix = 1

  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1
    slug = `${base}-${suffix}`
  }

  return slug
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'organization'
}

function displayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] || 'Customer'
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Customer'
}
