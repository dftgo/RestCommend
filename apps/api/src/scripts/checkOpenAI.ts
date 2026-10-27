// Checks that the OpenAI key works, that the configured model exists, and that
// a forced web search + strict JSON output works together. Prints only
// pass / fail, timings and token counts — never the key or the answer text.
import OpenAI from 'openai'
import { loadRootEnv } from '../env'

loadRootEnv()

const out = (line: string) => process.stdout.write(`${line}\n`)
const key = process.env.OPENAI_API_KEY?.trim()
const model = process.env.OPENAI_MODEL?.trim() || 'gpt-5.5'

async function main() {
  if (!key) {
    out('FAIL  OPENAI_API_KEY is missing in .env')
    process.exitCode = 1
    return
  }
  const client = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 90_000 })

  try {
    await client.models.retrieve(model)
    out(`OK    model "${model}" is available to this key`)
  } catch (e) {
    out(`FAIL  model "${model}" is not available: ${(e as { status?: number }).status ?? ''} ${(e as Error).name}`)
    process.exitCode = 1
    return
  }

  const started = Date.now()
  try {
    const res = await client.responses.create({
      model,
      instructions: 'Find one restaurant in Haifa, Israel. Return only facts found in sources.',
      input: 'Search the web and return one restaurant name and its official website URL (or null).',
      tools: [{ type: 'web_search', search_context_size: 'low', user_location: { type: 'approximate', country: 'IL', timezone: 'Asia/Jerusalem' } }],
      tool_choice: 'required',
      reasoning: { effort: 'low' },
      store: false,
      max_output_tokens: 4000,
      // Not in this SDK's request type, but accepted by the API (echoed back below).
      ...({ max_tool_calls: 2 } as object),
      include: ['web_search_call.action.sources'],
      text: {
        format: {
          type: 'json_schema',
          name: 'check',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'website'],
            properties: { name: { type: 'string' }, website: { type: ['string', 'null'] } },
          },
        },
      },
    })
    const ms = Date.now() - started
    const calls = res.output.filter((o) => o.type === 'web_search_call')
    const done = calls.filter((c) => c.status === 'completed')
    const sources = calls.flatMap((c) => (c.action.type === 'search' ? (c.action.sources ?? []) : []))
    let jsonOk = false
    try {
      const parsed = JSON.parse(res.output_text) as { name?: unknown }
      jsonOk = typeof parsed.name === 'string' && parsed.name.length > 0
    } catch {
      jsonOk = false
    }
    out(`${res.status === 'completed' ? 'OK  ' : 'FAIL'}  response status: ${res.status}`)
    out(`${done.length > 0 ? 'OK  ' : 'FAIL'}  forced web search ran: ${done.length} completed search call(s)`)
    out(`${sources.length > 0 ? 'OK  ' : 'WARN'}  search sources returned: ${sources.length}`)
    out(`${jsonOk ? 'OK  ' : 'FAIL'}  strict JSON output together with web search`)
    const echoed = (res as unknown as { max_tool_calls?: number | null }).max_tool_calls
    out(`${echoed === 2 ? 'OK  ' : 'WARN'}  max_tool_calls honored by the API: ${echoed ?? 'not echoed'}`)
    out(`INFO  ${ms} ms · input ${res.usage?.input_tokens ?? '?'} · output ${res.usage?.output_tokens ?? '?'} tokens`)
    if (res.status !== 'completed' || done.length === 0 || !jsonOk) process.exitCode = 1
  } catch (e) {
    out(`FAIL  web search request: ${(e as { status?: number }).status ?? ''} ${(e as Error).name} ${(e as { code?: string }).code ?? ''}`)
    process.exitCode = 1
  }
}

void main()
