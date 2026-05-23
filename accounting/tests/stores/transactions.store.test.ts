import { setActivePinia, createPinia } from 'pinia'
import { useTransactionsStore } from '../../src/stores/transactions'
import { db } from '../../src/services/db'
import type { Transaction } from '../../src/types'

vi.mock('../../src/services/sync', () => ({
  pullTransactions: vi.fn().mockResolvedValue(undefined),
  flushSyncQueue: vi.fn().mockResolvedValue(undefined),
  addToQueue: vi.fn().mockResolvedValue(undefined),
  startPolling: vi.fn(() => () => {})
}))

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.transactions.clear()
  await db.syncQueue.clear()
})

describe('useTransactionsStore', () => {
  it('initialize loads transactions from IndexedDB', async () => {
    const t: Transaction = {
      id: 'T0001', date: '2026-01-02', description: '普捷印刷',
      category: 'books', currency: 'TWD', amount: -320030,
      from_account: '上海儲蓄銀行', to_account: '', notes: '',
      twd_amount: -320030, created_at: '2026-01-02T00:00:00.000Z',
      source: 'excel_import', synced: true
    }
    await db.transactions.put(t)
    const store = useTransactionsStore()
    await store.initialize()
    expect(store.transactions).toHaveLength(1)
    expect(store.transactions[0].id).toBe('T0001')
  })

  it('addTransaction saves to IndexedDB with source:app and synced:false', async () => {
    const store = useTransactionsStore()
    await store.initialize()
    await store.addTransaction({
      date: '2026-05-23', description: '測試支出',
      category: '薪資費用', currency: 'TWD', amount: -5000,
      from_account: '上海儲蓄銀行', to_account: '', notes: '',
      twd_amount: -5000
    })
    expect(store.transactions).toHaveLength(1)
    expect(store.transactions[0].source).toBe('app')
    expect(store.transactions[0].synced).toBe(false)
    const inDB = await db.transactions.toArray()
    expect(inDB).toHaveLength(1)
  })

  it('filteredByCategory returns all when category is empty string', async () => {
    const store = useTransactionsStore()
    await store.initialize()
    await store.addTransaction({
      date: '2026-05-23', description: 'A', category: '費用',
      currency: 'TWD', amount: -100, from_account: '零用金',
      to_account: '', notes: '', twd_amount: -100
    })
    expect(store.filteredByCategory('')).toHaveLength(1)
  })

  it('monthlySummary computes income and expense for a given month', async () => {
    const store = useTransactionsStore()
    await store.initialize()
    const today = new Date().toISOString().slice(0, 10)
    await store.addTransaction({
      date: today, description: 'income', category: '訂單收入',
      currency: 'TWD', amount: 10000, from_account: '', to_account: 'PAYPAL',
      notes: '', twd_amount: 10000
    })
    await store.addTransaction({
      date: today, description: 'expense', category: '薪資費用',
      currency: 'TWD', amount: -3000, from_account: '上海儲蓄銀行', to_account: '',
      notes: '', twd_amount: -3000
    })
    expect(store.monthlySummary.income).toBe(10000)
    expect(store.monthlySummary.expense).toBe(3000)
    expect(store.monthlySummary.net).toBe(7000)
  })

  it('updateTransaction is blocked for excel_import records', async () => {
    const t: Transaction = {
      id: 'T0001', date: '2026-01-02', description: 'original',
      category: 'books', currency: 'TWD', amount: -1000,
      from_account: '銀行', to_account: '', notes: '',
      twd_amount: -1000, created_at: '2026-01-02T00:00:00.000Z',
      source: 'excel_import', synced: true
    }
    await db.transactions.put(t)
    const store = useTransactionsStore()
    await store.initialize()
    await store.updateTransaction('T0001', { description: 'changed' })
    expect(store.transactions[0].description).toBe('original')
  })
})
