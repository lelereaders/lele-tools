import Dexie, { type Table } from 'dexie'
import type { Transaction, Category, Account, SyncQueueItem } from '../types'

class LeleDB extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  accounts!: Table<Account, string>
  syncQueue!: Table<SyncQueueItem, number>

  constructor() {
    super('lele-accounting')
    this.version(1).stores({
      transactions: 'id, date, category, currency, from_account, to_account, source'
    })
    this.version(2).stores({
      transactions: 'id, date, category, currency, from_account, to_account, source, synced',
      categories: 'name, type',
      accounts: 'name, type',
      syncQueue: '++id'
    })
  }
}

export const db = new LeleDB()

export async function getAllTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').reverse().toArray()
}

export async function addTransaction(t: Transaction): Promise<void> {
  await db.transactions.put(t)
}

export async function addTransactionsBulk(ts: Transaction[]): Promise<void> {
  await db.transactions.bulkPut(ts)
}

export async function getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  const end = `${year}-${pad(month)}-31`
  const results = await db.transactions.where('date').between(start, end, true, true).toArray()
  return results.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getUnsyncedTransactions(): Promise<Transaction[]> {
  const all = await db.transactions.toArray()
  return all.filter(t => !t.synced)
}

export async function updateTransactionSync(id: string, synced: boolean): Promise<void> {
  await db.transactions.update(id, { synced })
}

export interface SearchParams {
  query?: string
  category?: string
  account?: string
  dateFrom?: string
  dateTo?: string
}

export async function searchTransactions(params: SearchParams): Promise<Transaction[]> {
  const all = await db.transactions.orderBy('date').reverse().toArray()

  return all.filter(t => {
    if (params.query) {
      const q = params.query.toLowerCase()
      if (!t.description.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) {
        return false
      }
    }
    if (params.category && t.category !== params.category) return false
    if (params.account && t.from_account !== params.account && t.to_account !== params.account) return false
    if (params.dateFrom && t.date < params.dateFrom) return false
    if (params.dateTo && t.date > params.dateTo) return false
    return true
  })
}
