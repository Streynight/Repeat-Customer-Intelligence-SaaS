'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  createProjectTask,
  createProject,
  deleteProjectTask,
  removeProjectShare,
  shareProject,
  updateProjectDuration,
  updateProjectStatus,
  updateProjectTaskStatus,
  type ProjectShareRole,
  type ProjectStatus,
  type ProjectTaskStatus,
  type ProjectView,
  type ProjectsPageData,
} from '@/app/actions/projects'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useText } from '@/lib/i18n'

const statusOptions = ['active', 'completed', 'archived'] as const
const shareRoleOptions = ['editor', 'viewer'] as const
const taskStatusOptions = ['open', 'done'] as const

const statusLabels: Record<ProjectStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
}

const projectRoleLabels: Record<ProjectShareRole | 'owner', string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}

const taskStatusLabels: Record<ProjectTaskStatus, string> = {
  open: 'Open',
  done: 'Done',
}

export function ProjectsClient({ data }: { data: ProjectsPageData }) {
  const t = useText()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submitProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const result = await createProject({ name, description, startDate, endDate })

    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? t('Project create failed.'))
      return
    }

    setName('')
    setDescription('')
    setStartDate('')
    setEndDate('')
    setMessage(result.message ?? t('Project created.'))
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t('Create project')}</CardTitle>
          <CardDescription>{t('Create an owner-controlled project and share it with teammates when ready.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]" onSubmit={(event) => void submitProject(event)}>
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="project-name">{t('Project name')}</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                placeholder={t('Retention campaign')}
              />
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="project-description">{t('Description')}</Label>
              <Input
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                placeholder={t('Optional project note')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-start-date">{t('Start date')}</Label>
              <Input id="project-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-end-date">{t('End date')}</Label>
              <Input id="project-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={saving || !name.trim()} type="submit">
                {saving ? t('Creating...') : t('Create')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ActionState message={message} error={error} />

      <ProjectSection
        title="Owned projects"
        emptyText="No owned projects yet."
        projects={data.ownedProjects}
        teammates={data.teammates}
        currentUserId={data.currentUserId}
        currentUserEmail={data.currentUserEmail}
        onRefresh={() => router.refresh()}
      />

      <ProjectSection
        title="Shared with you"
        emptyText="No shared projects yet."
        projects={data.sharedProjects}
        teammates={data.teammates}
        currentUserId={data.currentUserId}
        currentUserEmail={data.currentUserEmail}
        onRefresh={() => router.refresh()}
      />
    </div>
  )
}

function ProjectSection({
  title,
  emptyText,
  projects,
  teammates,
  currentUserId,
  currentUserEmail,
  onRefresh,
}: {
  title: string
  emptyText: string
  projects: ProjectView[]
  teammates: ProjectsPageData['teammates']
  currentUserId: string
  currentUserEmail: string
  onRefresh: () => void
}) {
  const t = useText()

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t(title)}</h2>
        <Badge variant="secondary">{projects.length}</Badge>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">{t(emptyText)}</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              teammates={teammates}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ProjectCard({
  project,
  teammates,
  currentUserId,
  currentUserEmail,
  onRefresh,
}: {
  project: ProjectView
  teammates: ProjectsPageData['teammates']
  currentUserId: string
  currentUserEmail: string
  onRefresh: () => void
}) {
  const t = useText()
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [startDate, setStartDate] = useState(dateInputValue(project.startDate))
  const [endDate, setEndDate] = useState(dateInputValue(project.endDate))
  const [shareUserId, setShareUserId] = useState(teammates[0]?.userId ?? '')
  const [shareRole, setShareRole] = useState<ProjectShareRole>('editor')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskAssignedUserId, setTaskAssignedUserId] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const isOwner = project.currentUserRole === 'owner'
  const canUpdateStatus = isOwner || project.currentUserRole === 'editor'
  const assigneeOptions = buildTaskAssigneeOptions(project, currentUserId, currentUserEmail)

  const saveStatus = async () => {
    setSavingId('status')
    setMessage('')
    setError('')

    const result = await updateProjectStatus({ projectId: project.id, status })

    setSavingId(null)
    if (!result.ok) {
      setError(result.error ?? t('Project status update failed.'))
      return
    }

    setMessage(result.message ?? t('Project status updated.'))
    onRefresh()
  }

  const saveDuration = async () => {
    setSavingId('duration')
    setMessage('')
    setError('')

    const result = await updateProjectDuration({ projectId: project.id, startDate, endDate })

    setSavingId(null)
    if (!result.ok) {
      setError(result.error ?? t('Project duration update failed.'))
      return
    }

    setMessage(result.message ?? t('Project duration updated.'))
    onRefresh()
  }

  const submitShare = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!shareUserId) return

    setSavingId('share')
    setMessage('')
    setError('')

    const result = await shareProject({ projectId: project.id, userId: shareUserId, role: shareRole })

    setSavingId(null)
    if (!result.ok) {
      setError(result.error ?? t('Project share failed.'))
      return
    }

    setMessage(result.message ?? t('Project shared.'))
    onRefresh()
  }

  const revokeShare = async (shareId: string) => {
    setSavingId(shareId)
    setMessage('')
    setError('')

    const result = await removeProjectShare(shareId)

    setSavingId(null)
    if (!result.ok) {
      setError(result.error ?? t('Project access remove failed.'))
      return
    }

    setMessage(result.message ?? t('Project access removed.'))
    onRefresh()
  }

  const submitTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!taskTitle.trim()) return

    setSavingId('task')
    setMessage('')
    setError('')

    const result = await createProjectTask({
      projectId: project.id,
      title: taskTitle,
      assignedUserId: taskAssignedUserId,
      dueDate: taskDueDate,
    })

    setSavingId(null)
    if (!result.ok) {
      setError(result.error ?? t('Project task create failed.'))
      return
    }

    setTaskTitle('')
    setTaskAssignedUserId('')
    setTaskDueDate('')
    setMessage(result.message ?? t('Project task created.'))
    onRefresh()
  }

  const saveTaskStatus = async (taskId: string, status: ProjectTaskStatus) => {
    setSavingId(taskId)
    setMessage('')
    setError('')

    const result = await updateProjectTaskStatus({ taskId, status })

    setSavingId(null)
    if (!result.ok) {
      setError(result.error ?? t('Project task update failed.'))
      return
    }

    setMessage(result.message ?? t('Project task updated.'))
    onRefresh()
  }

  const removeTask = async (taskId: string) => {
    setSavingId(taskId)
    setMessage('')
    setError('')

    const result = await deleteProjectTask(taskId)

    setSavingId(null)
    if (!result.ok) {
      setError(result.error ?? t('Project task delete failed.'))
      return
    }

    setMessage(result.message ?? t('Project task deleted.'))
    onRefresh()
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="truncate">{project.name}</CardTitle>
            <CardDescription className="mt-1">
              {project.description || t('No description')}
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{t(statusLabels[project.status])}</Badge>
            <Badge variant="outline">{t(projectRoleLabels[project.currentUserRole])}</Badge>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p><span className="font-semibold text-foreground">{t('Owner')}:</span> {project.ownerEmail}</p>
          <p><span className="font-semibold text-foreground">{t('Duration')}:</span> {formatDateRange(project.startDate, project.endDate, t)}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor={`${project.id}-status`}>{t('Status')}</Label>
              <select
                id={`${project.id}-status`}
                value={status}
                disabled={!canUpdateStatus}
                onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                className="h-9 rounded-md border border-input bg-card px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
              >
                {statusOptions.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>{t(statusLabels[statusOption])}</option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!canUpdateStatus || savingId === 'status' || status === project.status}
              onClick={() => void saveStatus()}
            >
              {savingId === 'status' ? t('Saving...') : t('Save status')}
            </Button>
          </div>
        </div>

        <ProjectTasks
          project={project}
          currentUserId={currentUserId}
          canManageTasks={canUpdateStatus}
          assigneeOptions={assigneeOptions}
          taskTitle={taskTitle}
          taskAssignedUserId={taskAssignedUserId}
          taskDueDate={taskDueDate}
          savingId={savingId}
          onTaskTitleChange={setTaskTitle}
          onTaskAssignedUserIdChange={setTaskAssignedUserId}
          onTaskDueDateChange={setTaskDueDate}
          onSubmitTask={submitTask}
          onSaveTaskStatus={saveTaskStatus}
          onRemoveTask={removeTask}
        />

        {isOwner ? (
          <>
            <div className="rounded-md border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="grid gap-2">
                  <Label htmlFor={`${project.id}-start-date`}>{t('Start date')}</Label>
                  <Input id={`${project.id}-start-date`} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${project.id}-end-date`}>{t('End date')}</Label>
                  <Input id={`${project.id}-end-date`} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
                <Button type="button" disabled={savingId === 'duration'} onClick={() => void saveDuration()}>
                  {savingId === 'duration' ? t('Saving...') : t('Save duration')}
                </Button>
              </div>
            </div>

            <form className="rounded-md border border-border p-3" onSubmit={(event) => void submitShare(event)}>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <div className="grid gap-2">
                  <Label htmlFor={`${project.id}-share-user`}>{t('Share project')}</Label>
                  <select
                    id={`${project.id}-share-user`}
                    value={shareUserId}
                    onChange={(event) => setShareUserId(event.target.value)}
                    className="h-9 rounded-md border border-input bg-card px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    {teammates.length === 0 ? (
                      <option value="">{t('No teammates available')}</option>
                    ) : teammates.map((teammate) => (
                      <option key={teammate.userId} value={teammate.userId}>{teammate.email}</option>
                    ))}
                  </select>
                </div>
                <select
                  aria-label={t('Project role')}
                  value={shareRole}
                  onChange={(event) => setShareRole(event.target.value as ProjectShareRole)}
                  className="h-9 rounded-md border border-input bg-card px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  {shareRoleOptions.map((role) => (
                    <option key={role} value={role}>{t(projectRoleLabels[role])}</option>
                  ))}
                </select>
                <Button type="submit" disabled={savingId === 'share' || !shareUserId}>
                  {savingId === 'share' ? t('Saving...') : t('Share')}
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">{t('Shared teammates')}</p>
              {project.shares.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">{t('No shared teammates yet.')}</p>
              ) : project.shares.map((share) => (
                <div key={share.id} className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{share.email}</p>
                    <p className="text-xs text-muted-foreground">{t(projectRoleLabels[share.role])}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingId === share.id}
                    onClick={() => void revokeShare(share.id)}
                  >
                    {savingId === share.id ? t('Saving...') : t('Remove access')}
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <ActionState message={message} error={error} />
      </CardContent>
    </Card>
  )
}

function ProjectTasks({
  project,
  currentUserId,
  canManageTasks,
  assigneeOptions,
  taskTitle,
  taskAssignedUserId,
  taskDueDate,
  savingId,
  onTaskTitleChange,
  onTaskAssignedUserIdChange,
  onTaskDueDateChange,
  onSubmitTask,
  onSaveTaskStatus,
  onRemoveTask,
}: {
  project: ProjectView
  currentUserId: string
  canManageTasks: boolean
  assigneeOptions: Array<{ userId: string; email: string }>
  taskTitle: string
  taskAssignedUserId: string
  taskDueDate: string
  savingId: string | null
  onTaskTitleChange: (value: string) => void
  onTaskAssignedUserIdChange: (value: string) => void
  onTaskDueDateChange: (value: string) => void
  onSubmitTask: (event: React.FormEvent<HTMLFormElement>) => void
  onSaveTaskStatus: (taskId: string, status: ProjectTaskStatus) => void
  onRemoveTask: (taskId: string) => void
}) {
  const t = useText()

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{t('Tasks')}</p>
        <Badge variant="secondary">{project.tasks.length}</Badge>
      </div>

      {canManageTasks ? (
        <form className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]" onSubmit={(event) => onSubmitTask(event)}>
          <Input
            value={taskTitle}
            onChange={(event) => onTaskTitleChange(event.target.value)}
            maxLength={160}
            placeholder={t('Add task')}
            aria-label={t('Task title')}
          />
          <select
            aria-label={t('Task assignee')}
            value={taskAssignedUserId}
            onChange={(event) => onTaskAssignedUserIdChange(event.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <option value="">{t('Unassigned')}</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee.userId} value={assignee.userId}>{assignee.email}</option>
            ))}
          </select>
          <Input
            type="date"
            value={taskDueDate}
            onChange={(event) => onTaskDueDateChange(event.target.value)}
            aria-label={t('Task due date')}
          />
          <Button type="submit" disabled={savingId === 'task' || !taskTitle.trim()}>
            {savingId === 'task' ? t('Saving...') : t('Add')}
          </Button>
        </form>
      ) : null}

      <div className="mt-3 space-y-2">
        {project.tasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">{t('No tasks yet.')}</p>
        ) : project.tasks.map((task) => {
          const canUpdateTask = canManageTasks || task.assignedUserId === currentUserId

          return (
            <div key={task.id} className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.assignedUserEmail ?? t('Unassigned')} - {task.dueDate ? formatDate(task.dueDate) : t('No due date')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={task.status === 'done' ? 'secondary' : 'outline'}>{t(taskStatusLabels[task.status])}</Badge>
                {canUpdateTask ? (
                  <select
                    aria-label={t('Task status')}
                    value={task.status}
                    disabled={savingId === task.id}
                    onChange={(event) => onSaveTaskStatus(task.id, event.target.value as ProjectTaskStatus)}
                    className="h-8 rounded-md border border-input bg-card px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    {taskStatusOptions.map((status) => (
                      <option key={status} value={status}>{t(taskStatusLabels[status])}</option>
                    ))}
                  </select>
                ) : null}
                {canManageTasks ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingId === task.id}
                    onClick={() => onRemoveTask(task.id)}
                  >
                    {savingId === task.id ? t('Saving...') : t('Delete')}
                  </Button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionState({ message, error }: { message: string; error: string }) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (message) {
    return (
      <Alert>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    )
  }

  return null
}

function dateInputValue(value: string | null) {
  return value?.slice(0, 10) ?? ''
}

function buildTaskAssigneeOptions(project: ProjectView, currentUserId: string, currentUserEmail: string) {
  const participants = new Map<string, string>()
  participants.set(project.ownerUserId, project.ownerEmail)

  if (project.currentUserRole !== 'owner') {
    participants.set(currentUserId, currentUserEmail)
  }

  project.shares.forEach((share) => {
    participants.set(share.userId, share.email)
  })

  return Array.from(participants, ([userId, email]) => ({ userId, email }))
}

function formatDateRange(startDate: string | null, endDate: string | null, t: (value: string) => string) {
  if (!startDate && !endDate) return t('Not set')
  if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`
  if (startDate) return `${formatDate(startDate)} - ${t('Open end')}`
  if (!endDate) return t('Not set')
  return `${t('Until')} ${formatDate(endDate)}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}
