// Personal and group explanations built from the evaluation results.
// Milestone 3: plain templates. Milestone 4: the model writes them, and they
// are checked against these facts. Never contains names (the server has none).
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

export function explain(e: Evaluation, request: SearchRequest): Explanation {
  const perParticipantReasons = request.participants.map((p) => {
    const own = e.parameters.filter((r) => r.token === p.token)
    const text = own.length > 0 ? own.map(sentence).join('. ') : 'לא הוגדרה העדפת אוכל ליציאה הזו'
    return { token: p.token, text }
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
  return { perParticipantReasons, groupReason: parts.join('. ') }
}
