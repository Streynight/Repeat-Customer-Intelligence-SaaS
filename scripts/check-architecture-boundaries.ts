import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

type BoundaryCheck = {
  label: string
  run: () => string[]
}

const root = process.cwd()

const checks: BoundaryCheck[] = [
  {
    label: 'API routes do not import server actions',
    run: () => findFiles('src/app/api', /route\.tsx?$/).flatMap((file) => {
      const content = read(file)
      return importsAppActions(content)
        ? [`${file} imports from src/app/actions; move route work behind a lib service boundary.`]
        : []
    }),
  },
  {
    label: 'Library and service layers do not depend on app actions',
    run: () => findFiles('src/lib', /\.tsx?$/).flatMap((file) => {
      if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) return []

      const content = read(file)
      return importsAppActions(content)
        ? [`${file} imports from src/app/actions; domain code must stay below the app boundary.`]
        : []
    }),
  },
  {
    label: 'CSV cron route delegates to service runner',
    run: () => mustContain('src/app/api/sync/csv/route.ts', [
      '@/lib/services/csv-sync-runner',
      'runDueCsvSyncConnections',
    ]),
  },
  {
    label: 'Dataset imports use command/service boundary',
    run: () => mustContain('src/app/actions/dataset.ts', [
      'ImportOrdersCommand',
      'importOrdersForTenant',
    ]),
  },
  {
    label: 'Native integration creation does not accept client credentials',
    run: () => {
      const file = 'src/app/actions/integrations.ts'
      const inputBlock = read(file).match(/createIntegrationConnection\(input:\s*\{[\s\S]*?\}\)/)?.[0] ?? ''

      return inputBlock.includes('credentialsRef')
        ? [`${file} allows credentialsRef in createIntegrationConnection input.`]
        : []
    },
  },
  {
    label: 'Automation events have an explicit idempotency migration',
    run: () => {
      const migrations = findFiles('prisma/migrations', /migration\.sql$/)
      const migration = migrations.find((file) => {
        const content = read(file)
        return content.includes('automation_events') && content.includes('idempotency_key')
      })

      return migration ? [] : ['Missing Prisma migration that adds automation_events.idempotency_key.']
    },
  },
  {
    label: 'Inngest lifecycle workflow validates workspace and records idempotently',
    run: () => mustContain('src/inngest/functions.ts', [
      'prisma.workspace.findUnique',
      'recordLifecycleAutomationEvent',
      'event.id',
    ]),
  },
  {
    label: 'Dataset import billing reservations release on persistence failure',
    run: () => mustContain('src/lib/services/dataset-import.ts', [
      'reserveImportOrderUsage',
      'persistImportForStore',
      'usageReservation.release()',
    ]),
  },
  {
    label: 'CSV sync billing reservations release on persistence failure',
    run: () => mustContain('src/lib/services/csv-sync-runner.ts', [
      'reserveImportOrderUsageForStore',
      'persistImportForStore',
      'usageReservation.release()',
    ]),
  },
]

const failures = checks.flatMap((check) => check.run().map((message) => `${check.label}: ${message}`))

if (failures.length > 0) {
  console.error('RepeatTree architecture boundary check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`RepeatTree architecture boundary check passed (${checks.length} checks).`)

function importsAppActions(content: string) {
  return /from\s+['"]@\/app\/actions(?:\/[^'"]*)?['"]/.test(content) ||
    /from\s+['"][^'"]*app\/actions(?:\/[^'"]*)?['"]/.test(content)
}

function mustContain(file: string, expected: string[]) {
  const content = read(file)
  return expected
    .filter((value) => !content.includes(value))
    .map((value) => `${file} is missing ${value}.`)
}

function findFiles(directory: string, filePattern: RegExp) {
  const absoluteDirectory = path.join(root, directory)
  if (!existsSync(absoluteDirectory)) return []

  const files: string[] = []
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const absoluteEntry = path.join(absoluteDirectory, entry.name)
    const relativeEntry = path.relative(root, absoluteEntry)

    if (entry.isDirectory()) {
      files.push(...findFiles(relativeEntry, filePattern))
      continue
    }

    if (entry.isFile() && filePattern.test(entry.name)) files.push(relativeEntry)
  }

  return files
}

function read(file: string) {
  return readFileSync(path.join(root, file), 'utf8')
}
