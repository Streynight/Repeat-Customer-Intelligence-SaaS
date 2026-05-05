'use server'

import { revalidatePath } from 'next/cache'
import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireTenantContext, writeAuditLog, type TenantContext } from '@/lib/tenancy'

const projectStatuses = ['active', 'completed', 'archived'] as const
const projectShareRoles = ['viewer', 'editor'] as const

export type ProjectStatus = (typeof projectStatuses)[number]
export type ProjectShareRole = (typeof projectShareRoles)[number]

export type ProjectActionResult = {
  ok: boolean
  message?: string
  error?: string
}

export type ProjectShareView = {
  id: string
  userId: string
  email: string
  role: ProjectShareRole
}

export type ProjectView = {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  createdAt: string
  ownerUserId: string
  ownerEmail: string
  currentUserRole: 'owner' | ProjectShareRole
  shares: ProjectShareView[]
}

export type ProjectTeammateView = {
  userId: string
  email: string
  membershipRole: string
}

export type ProjectsPageData = {
  currentUserId: string
  ownedProjects: ProjectView[]
  sharedProjects: ProjectView[]
  teammates: ProjectTeammateView[]
}

const projectInclude = {
  owner: { select: { id: true, email: true } },
  shares: {
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.ProjectInclude

type ProjectWithAccess = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>

export async function loadProjects(): Promise<ProjectsPageData> {
  const context = await requireTenantContext({ permission: 'readAnalytics' })
  const [projects, teammates] = await Promise.all([
    prisma.project.findMany({
      where: {
        organizationId: context.organizationId,
        OR: [
          { ownerUserId: context.userId },
          { shares: { some: { userId: context.userId } } },
        ],
      },
      include: projectInclude,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.membership.findMany({
      where: {
        organizationId: context.organizationId,
        userId: { not: context.userId },
      },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return {
    currentUserId: context.userId,
    ownedProjects: projects
      .filter((project) => project.ownerUserId === context.userId)
      .map((project) => serializeProject(project, context.userId)),
    sharedProjects: projects
      .filter((project) => project.ownerUserId !== context.userId)
      .map((project) => serializeProject(project, context.userId)),
    teammates: teammates.map((membership) => ({
      userId: membership.userId,
      email: membership.user.email,
      membershipRole: membership.role,
    })),
  }
}

export async function createProject(input: {
  name: string
  description?: string
  startDate?: string
  endDate?: string
}): Promise<ProjectActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    const name = normalizeProjectName(input.name)
    const description = normalizeProjectDescription(input.description)
    const { startDate, endDate } = normalizeProjectDates(input.startDate, input.endDate)

    const project = await prisma.project.create({
      data: {
        organizationId: context.organizationId,
        ownerUserId: context.userId,
        name,
        description,
        startDate,
        endDate,
      },
      select: { id: true },
    })

    await writeAuditLog(context, {
      action: 'project.created',
      resourceType: 'project',
      resourceId: project.id,
      metadata: { name },
    })

    revalidatePath('/projects')
    return { ok: true, message: 'Project created.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Project create failed.',
    }
  }
}

export async function updateProjectStatus(input: {
  projectId: string
  status: ProjectStatus
}): Promise<ProjectActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    const projectId = normalizeId(input.projectId, 'Project id is required.')
    const status = normalizeProjectStatus(input.status)
    const project = await findProjectForAccess(context, projectId)

    if (!canEditProjectStatus(project, context.userId)) {
      throw new Error('Project editor access is required.')
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { status },
    })

    await writeAuditLog(context, {
      action: 'project.status_updated',
      resourceType: 'project',
      resourceId: project.id,
      metadata: { status },
    })

    revalidatePath('/projects')
    return { ok: true, message: 'Project status updated.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Project status update failed.',
    }
  }
}

export async function updateProjectDuration(input: {
  projectId: string
  startDate?: string
  endDate?: string
}): Promise<ProjectActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    const projectId = normalizeId(input.projectId, 'Project id is required.')
    const project = await requireOwnedProject(context, projectId)
    const { startDate, endDate } = normalizeProjectDates(input.startDate, input.endDate)

    await prisma.project.update({
      where: { id: project.id },
      data: { startDate, endDate },
    })

    await writeAuditLog(context, {
      action: 'project.duration_updated',
      resourceType: 'project',
      resourceId: project.id,
      metadata: {
        startDate: startDate?.toISOString() ?? null,
        endDate: endDate?.toISOString() ?? null,
      },
    })

    revalidatePath('/projects')
    return { ok: true, message: 'Project duration updated.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Project duration update failed.',
    }
  }
}

export async function shareProject(input: {
  projectId: string
  userId: string
  role: ProjectShareRole
}): Promise<ProjectActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    const projectId = normalizeId(input.projectId, 'Project id is required.')
    const userId = normalizeId(input.userId, 'Teammate is required.')
    const role = normalizeProjectShareRole(input.role)
    const project = await requireOwnedProject(context, projectId)

    if (userId === context.userId) {
      throw new Error('You cannot share a project with yourself.')
    }

    const membership = await prisma.membership.findFirst({
      where: {
        organizationId: context.organizationId,
        userId,
      },
      include: { user: { select: { email: true } } },
    })

    if (!membership) {
      throw new Error('Teammate is not in this workspace.')
    }

    const share = await prisma.projectShare.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId,
        },
      },
      update: { role },
      create: {
        projectId: project.id,
        userId,
        role,
      },
    })

    await writeAuditLog(context, {
      action: 'project.shared',
      resourceType: 'project_share',
      resourceId: share.id,
      metadata: {
        projectId: project.id,
        userId,
        email: membership.user.email,
        role,
      },
    })

    revalidatePath('/projects')
    return { ok: true, message: 'Project shared.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Project share failed.',
    }
  }
}

export async function removeProjectShare(shareId: string): Promise<ProjectActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    const normalizedShareId = normalizeId(shareId, 'Project share id is required.')
    const share = await prisma.projectShare.findFirst({
      where: {
        id: normalizedShareId,
        project: {
          organizationId: context.organizationId,
          ownerUserId: context.userId,
        },
      },
      include: {
        project: { select: { id: true } },
        user: { select: { email: true } },
      },
    })

    if (!share) {
      throw new Error('Project share not found or owner access required.')
    }

    await prisma.projectShare.delete({ where: { id: share.id } })
    await writeAuditLog(context, {
      action: 'project.share_removed',
      resourceType: 'project_share',
      resourceId: share.id,
      metadata: {
        projectId: share.project.id,
        userId: share.userId,
        email: share.user.email,
      },
    })

    revalidatePath('/projects')
    return { ok: true, message: 'Project access removed.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Project access remove failed.',
    }
  }
}

async function requireOwnedProject(context: TenantContext, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: context.organizationId,
      ownerUserId: context.userId,
    },
    select: { id: true },
  })

  if (!project) {
    throw new Error('Project not found or owner access required.')
  }

  return project
}

async function findProjectForAccess(context: TenantContext, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: context.organizationId,
      OR: [
        { ownerUserId: context.userId },
        { shares: { some: { userId: context.userId } } },
      ],
    },
    select: {
      id: true,
      ownerUserId: true,
      shares: {
        where: { userId: context.userId },
        select: { role: true },
        take: 1,
      },
    },
  })

  if (!project) {
    throw new Error('Project not found.')
  }

  return project
}

function serializeProject(project: ProjectWithAccess, currentUserId: string): ProjectView {
  const currentShare = project.shares.find((share) => share.userId === currentUserId)

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.startDate?.toISOString() ?? null,
    endDate: project.endDate?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    ownerUserId: project.ownerUserId,
    ownerEmail: project.owner.email,
    currentUserRole: project.ownerUserId === currentUserId ? 'owner' : currentShare?.role ?? 'viewer',
    shares: project.ownerUserId === currentUserId
      ? project.shares.map((share) => ({
        id: share.id,
        userId: share.userId,
        email: share.user.email,
        role: share.role,
      }))
      : [],
  }
}

function canEditProjectStatus(
  project: { ownerUserId: string; shares: Array<{ role: ProjectShareRole }> },
  userId: string,
) {
  return project.ownerUserId === userId || project.shares.some((share) => share.role === 'editor')
}

function normalizeProjectName(value: string) {
  const name = value.trim()
  if (!name) throw new Error('Project name is required.')
  if (name.length > 120) throw new Error('Project name must be 120 characters or less.')
  return name
}

function normalizeProjectDescription(value: string | undefined) {
  const description = value?.trim()
  if (!description) return null
  if (description.length > 500) throw new Error('Project description must be 500 characters or less.')
  return description
}

function normalizeProjectDates(startValue: string | undefined, endValue: string | undefined) {
  const startDate = parseDateInput(startValue, 'Start date')
  const endDate = parseDateInput(endValue, 'End date')

  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    throw new Error('End date must be after start date.')
  }

  return { startDate, endDate }
}

function parseDateInput(value: string | undefined, label: string) {
  const normalized = value?.trim()
  if (!normalized) return null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} must use YYYY-MM-DD.`)
  }

  const date = new Date(`${normalized}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`${label} is invalid.`)
  }

  return date
}

function normalizeProjectStatus(value: unknown): ProjectStatus {
  if (!projectStatuses.includes(value as ProjectStatus)) {
    throw new Error('Project status is invalid.')
  }

  return value as ProjectStatus
}

function normalizeProjectShareRole(value: unknown): ProjectShareRole {
  if (!projectShareRoles.includes(value as ProjectShareRole)) {
    throw new Error('Project role is invalid.')
  }

  return value as ProjectShareRole
}

function normalizeId(value: string, errorMessage: string) {
  const id = value.trim()
  if (!id) throw new Error(errorMessage)
  return id
}
