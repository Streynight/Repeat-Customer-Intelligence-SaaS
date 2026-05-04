import { TutorialsContent } from '@/components/tutorials/tutorials-content'
import { AppShell, PageHeader } from '@/components/ui/app-shell'

export default function TutorialsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Customer tutorial"
        title="How to use RepeatTree"
        description="Follow the shortest path from an empty workspace to repeat revenue actions your team can run every week."
      />
      <TutorialsContent />
    </AppShell>
  )
}
