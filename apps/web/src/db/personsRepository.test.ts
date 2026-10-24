import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDb } from './db'
import { createPersonsRepository, DuplicateNameError, EmptyNameError, type PersonsRepository } from './personsRepository'
import { EMPTY_DRAFT, type PersonDraft } from '../domain/person'

let repo: PersonsRepository
let dbCounter = 0

const draft = (over: Partial<PersonDraft>): PersonDraft => ({ ...EMPTY_DRAFT, ...over })

beforeEach(() => {
  // A fresh database per test.
  repo = createPersonsRepository(createDb(`test-${++dbCounter}`))
})

describe('personsRepository', () => {
  it('creates and reads back a profile with all its preferences', async () => {
    const created = await repo.create(
      draft({ displayName: ' דנה ', foodTypes: ['italian', 'sushi'], foodText: 'אוהבת פסטה', diet: 'vegetarian' }),
    )
    const loaded = await repo.get(created.id)
    expect(loaded).toMatchObject({
      displayName: 'דנה',
      foodTypes: ['italian', 'sushi'],
      foodText: 'אוהבת פסטה',
      diet: 'vegetarian',
    })
  })

  it('stores only the defined fields (no allergy data or extras)', async () => {
    const created = await repo.create(draft({ displayName: 'Itai' }))
    const keys = Object.keys((await repo.get(created.id))!).sort()
    expect(keys).toEqual(['createdAt', 'diet', 'displayName', 'foodText', 'foodTypes', 'id', 'nameKey', 'updatedAt'])
  })

  it('lists profiles in the order they were added', async () => {
    await repo.create(draft({ displayName: 'א' }))
    await new Promise((r) => setTimeout(r, 2))
    await repo.create(draft({ displayName: 'ב' }))
    expect((await repo.list()).map((p) => p.displayName)).toEqual(['א', 'ב'])
  })

  it('editing updates the same profile and never adds another', async () => {
    const p = await repo.create(draft({ displayName: 'נועה', foodTypes: ['fish'] }))
    await repo.update(p.id, draft({ displayName: 'נועה ל.', foodTypes: ['sushi'], diet: 'vegan' }))
    const all = await repo.list()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ id: p.id, displayName: 'נועה ל.', foodTypes: ['sushi'], diet: 'vegan' })
  })

  it('allows saving an edited profile that keeps its own name', async () => {
    const p = await repo.create(draft({ displayName: 'יואב' }))
    await expect(repo.update(p.id, draft({ displayName: 'יואב', foodTypes: ['meat'] }))).resolves.toBeTruthy()
  })

  it('rejects an empty name on create and on edit', async () => {
    await expect(repo.create(draft({ displayName: '   ' }))).rejects.toBeInstanceOf(EmptyNameError)
    const p = await repo.create(draft({ displayName: 'דנה' }))
    await expect(repo.update(p.id, draft({ displayName: '' }))).rejects.toBeInstanceOf(EmptyNameError)
    expect((await repo.get(p.id))!.displayName).toBe('דנה')
  })

  it('rejects a duplicate name, ignoring edge spaces and letter case', async () => {
    await repo.create(draft({ displayName: 'Dana' }))
    await expect(repo.create(draft({ displayName: ' dana ' }))).rejects.toBeInstanceOf(DuplicateNameError)
    expect(await repo.list()).toHaveLength(1)
  })

  it('rejects renaming a profile to another profile\'s name', async () => {
    await repo.create(draft({ displayName: 'דנה' }))
    const other = await repo.create(draft({ displayName: 'איתי' }))
    await expect(repo.update(other.id, draft({ displayName: 'דנה ' }))).rejects.toBeInstanceOf(DuplicateNameError)
    expect((await repo.get(other.id))!.displayName).toBe('איתי')
  })

  it('deletes a profile permanently', async () => {
    const p = await repo.create(draft({ displayName: 'דנה' }))
    await repo.create(draft({ displayName: 'איתי' }))
    await repo.remove(p.id)
    expect(await repo.get(p.id)).toBeUndefined()
    expect((await repo.list()).map((x) => x.displayName)).toEqual(['איתי'])
  })

  it('allows reusing the name of a deleted profile', async () => {
    const p = await repo.create(draft({ displayName: 'דנה' }))
    await repo.remove(p.id)
    await expect(repo.create(draft({ displayName: 'דנה' }))).resolves.toBeTruthy()
  })
})
