import { describe, expect, it } from 'vitest'
import { MAX_PARTICIPANTS, orderSelection, pruneSelection, toggleParticipant } from './outingSelection'

describe('participant selection', () => {
  it('selects and deselects', () => {
    let sel = toggleParticipant([], 'a').selected
    sel = toggleParticipant(sel, 'b').selected
    expect(sel).toEqual(['a', 'b'])
    expect(toggleParticipant(sel, 'a').selected).toEqual(['b'])
  })

  it('allows 10 participants and blocks the 11th', () => {
    let sel: string[] = []
    for (let i = 1; i <= MAX_PARTICIPANTS; i++) {
      const r = toggleParticipant(sel, `p${i}`)
      expect(r.limitReached).toBe(false)
      sel = r.selected
    }
    expect(sel).toHaveLength(10)
    const blocked = toggleParticipant(sel, 'p11')
    expect(blocked.limitReached).toBe(true)
    expect(blocked.selected).toEqual(sel)
  })

  it('still allows deselecting at the limit', () => {
    const full = Array.from({ length: 10 }, (_, i) => `p${i}`)
    const r = toggleParticipant(full, 'p3')
    expect(r.limitReached).toBe(false)
    expect(r.selected).toHaveLength(9)
  })

  it('drops deleted profiles from the selection', () => {
    expect(pruneSelection(['a', 'b', 'c'], ['a', 'c'])).toEqual(['a', 'c'])
    const same = ['a']
    expect(pruneSelection(same, ['a', 'b'])).toBe(same)
  })

  it('orders the selection like the profile list', () => {
    expect(orderSelection(['c', 'a'], ['a', 'b', 'c'])).toEqual(['a', 'c'])
  })

  it('works on ids only and never touches profile objects', () => {
    const profiles = [{ id: 'a', displayName: 'דנה' }]
    const snapshot = JSON.stringify(profiles)
    toggleParticipant([], profiles[0].id)
    expect(JSON.stringify(profiles)).toBe(snapshot)
  })
})
