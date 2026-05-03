import { spawnSync } from 'node:child_process'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(command, ['prisma', 'validate'], {
  stdio: 'inherit',
  env: process.env,
})

process.exitCode = result.status ?? 1
