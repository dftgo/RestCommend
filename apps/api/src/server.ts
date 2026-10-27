import { ConfigError, loadConfig } from './config'
import { loadRootEnv } from './env'
import { createApp } from './http/app'
import { stdoutLogger } from './log'
import { createFixtureProvider } from './search/fixtureProvider'
import { createOpenAIProvider, sdkClient } from './search/openai/openaiProvider'
import type { ResearchProvider } from './search/researchProvider'

loadRootEnv()

try {
  const config = loadConfig()
  let provider: ResearchProvider
  let label: string
  if (config.researchProvider === 'openai' && config.openai) {
    // The SDK timeout is a backstop; the search time limit aborts first.
    provider = createOpenAIProvider(config.openai, sdkClient(config.openai.apiKey, config.searchTimeoutMs + 5_000), {
    callTimeoutMs: config.searchTimeoutMs - 3_000,
  })
    label = `live OpenAI search, model: ${config.openai.model}`
  } else {
    provider = createFixtureProvider(config.demoScenario)
    label = `demo data, scenario: ${config.demoScenario}`
  }
  const app = createApp({ config, provider, logger: stdoutLogger })
  app.listen(config.port, () => {
    stdoutLogger.message(`API listening on http://localhost:${config.port} (${label})`)
  })
} catch (e) {
  if (e instanceof ConfigError) {
    process.stderr.write(`Configuration error: ${e.message}\n`)
    process.exit(1)
  }
  throw e
}
