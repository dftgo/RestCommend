// Operational log only: random id, route, status, code and duration.
// Request bodies, free text, addresses and explanations are never logged.

export interface LogEvent {
  rid: string
  route: string
  status: number
  ms: number
  code?: string
  /** Live search metrics (numbers and the model name only). */
  providerMs?: number
  searchCalls?: number
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  candidatesReturned?: number
  candidatesKept?: number
  calls?: number
  failedCalls?: number
  model?: string
}

export interface Logger {
  info(event: LogEvent): void
  message(text: string): void
}

export const stdoutLogger: Logger = {
  info: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
  message: (text) => process.stdout.write(`${text}\n`),
}
