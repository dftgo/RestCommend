// Personal and group explanations. The facts and match statuses always come
// from the evaluation (templates). Live data adds the model's short sourced
// description, and a personal note only when the code confirmed that
// participant's food preference as a match — so model text can never claim a
// fit the evaluation did not find. Never contains names (the server has none).
import { foodTypeLabel, type ParameterResult, type SearchRequest } from '@restcommend/contracts'
import type { Evaluation } from './matchEvaluator'

export interface Explanation {
  perParticipantReasons: { token: string; text: string }[]
  groupReason: string
}

function sentence(r: ParameterResult): string {
  if (r.status === 'mismatch') return `לא מתאים: ${r.reason}`
  return r.reason
}

const MAX_TEXT = 1000

function joinSentences(parts: string[]): string {
  const text = parts
    .map((p) => p.trim().replace(/[.。]+$/, ''))
    .filter(Boolean)
    .join('. ')
  return text.length <= MAX_TEXT ? text : `${text.slice(0, MAX_TEXT - 1).trimEnd()}…`
}

export function explain(e: Evaluation, request: SearchRequest): Explanation {
  const notes = e.candidate.participantNotes ?? {}
  const perParticipantReasons = request.participants.map((p) => {
    const own = e.parameters.filter((r) => r.token === p.token)
    const parts = own.length > 0 ? own.map(sentence) : ['לא הוגדרה העדפת אוכל ליציאה הזו']
    const foodMatched = own.some((r) => r.param === 'food' && r.status === 'match')
    const note = notes[p.token as keyof typeof notes]
    if (note && foodMatched) parts.push(note)
    return { token: p.token, text: joinSentences(parts) }
  })

  const parts: string[] = []
  if (e.mismatchCount === 0 && e.unknownCount === 0) parts.push('מתאימה לכל ההעדפות שנבחרו')
  else if (e.mismatchCount === 0) parts.push('אין חריגה ידועה מההעדפות שנבחרו')
  else parts.push(`התאמה חלקית: ${e.mismatchCount === 1 ? 'חריגה אחת' : `${e.mismatchCount} חריגות`} מההעדפות`)

  const cuisines = e.candidate.cuisines?.map(foodTypeLabel).filter(Boolean)
  if (cuisines && cuisines.length > 0) parts.push(`מטבח: ${cuisines.join(', ')}`)

  const food = e.parameters.filter((r) => r.param === 'food')
  if (food.length > 0) {
    const ok = food.filter((r) => r.status === 'match').length
    parts.push(`מתאימה להעדפת האוכל של ${ok} מתוך ${food.length} משתתפים`)
  }
  for (const r of e.parameters) {
    if (r.status === 'match' && (r.param === 'budget' || r.param === 'kosher' || r.param === 'atmosphere')) {
      parts.push(r.reason)
    }
  }
  if (e.candidate.description) parts.push(e.candidate.description)
  return { perParticipantReasons, groupReason: joinSentences(parts) }
}
