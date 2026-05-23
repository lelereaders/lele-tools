import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '../../src/services/db'
import { pullTransactions, flushSyncQueue, addToQueue } from '../../src/services/sync'
import type { Transaction } from '../../src/types'

vi.mock('../../src/services/gasApi', () => ({
  fetchAllTransactions: vi.fn(),
  fetchTransactionsSince: vi.fn(),
  appendTransaction: vi.fn()
}))

import * as gasApi from '../../src/services/gasApi'

const sample: Transaction = {
  id: 'T0001', date: '2026-01-02', description: '普捷印刷',
  category: 'books', currency: 'TWD', amount: -320030,
  from_account: '上海儲蓄銀行', to_account: '', notes: '',
  twd_amount: -320030, created_at: '2026-01-02T00:00:00.000Z',
  source: 'excel_import', synced: true
}

beforeEach(async () => {
  await db.transactions.clear()
  await db.syncQueue.clear()
  vi.clearAllMocks()
  localStorage.clear()
})

describe('pullTransactions', () => {
  it('fetches all when no lastSync stored, writes to IndexedDB', async () => {
    vi.mocked(gasApi.fetchAllTransactions).mockResolvedValueOnce([sample])
    await pullTransactions()
    const stored = await db.transactions.get('T0001')
    expect(stored?.description).toBe('普捷印刷')
  })

  it('fetches since lastSync when stored', async () => {
    localStorage.setItem('lele_last_sync', '2026-01-01T00:00:00.000Z')
    vi.mocked(gasApi.fetchTransactionsSince).mockResolvedValueOnce([sample])
    await pullTransactions()
    expect(gasApi.fetchTransactionsSince).toHaveBeenCalledWith('2026-01-01T00:00:00.000Z')
  })
})

describe('flushSyncQueue', () => {
  it('pushes queued transactions and marks synced, clears queue', async () => {
    const unsynced = { ...sample, id: 'T0002', synced: false, source: 'app' as const }
    await db.transactions.put(unsynced)
    await db.syncQueue.add({ payload: unsynced, retries: 0 })
    vi.mocked(gasApi.appendTransaction).mockResolvedValueOnce(true)

    await flushSyncQueue()

    expect(gasApi.appendTransaction).toHaveBeenCalledWith(unsynced)
    const updated = await db.transactions.get('T0002')
    expect(updated?.synced).toBe(true)
    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(0)
  })

  it('increments retries on push failure, leaves queue item', async () => {
    const unsynced = { ...sample, id: 'T0003', synced: false, source: 'app' as const }
    await db.transactions.put(unsynced)
    const qid = await db.syncQueue.add({ payload: unsynced, retries: 0 })
    vi.mocked(gasApi.appendTransaction).mockRejectedValueOnce(new Error('network'))

    await flushSyncQueue()

    const item = await db.syncQueue.get(qid)
    expect(item?.retries).toBe(1)
  })

  it('increments retries when GAS returns false', async () => {
    const unsynced = { ...sample, id: 'T0004', synced: false, source: 'app' as const }
    await db.transactions.put(unsynced)
    const qid = await db.syncQueue.add({ payload: unsynced, retries: 0 })
    vi.mocked(gasApi.appendTransaction).mockResolvedValueOnce(false)

    await flushSyncQueue()

    const item = await db.syncQueue.get(qid)
    expect(item?.retries).toBe(1)
  })
})

describe('addToQueue', () => {
  it('adds transaction to sync queue', async () => {
    await addToQueue(sample)
    const items = await db.syncQueue.toArray()
    expect(items).toHaveLength(1)
    expect(items[0].payload.id).toBe('T0001')
    expect(items[0].retries).toBe(0)
  })
})
