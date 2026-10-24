import Dexie from 'dexie'
import type { AppDb } from './db'
import { isNameEmpty, nameKeyOf, sanitizeDraft, type Person, type PersonDraft } from '../domain/person'

export class EmptyNameError extends Error {
  constructor() {
    super('EMPTY_NAME')
  }
}

export class DuplicateNameError extends Error {
  constructor() {
    super('DUPLICATE_NAME')
  }
}

export class PersonNotFoundError extends Error {
  constructor() {
    super('PERSON_NOT_FOUND')
  }
}

function isConstraintError(e: unknown): boolean {
  return e instanceof Dexie.ConstraintError || (e instanceof Error && e.name === 'ConstraintError')
}

export function createPersonsRepository(db: AppDb) {
  async function assertUniqueName(nameKey: string, exceptId?: string) {
    const existing = await db.persons.where('nameKey').equals(nameKey).first()
    if (existing && existing.id !== exceptId) throw new DuplicateNameError()
  }

  return {
    list(): Promise<Person[]> {
      return db.persons.orderBy('createdAt').toArray()
    },

    get(id: string): Promise<Person | undefined> {
      return db.persons.get(id)
    },

    async create(draft: PersonDraft): Promise<Person> {
      const clean = sanitizeDraft(draft)
      if (isNameEmpty(clean.displayName)) throw new EmptyNameError()
      const nameKey = nameKeyOf(clean.displayName)
      const now = Date.now()
      const person: Person = { id: crypto.randomUUID(), nameKey, ...clean, createdAt: now, updatedAt: now }
      try {
        await db.transaction('rw', db.persons, async () => {
          await assertUniqueName(nameKey)
          await db.persons.add(person)
        })
      } catch (e) {
        if (isConstraintError(e)) throw new DuplicateNameError()
        throw e
      }
      return person
    },

    async update(id: string, draft: PersonDraft): Promise<Person> {
      const clean = sanitizeDraft(draft)
      if (isNameEmpty(clean.displayName)) throw new EmptyNameError()
      const nameKey = nameKeyOf(clean.displayName)
      try {
        return await db.transaction('rw', db.persons, async () => {
          const current = await db.persons.get(id)
          if (!current) throw new PersonNotFoundError()
          await assertUniqueName(nameKey, id)
          const updated: Person = { ...current, ...clean, nameKey, updatedAt: Date.now() }
          await db.persons.put(updated)
          return updated
        })
      } catch (e) {
        if (isConstraintError(e)) throw new DuplicateNameError()
        throw e
      }
    },

    remove(id: string): Promise<void> {
      return db.persons.delete(id)
    },
  }
}

export type PersonsRepository = ReturnType<typeof createPersonsRepository>
