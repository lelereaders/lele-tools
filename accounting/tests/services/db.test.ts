import { describe, it, expect, beforeEach } from 'vitest'
import {
  db,
  addTransaction,
  getAllTransactions,
  getTransactionsByMonth,
  getUnsyncedTransactions,
  updateTransactionSync,
  searchTransactions
} from '../../src/services/db'
import type { Transaction } from '../../src/types'

const makeT = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'T0001',
  date: '2026-01-02',
  description: '普捷印刷',
  category: 'books 普捷-印刷費用',
  currency: 'TWD',
  amount: -320030,
  from_account: '上海儲蓄銀行',
  to_account: '',
  notes: '',
  twd_amount: -320030,
  created_at: '2026-01-02T00:00:00.000Z',
  source: 'excel_import',
  synced: true,
  ...overrides
})

beforeEach(async () => {
  await db.transactions.clear()
})

describe('addTransaction', () => {
  it('stores a transaction and retrieves it', async () => {
    await addTransaction(makeT())
    const all = await getAllTransactions()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('T0001')
  })
})

describe('getTransactionsByMonth', () => {
  it('returns only transactions in the given month', async () => {
    await addTransaction(makeT({ id: 'T0001', date: '2026-01-02' }))
    await addTransaction(makeT({ id: 'T0002', date: '2026-02-05' }))
    const jan = await getTransactionsByMonth(2026, 1)
    expect(jan).toHaveLength(1)
    expect(jan[0].id).toBe('T0001')
  })
})

describe('getUnsyncedTransactions', () => {
  it('returns only unsynced transactions', async () => {
    await addTransaction(makeT({ id: 'T0001', synced: true }))
    await addTransaction(makeT({ id: 'T0002', synced: false }))
    const unsynced = await getUnsyncedTransactions()
    expect(unsynced).toHaveLength(1)
    expect(unsynced[0].id).toBe('T0002')
  })
})

describe('updateTransactionSync', () => {
  it('marks a transaction as synced', async () => {
    await addTransaction(makeT({ id: 'T0001', synced: false }))
    await updateTransactionSync('T0001', true)
    const all = await getAllTransactions()
    expect(all[0].synced).toBe(true)
  })
})

describe('searchTransactions', () => {
  it('filters by description substring (case-insensitive)', async () => {
    await addTransaction(makeT({ id: 'T0001', description: '普捷印刷', category: '運費' }))
    await addTransaction(makeT({ id: 'T0002', description: '薪資費用', category: '薪資費用' }))
    const results = await searchTransactions({ query: '印刷' })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('T0001')
  })

  it('filters by category', async () => {
    await addTransaction(makeT({ id: 'T0001', category: '薪資費用' }))
    await addTransaction(makeT({ id: 'T0002', category: '運費' }))
    const results = await searchTransactions({ category: '薪資費用' })
    expect(results).toHaveLength(1)
  })

  it('filters by date range', async () => {
    await addTransaction(makeT({ id: 'T0001', date: '2026-01-02' }))
    await addTransaction(makeT({ id: 'T0002', date: '2026-03-15' }))
    const results = await searchTransactions({ dateFrom: '2026-02-01', dateTo: '2026-12-31' })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('T0002')
  })
})
