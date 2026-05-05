import { redirect } from 'next/navigation'
import { loadProjects } from '@/app/actions/projects'
import { ProjectsClient } from '@/components/projects/projects-client'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  let data: Awaited<ReturnType<typeof loadProjects>>

  try {
    data = await loadProjects()
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') {
      redirect('/login')
    }

    throw error
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Create projects, share them with teammates, and keep owner-controlled project dates in one place."
      />
      <ProjectsClient data={data} />
    </AppShell>
  )
}
