import { createDb } from './db'
import { createPersonsRepository } from './personsRepository'

export const db = createDb()
export const personsRepository = createPersonsRepository(db)
