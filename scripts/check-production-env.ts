import { loadEnvConfig } from '@next/env'
import { runProductionHealthChecks } from '../src/lib/production-health'

loadEnvConfig(process.cwd())

const args = new Set(process.argv.slice(2))

if (args.has('--help')) {
  printHelp()
  process.exit(0)
}

const includeLiveChecks = args.has('--live')
const json = args.has('--json')

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

async function main() {
  const report = await runProductionHealthChecks({ includeLiveChecks })

  if (json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printReport(report)
  }

  process.exitCode = report.status === 'fail' ? 1 : 0
}

function printHelp() {
  console.log(`RepeatTree production environment check

Usage:
  npm run health:env
  npm run health:live
  npx tsx scripts/check-production-env.ts [--live] [--json]

Options:
  --live   Also call configured live dependencies for checks with safe probes.
  --json   Print the full machine-readable report.
`)
}

function printReport(report: Awaited<ReturnType<typeof runProductionHealthChecks>>) {
  console.log(`RepeatTree production health: ${report.status.toUpperCase()}`)
  console.log(`Checked at: ${report.checkedAt}`)
  console.log('')
  console.log('Environment')

  for (const service of report.environment.services) {
    const details = [
      service.missingRequired.length ? `missing required: ${service.missingRequired.join(', ')}` : null,
      service.invalid.length ? `invalid: ${service.invalid.join('; ')}` : null,
      service.missingOptional.length ? `missing optional: ${service.missingOptional.join(', ')}` : null,
    ].filter(Boolean)

    console.log(`- ${service.label}: ${service.status.toUpperCase()}${details.length ? ` (${details.join(' | ')})` : ''}`)
  }

  if (report.live.length > 0) {
    console.log('')
    console.log('Live checks')
    for (const check of report.live) {
      console.log(`- ${check.label}: ${check.status.toUpperCase()} (${check.detail})`)
    }
  }
}
