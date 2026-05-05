'use server'

import { revalidatePath } from 'next/cache'
import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireTenantContext, writeAuditLog, type TenantContext } from '@/lib/tenancy'

const projectStatuses = ['active', 'completed', 'archived'] as const
const projectShareRoles = ['viewer', 'editor'] as const
const projectTaskStatuses = ['open', 'done'] as const

export type ProjectStatus = (typeof projectStatuses)[number]
export type ProjectShareRole = (typeof projectShareRoles)[number]
export type ProjectTaskStatus = (typeof projectTaskStatuses)[number]

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

export type ProjectTaskView = {
  id: string
  title: string
  status: ProjectTaskStatus
  dueDate: string | null
  assignedUserId: string | null
  assignedUserEmail: string | null
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
  tasks: ProjectTaskView[]
}

export type ProjectTeammateView = {
  userId: string
  email: string
  membershipRole: string
}

export type ProjectsPageData = {
  currentUserId: string
  currentUserEmail: string
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
  tasks: {
    include: { assignedUser: { select: { id: true, email: true } } },
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
    currentUserEmail: context.email,
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

export async function createProjectTask(input: {
  projectId: string
  title: string
  assignedUserId?: string
  dueDate?: string
}): Promise<ProjectActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    const projectId = normalizeId(input.projectId, 'Project id is required.')
    const title = normalizeTaskTitle(input.title)
    const dueDate = parseDateInput(input.dueDate, 'Task due date')
    const project = await findProjectForAccess(context, projectId)

    if (!canEditProjectStatus(project, context.userId)) {
      throw new Error('Project editor access is required.')
    }

    const assignedUserId = await normalizeTaskAssignee(context, project.id, project.ownerUserId, input.assignedUserId)
    const task = await prisma.projectTask.create({
      data: {
        projectId: project.id,
        title,
        assignedUserId,
        dueDate,
      },
      select: { id: true },
    })

    await writeAuditLog(context, {
      action: 'project.task_created',
      resourceType: 'project_task',
      resourceId: task.id,
      metadata: {
        projectId: project.id,
        assignedUserId,
        dueDate: dueDate?.toISOString() ?? null,
      },
    })

    revalidatePath('/projects')
    return { ok: true, message: 'Project task created.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Project task create failed.',
    }
  }
}

export async function updateProjectTaskStatus(input: {
  taskId: string
  status: ProjectTaskStatus
}): Promise<ProjectActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    const taskId = normalizeId(input.taskId, 'Project task id is required.')
    const status = normalizeProjectTaskStatus(input.status)
    const task = await findTaskForAccess(context, taskId)

    if (!canEditProjectStatus(task.project, context.userId) && task.assignedUserId !== context.userId) {
      throw new Error('Task assignee or project editor access is required.')
    }

    await prisma.projectTask.update({
      where: { id: task.id },
      data: { status },
    })

    await writeAuditLog(context, {
      action: 'project.task_status_updated',
      resourceType: 'project_task',
      resourceId: task.id,
      metadata: {
        projectId: task.project.id,
        status,
      },
    })

    revalidatePath('/projects')
    return { ok: true, message: 'Project task updated.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Project task update failed.',
    }
  }
}

export async function deleteProjectTask(taskId: string): Promise<ProjectActionResult> {
  try {
    const context = await requireTenantContext({ permission: 'readAnalytics' })
    const normalizedTaskId = normalizeId(taskId, 'Project task id is required.')
    const task = await findTaskForAccess(context, normalizedTaskId)

    if (!canEditProjectStatus(task.project, context.userId)) {
      throw new Error('Project editor access is required.')
    }

    await prisma.projectTask.delete({ where: { id: task.id } })
    await writeAuditLog(context, {
      action: 'project.task_deleted',
      resourceType: 'project_task',
      resourceId: task.id,
      metadata: { projectId: task.project.id },
    })

    revalidatePath('/projects')
    return { ok: true, message: 'Project task deleted.' }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Project task delete failed.',
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

async function findTaskForAccess(context: TenantContext, taskId: string) {
  const task = await prisma.projectTask.findFirst({
    where: {
      id: taskId,
      project: {
        organizationId: context.organizationId,
        OR: [
          { ownerUserId: context.userId },
          { shares: { some: { userId: context.userId } } },
        ],
      },
    },
    select: {
      id: true,
      assignedUserId: true,
      project: {
        select: {
          id: true,
          ownerUserId: true,
          shares: {
            where: { userId: context.userId },
            select: { role: true },
            take: 1,
          },
        },
      },
    },
  })

  if (!task) {
    throw new Error('Project task not found.')
  }

  return task
}

async function normalizeTaskAssignee(
  context: TenantContext,
  projectId: string,
  ownerUserId: string,
  assignedUserIdValue: string | undefined,
) {
  const assignedUserId = assignedUserIdValue?.trim()
  if (!assignedUserId) return null
  if (assignedUserId === ownerUserId) return assignedUserId

  const share = await prisma.projectShare.findFirst({
    where: {
      projectId,
      userId: assignedUserId,
      project: { organizationId: context.organizationId },
    },
    select: { id: true },
  })

  if (!share) {
    throw new Error('Task assignee must have project access.')
  }

  return assignedUserId
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
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate?.toISOString() ?? null,
      assignedUserId: task.assignedUserId,
      assignedUserEmail: task.assignedUser?.email ?? null,
    })),
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

function normalizeTaskTitle(value: string) {
  const title = value.trim()
  if (!title) throw new Error('Project task title is required.')
  if (title.length > 160) throw new Error('Project task title must be 160 characters or less.')
  return title
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

function normalizeProjectTaskStatus(value: unknown): ProjectTaskStatus {
  if (!projectTaskStatuses.includes(value as ProjectTaskStatus)) {
    throw new Error('Project task status is invalid.')
  }

  return value as ProjectTaskStatus
}

function normalizeId(value: string, errorMessage: string) {
  const id = value.trim()
  if (!id) throw new Error(errorMessage)
  return id
}
