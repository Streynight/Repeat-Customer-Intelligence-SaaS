import { spawnSync } from 'node:child_process'
import { loadEnvConfig } from '@next/env'

type VerificationStep = {
  label: string
  args: string[]
}

loadEnvConfig(process.cwd())

const args = new Set(process.argv.slice(2))
const skipHealth = args.has('--skip-health')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const steps: VerificationStep[] = [
  { label: 'Prisma schema validation', args: ['run', 'prisma:validate'] },
  { label: 'Architecture boundaries', args: ['run', 'architecture:check'] },
  { label: 'TypeScript', args: ['run', 'typecheck'] },
  { label: 'ESLint', args: ['run', 'lint'] },
  { label: 'Vitest', args: ['run', 'test'] },
  { label: 'Next production build', args: ['run', 'build'] },
  ...skipHealth ? [] : [{ label: 'Production environment health', args: ['run', 'health:env'] }],
]

for (const step of steps) {
  console.log(`\n==> ${step.label}`)
  const result = spawnSync(npmCommand, step.args, {
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1
    break
  }
}
