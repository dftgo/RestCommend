import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'

/** Load the project-root .env. Variables already set in the environment win. Never prints values. */
export function loadRootEnv() {
  const file = resolve(import.meta.dirname, '../../../.env')
  if (!existsSync(file)) return
  const values = parseEnv(readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value
  }
}
