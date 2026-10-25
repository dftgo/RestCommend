import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'
import { ConfigError, loadConfig } from './config'
import { createApp } from './http/app'
import { stdoutLogger } from './log'
import { createFixtureProvider } from './search/fixtureProvider'

/** Load the project-root .env. Variables already set in the environment win. */
function loadRootEnv() {
  const file = resolve(import.meta.dirname, '../../../.env')
  if (!existsSync(file)) return
  const values = parseEnv(readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value
  }
}

loadRootEnv()

try {
  const config = loadConfig()
  const app = createApp({ config, provider: createFixtureProvider(config.demoScenario), logger: stdoutLogger })
  app.listen(config.port, () => {
    stdoutLogger.message(`API listening on http://localhost:${config.port} (demo data, scenario: ${config.demoScenario})`)
  })
} catch (e) {
  if (e instanceof ConfigError) {
    process.stderr.write(`Configuration error: ${e.message}\n`)
    process.exit(1)
  }
  throw e
}
