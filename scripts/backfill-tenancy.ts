import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '../src/generated/prisma/client'
import {
  displayNameFromEmail,
  planTenancyBackfillForUser,
  slugifyTenantName,
  summarizeTenancyBackfillPlans,
  type TenancyBackfillUserPlan,
} from '../src/lib/tenancy-backfill'

loadEnvConfig(process.cwd())

const prisma = new PrismaClient()
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const userId = readOption('--user-id')
const limit = Number(readOption('--limit') ?? 0)

if (args.includes('--help')) {
  printHelp()
  process.exit(0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

async function main() {
  try {
    const result = await runBackfill({ apply, userId, limit: Number.isFinite(limit) ? limit : 0 })
    printBackfillResult(result, apply)
  } finally {
    await prisma.$disconnect()
  }
}

type BackfillResult = {
  plans: TenancyBackfillUserPlan[]
  orphanStores: number
  appliedUsers: number
}

async function runBackfill({
  apply,
  userId,
  limit,
}: {
  apply: boolean
  userId?: string
  limit: number
}): Promise<BackfillResult> {
  const users = await prisma.user.findMany({
    where: userId ? { id: userId } : undefined,
    orderBy: { createdAt: 'asc' },
    take: limit > 0 ? limit : undefined,
    include: {
      memberships: {
        orderBy: { createdAt: 'asc' },
        include: {
          organization: {
            include: {
              billingSubscription: true,
              workspaces: {
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
                include: { stores: true },
              },
            },
          },
        },
      },
    },
  })

  const plans: TenancyBackfillUserPlan[] = []
  let appliedUsers = 0

  for (const user of users) {
    const legacyStores = await prisma.store.findMany({
      where: { legacyUserId: user.id },
      select: { id: true, workspaceId: true },
    })
    const membership = user.memberships[0]
    const organization = membership?.organization
    const plan = planTenancyBackfillForUser({
      userId: user.id,
      email: user.email,
      username: user.username,
      hasMembership: Boolean(membership),
      workspaceCount: organization?.workspaces.length ?? 0,
      billingSubscriptionExists: Boolean(organization?.billingSubscription),
      attachedStoreCount: legacyStores.filter((store) => store.workspaceId).length,
      unattachedLegacyStoreCount: legacyStores.filter((store) => !store.workspaceId).length,
    })

    plans.push(plan)

    if (apply && plan.actions.length > 0) {
      await backfillUser(user.id)
      appliedUsers += 1
    }
  }

  const orphanStores = userId || limit > 0 ? 0 : await countOrphanStores()

  return { plans, orphanStores, appliedUsers }
}

async function backfillUser(userId: string) {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: {
            organization: {
              include: {
                billingSubscription: true,
                workspaces: {
                  orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
                  include: { stores: true },
                },
              },
            },
          },
        },
      },
    })

    const legacyStores = await tx.store.findMany({
      where: { legacyUserId: user.id, workspaceId: null },
      select: { id: true },
    })
    const membership = user.memberships[0]

    if (!membership) {
      const baseSlug = slugifyTenantName(user.username || user.email.split('@')[0] || user.id)
      const slug = await uniqueOrganizationSlug(tx, baseSlug)
      const organization = await tx.organization.create({
        data: {
          name: `${displayNameFromEmail(user.email)} Organization`,
          slug,
          createdByUserId: user.id,
          memberships: {
            create: {
              userId: user.id,
              role: 'owner',
              permissions: [],
            },
          },
          workspaces: {
            create: {
              name: 'Default Workspace',
              slug: 'default',
              isDefault: true,
              stores: legacyStores.length === 0
                ? {
                    create: {
                      name: 'Primary Store',
                      legacyUserId: user.id,
                    },
                  }
                : undefined,
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
          workspaces: true,
        },
      })

      if (legacyStores.length > 0) {
        await tx.store.updateMany({
          where: { legacyUserId: user.id, workspaceId: null },
          data: { workspaceId: organization.workspaces[0].id },
        })
      }

      return
    }

    const organization = membership.organization
    let workspace = organization.workspaces[0]

    if (!workspace) {
      workspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: 'Default Workspace',
          slug: 'default',
          isDefault: true,
        },
        include: { stores: true },
      })
    }

    await tx.billingSubscription.upsert({
      where: { organizationId: organization.id },
      update: {},
      create: {
        organizationId: organization.id,
        plan: 'starter',
        status: 'trialing',
      },
    })

    if (legacyStores.length > 0) {
      await tx.store.updateMany({
        where: { legacyUserId: user.id, workspaceId: null },
        data: { workspaceId: workspace.id },
      })
    }

    const storeCount = await tx.store.count({ where: { workspaceId: workspace.id } })
    if (storeCount === 0) {
      await tx.store.create({
        data: {
          workspaceId: workspace.id,
          legacyUserId: user.id,
          name: 'Primary Store',
        },
      })
    }
  })
}

type OrganizationSlugLookup = {
  organization: {
    findUnique(args: { where: { slug: string }, select: { id: true } }): Promise<{ id: string } | null>
  }
}

async function uniqueOrganizationSlug(client: OrganizationSlugLookup, base: string) {
  let slug = base || 'organization'
  let suffix = 1

  while (await client.organization.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1
    slug = `${base}-${suffix}`
  }

  return slug
}

async function countOrphanStores() {
  const users = await prisma.user.findMany({ select: { id: true } })

  return prisma.store.count({
    where: {
      workspaceId: null,
      OR: [
        { legacyUserId: null },
        {
          legacyUserId: {
            notIn: users.map((user) => user.id),
          },
        },
      ],
    },
  })
}

function readOption(name: string) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function printHelp() {
  console.log(`RepeatTree tenancy backfill

Usage:
  npm run tenancy:backfill:dry-run
  npm run tenancy:backfill
  npx tsx scripts/backfill-tenancy.ts [--apply] [--user-id <id>] [--limit <count>]

Default mode is dry-run. Use --apply only after reviewing counts.
`)
}

function printBackfillResult(result: BackfillResult, apply: boolean) {
  const summary = summarizeTenancyBackfillPlans(result.plans)

  console.log(`RepeatTree tenancy backfill ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Users scanned: ${summary.usersScanned}`)
  console.log(`Users needing backfill: ${summary.usersNeedingBackfill}`)
  console.log(`Users applied: ${result.appliedUsers}`)
  console.log(`Orphan stores needing manual review: ${result.orphanStores}`)
  console.log('')
  console.log('Planned actions')
  for (const [action, count] of Object.entries(summary.actions)) {
    console.log(`- ${action}: ${count}`)
  }

  const sample = result.plans.filter((plan) => plan.actions.length > 0).slice(0, 10)
  if (sample.length > 0) {
    console.log('')
    console.log('Users with planned changes')
    for (const plan of sample) {
      console.log(`- ${plan.email} (${plan.userId}): ${plan.actions.join(', ')}`)
    }
  }
}
