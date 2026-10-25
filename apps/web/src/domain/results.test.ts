import { describe, expect, it } from 'vitest'
import { countLine, fewerMessage, linkLabel, matchSummaryText, participantName } from './results'

describe('results wording', () => {
  it('summarizes the match per DESIGN 1.6', () => {
    expect(matchSummaryText({ mismatchCount: 0, unknownCount: 0 })).toBe('ללא חריגות מההעדפות שנבחרו')
    expect(matchSummaryText({ mismatchCount: 0, unknownCount: 2 })).toBe('ללא חריגות ידועות · 2 פרטים לא אומתו')
    expect(matchSummaryText({ mismatchCount: 1, unknownCount: 3 })).toBe('חריגה אחת מההעדפות')
    expect(matchSummaryText({ mismatchCount: 2, unknownCount: 0 })).toBe('2 חריגות מההעדפות')
  })

  it('labels links by kind', () => {
    expect(linkLabel({ url: 'https://a.example', kind: 'official_site' })).toBe('לאתר המסעדה')
    expect(linkLabel({ url: 'https://a.example', kind: 'alternative' })).toBe('לפרטים על המסעדה')
    expect(linkLabel(null)).toBe('לא נמצא קישור למסעדה')
  })

  it('counts results', () => {
    expect(countLine(5)).toBe('5 מסעדות · לפי התאמה לקבוצה, ואז דירוגים ברשת')
    expect(fewerMessage(3)).toBe('נמצאו 3 מסעדות על בסיס המידע הזמין')
  })

  it('maps tokens back to names on the device only', () => {
    const names = new Map([['id-1', 'Itay איתי']])
    expect(participantName('p1', { p1: 'id-1' }, names)).toBe('Itay איתי')
    expect(participantName('p2', { p1: 'id-1' }, names)).toBe('משתתף')
  })
})
