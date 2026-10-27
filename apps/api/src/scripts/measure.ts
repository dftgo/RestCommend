// Live timing sample (Milestone 4): runs made-up outings (no names) through
// the real search, one after another, and writes a timing report.
//   npm run measure -w apps/api                 -> all outings + report
//   npm run measure -w apps/api -- --only 3     -> one outing, no report
//   ... -- --dump <file>                        -> also save the results (for manual checks)
// Costs money: every outing is one live OpenAI call with web search.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { RecommendationsResponse, SearchRequest } from '@restcommend/contracts'
import { ConfigError, loadConfig } from '../config'
import { loadRootEnv } from '../env'
import { ApiError } from '../http/errors'
import { createOpenAIProvider, sdkClient } from '../search/openai/openaiProvider'
import { runSearch } from '../search/orchestrator'
import type { ProviderMetrics } from '../search/researchProvider'

loadRootEnv()
const out = (line: string) => process.stdout.write(`${line}\n`)

// ---------- Visit time (Israel) ----------

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const parts = (ms: number) => Object.fromEntries(fmt.formatToParts(new Date(ms)).map((p) => [p.type, p.value]))

/** Next given weekday (0 = Sunday) at least 2 days from now, at hh:mm Israel time. */
function visitOn(weekday: number, time: string): SearchRequest['visitAt'] {
  const now = Date.now()
  for (let add = 2; add < 10; add++) {
    const p = parts(now + add * 86_400_000)
    const date = `${p.year}-${p.month}-${p.day}`
    const [y, m, d] = date.split('-').map(Number)
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== weekday) continue
    const [hh, mm] = time.split(':').map(Number)
    const guess = Date.UTC(y, m - 1, d, hh, mm)
    const g = parts(guess)
    const offset = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour, +g.minute) - guess
    return { local: `${date}T${time}`, timeZone: 'Asia/Jerusalem', utc: new Date(guess - offset).toISOString() }
  }
  throw new Error('no date')
}

// ---------- Sample outings (made up; no names) ----------

type P = SearchRequest['participants'][number]
const p = (token: string, extra: Partial<P> = {}): P => ({ token, foodMode: 'use_saved', foodTypes: [], diet: 'indifferent', ...extra })
const any = { budgetRanges: 'indifferent', kosher: 'indifferent', atmospheres: 'indifferent' } as const

interface Sample {
  label: string
  request: SearchRequest
  /** Run a "more recommendations" request after this one. */
  more?: boolean
}

function samples(): Sample[] {
  const thu = visitOn(4, '20:00')
  const base = (requestId: string, extra: Partial<SearchRequest>): SearchRequest => ({
    requestId,
    participants: [p('p1')],
    sharedFilters: { ...any },
    visitAt: thu,
    searchMode: 'areas',
    areaIds: ['tel_aviv_yafo'],
    excludedRestaurantIds: [],
    ...extra,
  })
  return [
    {
      label: 'תל אביב, 4 משתתפים, צמחוני, 100–300 ₪, תוססת (+ המלצות נוספות)',
      more: true,
      request: base('m1', {
        participants: [
          p('p1', { foodTypes: ['italian'] }),
          p('p2', { foodMode: 'specific', foodTypes: ['sushi'] }),
          p('p3', { diet: 'vegetarian', profileText: 'אוהבת סלטים ומנות ירוקות' }),
          p('p4', { foodMode: 'indifferent' }),
        ],
        sharedFilters: { budgetRanges: ['100to200', '200to300'], kosher: 'indifferent', atmospheres: ['lively'] },
      }),
    },
    {
      label: 'חיפה, 2 משתתפים, כשר עם תעודה, משפחתית',
      request: base('m2', {
        areaIds: ['haifa_krayot'],
        participants: [p('p1', { foodTypes: ['meat'] }), p('p2', { foodTypes: ['fish'] })],
        sharedFilters: { budgetRanges: 'indifferent', kosher: 'certified', atmospheres: ['family'] },
      }),
    },
    {
      label: 'ירושלים, 3 משתתפים, טבעוני, ללא חזיר ופירות ים, 100–200 ₪',
      request: base('m3', {
        areaIds: ['jerusalem_area'],
        participants: [p('p1', { foodTypes: ['asian'] }), p('p2', { diet: 'vegan' }), p('p3', { foodTypes: ['mediterranean'] })],
        sharedFilters: { budgetRanges: ['100to200'], kosher: 'at_least_no_pork_seafood', atmospheres: 'indifferent' },
      }),
    },
    {
      label: 'באר שבע, 2 משתתפים, עד 200 ₪',
      request: base('m4', {
        areaIds: ['beer_sheva_negev'],
        participants: [p('p1', { foodTypes: ['meat'] }), p('p2', { foodTypes: ['italian'] })],
        sharedFilters: { budgetRanges: ['upTo100', '100to200'], kosher: 'indifferent', atmospheres: 'indifferent' },
      }),
    },
    {
      label: 'שרון, 5 משתתפים, טקסט חופשי ״פסטה טרייה״, רומנטית/שקטה',
      request: base('m5', {
        areaIds: ['sharon'],
        participants: [
          p('p1', { foodMode: 'specific', foodTypes: ['italian'], outingText: 'פסטה טרייה' }),
          p('p2', { foodTypes: ['sushi'] }),
          p('p3', { diet: 'vegetarian' }),
          p('p4', { foodTypes: ['mediterranean'] }),
          p('p5', { foodMode: 'indifferent' }),
        ],
        sharedFilters: { budgetRanges: 'indifferent', kosher: 'indifferent', atmospheres: ['romantic', 'quiet'] },
      }),
    },
    {
      label: 'זמן נסיעה 30 דק׳ מכתובת ידנית ברחובות, 3 משתתפים',
      request: base('m6', {
        searchMode: 'travel_time',
        areaIds: undefined,
        origin: { kind: 'manual_address', text: 'רחוב הרצל 10, רחובות' },
        maxTravelMinutes: 30,
        participants: [p('p1', { foodTypes: ['fish'] }), p('p2', { foodTypes: ['italian'] }), p('p3', { diet: 'vegetarian' })],
      }),
    },
    {
      label: 'זמן נסיעה 15 דק׳ ממיקום נוכחי בחיפה, 2 משתתפים, 200–300 ₪',
      request: base('m7', {
        searchMode: 'travel_time',
        areaIds: undefined,
        origin: { kind: 'current_location', lat: 32.8156, lng: 34.9892 },
        maxTravelMinutes: 15,
        participants: [p('p1', { foodTypes: ['asian'] }), p('p2', { foodMode: 'indifferent' })],
        sharedFilters: { budgetRanges: ['200to300'], kosher: 'indifferent', atmospheres: 'indifferent' },
      }),
    },
    {
      label: 'גוש דן, 6 משתתפים, כשר עם תעודה, ערב שישי',
      request: base('m8', {
        areaIds: ['gush_dan'],
        visitAt: visitOn(5, '20:30'),
        participants: [
          p('p1', { foodTypes: ['meat'] }),
          p('p2', { foodTypes: ['meat', 'fish'] }),
          p('p3', { diet: 'vegetarian' }),
          p('p4', { foodTypes: ['asian'] }),
          p('p5', { foodMode: 'indifferent' }),
          p('p6', { foodTypes: ['mediterranean'] }),
        ],
        sharedFilters: { budgetRanges: 'indifferent', kosher: 'certified', atmospheres: 'indifferent' },
      }),
    },
    {
      label: 'גליל ועמקים, 2 משתתפים, ״חומוס״, שבת בצהריים, משפחתית',
      request: base('m9', {
        areaIds: ['galilee_valleys'],
        visitAt: visitOn(6, '13:00'),
        participants: [p('p1', { foodTypes: ['meat'] }), p('p2', { foodMode: 'specific', foodTypes: [], outingText: 'חומוס' })],
        sharedFilters: { budgetRanges: 'indifferent', kosher: 'indifferent', atmospheres: ['family'] },
      }),
    },
    {
      label: 'אילת, משתתף אחד, דגים, 200–300 ₪',
      request: base('m10', {
        areaIds: ['eilat'],
        participants: [p('p1', { foodTypes: ['fish'] })],
        sharedFilters: { budgetRanges: ['200to300'], kosher: 'indifferent', atmospheres: 'indifferent' },
      }),
    },
  ].map((s) => {
    // Remove undefined areaIds in travel mode.
    if (s.request.searchMode === 'travel_time') delete s.request.areaIds
    return s
  })
}

// ---------- Run ----------

interface Row {
  label: string
  ms: number
  code: string | null
  results: number
  noDeviation: number
  metrics: ProviderMetrics
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const config = loadConfig({ ...process.env, RESEARCH_PROVIDER: 'openai' })
  const openai = config.openai!
  const provider = createOpenAIProvider(openai, sdkClient(openai.apiKey, config.searchTimeoutMs + 5_000), {
    callTimeoutMs: config.searchTimeoutMs - 3_000,
  })
  const only = arg('--only')
  const dump = arg('--dump')
  const list = samples()
  const chosen = only ? [list[Number(only) - 1]].filter(Boolean) : list
  if (chosen.length === 0) throw new Error('no such outing')

  const rows: Row[] = []
  const dumps: { label: string; metrics: ProviderMetrics; response: RecommendationsResponse | null }[] = []

  const runOne = async (label: string, request: SearchRequest) => {
    let metrics: ProviderMetrics = {}
    const started = Date.now()
    try {
      const res = await runSearch(request, {
        provider,
        searchTimeoutMs: config.searchTimeoutMs,
        maxCandidates: config.maxCandidates,
        ratingPriorWeight: config.ratingPriorWeight,
        now: () => new Date(),
        onMetrics: (m) => (metrics = m),
      })
      const row: Row = {
        label,
        ms: Date.now() - started,
        code: null,
        results: res.restaurants.length,
        noDeviation: res.restaurants.filter((r) => r.matchSummary.mismatchCount === 0).length,
        metrics,
      }
      rows.push(row)
      dumps.push({ label, metrics, response: res })
      out(
        `${(row.ms / 1000).toFixed(1)}s  ${row.results} results (${row.noDeviation} without deviation)  searches ${metrics.searchCalls ?? '-'}  candidates ${metrics.candidatesReturned ?? '-'}/${metrics.candidatesKept ?? '-'}  model ${((metrics.providerMs ?? 0) / 1000).toFixed(1)}s  ${label}`,
      )
      return res
    } catch (e) {
      const code = e instanceof ApiError ? `${e.code}${e.detail ? `:${e.detail}` : ''}` : 'ERROR'
      rows.push({ label, ms: Date.now() - started, code, results: 0, noDeviation: 0, metrics })
      dumps.push({ label, metrics, response: null })
      out(`${((Date.now() - started) / 1000).toFixed(1)}s  ${code}  ${label}`)
      return null
    }
  }

  for (const s of chosen) {
    const first = await runOne(s.label, s.request)
    if (s.more && first && first.restaurants.length > 0) {
      await runOne(`${s.label} — המלצות נוספות`, {
        ...s.request,
        requestId: `${s.request.requestId}-more`,
        excludedRestaurantIds: first.restaurants.map((r) => r.restaurantId),
        excludedRestaurantNames: first.restaurants.map((r) => `${r.name} — ${r.city}`),
      })
    }
  }

  if (dump) {
    mkdirSync(dirname(resolve(dump)), { recursive: true })
    writeFileSync(resolve(dump), JSON.stringify(dumps, null, 2))
    out(`results saved to ${resolve(dump)}`)
  }
  if (!only) writeReport(rows, openai, config.maxCandidates, config.searchTimeoutMs)
}

function writeReport(rows: Row[], openai: NonNullable<ReturnType<typeof loadConfig>['openai']>, maxCandidates: number, timeoutMs: number) {
  const ok = rows.filter((r) => r.code === null)
  const fast = rows.filter((r) => r.code === null && r.ms <= 60_000)
  const withinLimit = rows.filter((r) => r.code === null && r.ms <= 90_000)
  const quality = ok.filter((r) => r.noDeviation >= 3)
  const sorted = [...rows.map((r) => r.ms)].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const s = (ms: number) => (ms / 1000).toFixed(1)
  const lines = [
    '# Milestone 4 — מדידת זמני חיפוש',
    '',
    `נמדד ב־${new Date().toISOString().slice(0, 10)} · מודל ${openai.model} · עד ${maxCandidates} מועמדים · עד ${openai.maxSearchCalls} קריאות חיפוש · search_context_size=${openai.searchContextSize} · max_output_tokens=${openai.maxOutputTokens} · תקרה ${s(timeoutMs)} שנ׳.`,
    '',
    'יציאות בדויות (ללא שמות). הזמן נמדד בשרת, מתחילת החיפוש ועד תשובה מוכנה; זמני נסיעה עדיין אינם מאומתים (Milestone 5).',
    '',
    '## סיכום',
    '',
    `- **${fast.length} מתוך ${rows.length}** חיפושים הסתיימו תוך 60 שניות (היעד: רובם); ${withinLimit.length} מתוך ${rows.length} תוך 90 שניות (התקרה).`,
    `- הצליחו: ${ok.length} מתוך ${rows.length}. חציון זמן: ${s(median)} שנ׳. הארוך ביותר: ${s(sorted[sorted.length - 1])} שנ׳.`,
    `- איכות (לפחות 3 מסעדות ללא חריגה ידועה): ${quality.length} מתוך ${ok.length} החיפושים שהצליחו.`,
    '',
    '## פירוט',
    '',
    '| # | יציאה | זמן (שנ׳) | עד 60 שנ׳ | תוצאה | תוצאות | ללא חריגה | קריאות חיפוש | מועמדים (הוחזרו/נשארו) | tokens (קלט/פלט) |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r, i) => {
      const m = r.metrics
      return `| ${i + 1} | ${r.label} | ${s(r.ms)} | ${r.code === null && r.ms <= 60_000 ? '✓' : '✗'} | ${r.code ?? 'תקין'} | ${r.results} | ${r.noDeviation} | ${m.searchCalls ?? '–'} | ${m.candidatesReturned ?? '–'}/${m.candidatesKept ?? '–'} | ${m.inputTokens ?? '–'}/${m.outputTokens ?? '–'} |`
    }),
    '',
  ]
  const file = resolve(import.meta.dirname, '../../../../reports/milestone-4-search-times.md')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, lines.join('\n'))
  out(`report written to ${file}`)
}

main().catch((e) => {
  if (e instanceof ConfigError) out(`Configuration error: ${e.message}`)
  else out(`Failed: ${(e as Error).message}`)
  process.exitCode = 1
})

