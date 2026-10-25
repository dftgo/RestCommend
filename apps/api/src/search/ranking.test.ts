import { describe, expect, it } from 'vitest'
import { adjustedRating, rank } from './ranker'
import { evaluation } from './testUtils'

const ids = (list: { candidate: { restaurantId: string } }[]) => list.map((e) => e.candidate.restaurantId)

describe('ranker', () => {
  it('puts a restaurant with no mismatch and a low rating before one with a mismatch and a high rating', () => {
    const ranked = rank([evaluation('high-rated-mismatch', 1, 0, [4.9, 5000]), evaluation('low-rated-ok', 0, 0, [3.1, 40])], 5, 50)
    expect(ids(ranked)).toEqual(['low-rated-ok', 'high-rated-mismatch'])
  })

  it('puts one mismatch before two, whatever the ratings', () => {
    const ranked = rank([evaluation('two', 2, 0, [5, 9000]), evaluation('one', 1, 0, [2.5, 10])], 5, 50)
    expect(ids(ranked)).toEqual(['one', 'two'])
  })

  it('does not count unknown as a mismatch, but ranks it after a fully verified one', () => {
    const ranked = rank(
      [evaluation('mismatch', 1, 0, [5, 9000]), evaluation('unknown', 0, 1, [5, 9000]), evaluation('verified', 0, 0, [3, 10])],
      5,
      50,
    )
    expect(ids(ranked)).toEqual(['verified', 'unknown', 'mismatch'])
  })

  it('has no partial match in the top five when five full matches exist', () => {
    const list = [
      ...Array.from({ length: 3 }, (_, i) => evaluation(`partial-${i}`, 1, 0, [5, 10000])),
      ...Array.from({ length: 7 }, (_, i) => evaluation(`ok-${i}`, 0, i % 2, [3, 20])),
    ]
    const top = rank(list, 5, 50)
    expect(top).toHaveLength(5)
    expect(top.every((e) => e.mismatchCount === 0)).toBe(true)
  })

  it('fills with partial matches only when fewer than five full matches exist', () => {
    const list = [evaluation('ok', 0, 0, [3, 20]), evaluation('m2', 2, 0, [5, 100]), evaluation('m1', 1, 0, [4, 100])]
    expect(ids(rank(list, 5, 50))).toEqual(['ok', 'm1', 'm2'])
  })

  it('puts a small gap before a large gap with equal counts', () => {
    const ranked = rank([evaluation('big', 1, 0, [5, 9000], 3), evaluation('small', 1, 0, [3, 10], 0.5)], 5, 50)
    expect(ids(ranked)).toEqual(['small', 'big'])
  })

  it('uses web reputation only between similar matches, and puts missing ratings after rated ones', () => {
    const ranked = rank([evaluation('none', 0, 0, null), evaluation('low', 0, 0, [3.5, 300]), evaluation('high', 0, 0, [4.6, 300])], 5, 50)
    expect(ids(ranked)).toEqual(['high', 'low', 'none'])
  })

  it('weighs few reviews toward the pool mean', () => {
    // 5.0 from 2 reviews should not beat 4.6 from 2000 reviews.
    const pool = [
      evaluation('few', 0, 0, [5, 2]),
      evaluation('many', 0, 0, [4.6, 2000]),
      evaluation('avg-1', 0, 0, [4, 500]),
      evaluation('avg-2', 0, 0, [4, 500]),
    ]
    expect(ids(rank(pool, 5, 50)).slice(0, 2)).toEqual(['many', 'few'])
    expect(adjustedRating(5, 0, 4, 50)).toBe(4)
  })

  it('is deterministic', () => {
    const list = Array.from({ length: 8 }, (_, i) => evaluation(`r${i}`, i % 3, i % 2, [4, 100]))
    expect(ids(rank(list, 5, 50))).toEqual(ids(rank([...list].reverse(), 5, 50)))
  })
})
