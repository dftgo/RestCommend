import Dexie, { type EntityTable } from 'dexie'
import type { Person } from '../domain/person'

export type AppDb = Dexie & {
  persons: EntityTable<Person, 'id'>
}

export function createDb(name = 'restcommend'): AppDb {
  const db = new Dexie(name) as AppDb
  // Schema versions: add a new db.version(n) for every structural change.
  db.version(1).stores({
    persons: 'id, &nameKey, createdAt',
  })
  return db
}
