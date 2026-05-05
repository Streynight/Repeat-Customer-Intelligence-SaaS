import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createProject,
  createProjectTask,
  loadProjects,
  shareProject,
  updateProjectDuration,
  updateProjectStatus,
  updateProjectTaskStatus,
} from '@/app/actions/projects'

const prismaMock = vi.hoisted(() => ({
  project: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  projectShare: {
    delete: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  projectTask: {
    create: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  membership: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
}))

const tenantContext = vi.hoisted(() => ({
  userId: 'user-1',
  email: 'owner@store.com',
  organizationId: 'org-1',
  workspaceId: 'workspace-1',
  storeId: 'store-1',
  role: 'owner',
  permissions: ['readAnalytics'],
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

describe('project server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireTenantContextMock.mockResolvedValue(tenantContext)
    writeAuditLogMock.mockResolvedValue(undefined)
    prismaMock.project.create.mockResolvedValue({ id: 'project-1' })
    prismaMock.project.findFirst.mockResolvedValue({ id: 'project-1', ownerUserId: 'user-1', shares: [] })
    prismaMock.project.update.mockResolvedValue({ id: 'project-1' })
    prismaMock.projectShare.upsert.mockResolvedValue({ id: 'share-1' })
    prismaMock.projectShare.findFirst.mockResolvedValue({ id: 'share-1' })
    prismaMock.projectTask.create.mockResolvedValue({ id: 'task-1' })
    prismaMock.projectTask.findFirst.mockResolvedValue({
      id: 'task-1',
      assignedUserId: 'user-2',
      project: { id: 'project-1', ownerUserId: 'owner-1', shares: [{ role: 'viewer' }] },
    })
    prismaMock.projectTask.update.mockResolvedValue({ id: 'task-1' })
    prismaMock.membership.findMany.mockResolvedValue([])
    prismaMock.membership.findFirst.mockResolvedValue({
      id: 'membership-2',
      userId: 'user-2',
      user: { email: 'teammate@store.com' },
    })
  })

  it('creates an organization-scoped project with validated dates', async () => {
    const result = await createProject({
      name: '  VIP follow up  ',
      description: '  May campaign  ',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    })

    expect(result).toEqual({ ok: true, message: 'Project created.' })
    expect(requireTenantContextMock).toHaveBeenCalledWith({ permission: 'readAnalytics' })
    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        ownerUserId: 'user-1',
        name: 'VIP follow up',
        description: 'May campaign',
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        endDate: new Date('2026-05-31T00:00:00.000Z'),
      },
      select: { id: true },
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/projects')
  })

  it('loads owned projects and shared projects without exposing other share lists to invitees', async () => {
    prismaMock.project.findMany.mockResolvedValue([
      projectRecord({
        id: 'owned-project',
        ownerUserId: 'user-1',
        shares: [{ id: 'share-1', userId: 'user-2', role: 'viewer', user: { id: 'user-2', email: 'viewer@store.com' } }],
      }),
      projectRecord({
        id: 'shared-project',
        ownerUserId: 'owner-2',
        owner: { id: 'owner-2', email: 'other-owner@store.com' },
        shares: [
          { id: 'share-2', userId: 'user-1', role: 'editor', user: { id: 'user-1', email: 'owner@store.com' } },
          { id: 'share-3', userId: 'user-3', role: 'viewer', user: { id: 'user-3', email: 'viewer@store.com' } },
        ],
      }),
    ])
    prismaMock.membership.findMany.mockResolvedValue([
      {
        id: 'membership-2',
        userId: 'user-2',
        role: 'editor',
        user: { id: 'user-2', email: 'teammate@store.com' },
      },
    ])

    const data = await loadProjects()

    expect(data.ownedProjects).toHaveLength(1)
    expect(data.ownedProjects[0].shares).toEqual([
      { id: 'share-1', userId: 'user-2', email: 'viewer@store.com', role: 'viewer' },
    ])
    expect(data.sharedProjects).toHaveLength(1)
    expect(data.sharedProjects[0]).toMatchObject({
      id: 'shared-project',
      currentUserRole: 'editor',
      shares: [],
      tasks: [],
    })
    expect(data.teammates).toEqual([
      { userId: 'user-2', email: 'teammate@store.com', membershipRole: 'editor' },
    ])
  })

  it('rejects a project date range where the end comes first', async () => {
    const result = await createProject({
      name: 'Bad dates',
      startDate: '2026-05-31',
      endDate: '2026-05-01',
    })

    expect(result).toEqual({ ok: false, error: 'End date must be after start date.' })
    expect(prismaMock.project.create).not.toHaveBeenCalled()
  })

  it('keeps duration changes owner-only', async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(null)

    const result = await updateProjectDuration({
      projectId: 'project-1',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    })

    expect(result).toEqual({ ok: false, error: 'Project not found or owner access required.' })
    expect(prismaMock.project.update).not.toHaveBeenCalled()
  })

  it('lets an owner share a project with a teammate in the same organization', async () => {
    const result = await shareProject({
      projectId: 'project-1',
      userId: 'user-2',
      role: 'editor',
    })

    expect(result).toEqual({ ok: true, message: 'Project shared.' })
    expect(prismaMock.projectShare.upsert).toHaveBeenCalledWith({
      where: {
        projectId_userId: {
          projectId: 'project-1',
          userId: 'user-2',
        },
      },
      update: { role: 'editor' },
      create: {
        projectId: 'project-1',
        userId: 'user-2',
        role: 'editor',
      },
    })
  })

  it('lets shared editors update status but blocks shared viewers', async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce({
      id: 'project-1',
      ownerUserId: 'owner-1',
      shares: [{ role: 'editor' }],
    })

    const editorResult = await updateProjectStatus({ projectId: 'project-1', status: 'completed' })

    expect(editorResult).toEqual({ ok: true, message: 'Project status updated.' })
    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: { status: 'completed' },
    })

    prismaMock.project.findFirst.mockResolvedValueOnce({
      id: 'project-1',
      ownerUserId: 'owner-1',
      shares: [{ role: 'viewer' }],
    })

    const viewerResult = await updateProjectStatus({ projectId: 'project-1', status: 'archived' })

    expect(viewerResult).toEqual({ ok: false, error: 'Project editor access is required.' })
  })

  it('creates project tasks only when the assignee has project access', async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce({
      id: 'project-1',
      ownerUserId: 'user-1',
      shares: [],
    })

    const result = await createProjectTask({
      projectId: 'project-1',
      title: '  Follow up VIP buyers  ',
      assignedUserId: 'user-2',
      dueDate: '2026-05-20',
    })

    expect(result).toEqual({ ok: true, message: 'Project task created.' })
    expect(prismaMock.projectTask.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        title: 'Follow up VIP buyers',
        assignedUserId: 'user-2',
        dueDate: new Date('2026-05-20T00:00:00.000Z'),
      },
      select: { id: true },
    })

    prismaMock.projectShare.findFirst.mockResolvedValueOnce(null)
    const blockedResult = await createProjectTask({
      projectId: 'project-1',
      title: 'Blocked assignee',
      assignedUserId: 'outside-user',
    })

    expect(blockedResult).toEqual({ ok: false, error: 'Task assignee must have project access.' })
  })

  it('lets assigned viewers update their own task status', async () => {
    prismaMock.projectTask.findFirst.mockResolvedValueOnce({
      id: 'task-1',
      assignedUserId: 'user-1',
      project: { id: 'project-1', ownerUserId: 'owner-1', shares: [{ role: 'viewer' }] },
    })

    const result = await updateProjectTaskStatus({ taskId: 'task-1', status: 'done' })

    expect(result).toEqual({ ok: true, message: 'Project task updated.' })
    expect(prismaMock.projectTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { status: 'done' },
    })

    prismaMock.projectTask.findFirst.mockResolvedValueOnce({
      id: 'task-2',
      assignedUserId: 'user-2',
      project: { id: 'project-1', ownerUserId: 'owner-1', shares: [{ role: 'viewer' }] },
    })

    const blockedResult = await updateProjectTaskStatus({ taskId: 'task-2', status: 'done' })
    expect(blockedResult).toEqual({ ok: false, error: 'Task assignee or project editor access is required.' })
  })
})

function projectRecord(overrides: Record<string, unknown>) {
  return {
    id: 'project-1',
    name: 'VIP follow up',
    description: null,
    status: 'active',
    startDate: new Date('2026-05-01T00:00:00.000Z'),
    endDate: new Date('2026-05-31T00:00:00.000Z'),
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-02T00:00:00.000Z'),
    organizationId: 'org-1',
    ownerUserId: 'user-1',
    owner: { id: 'user-1', email: 'owner@store.com' },
    shares: [],
    tasks: [],
    ...overrides,
  }
}
