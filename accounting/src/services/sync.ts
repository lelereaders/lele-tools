import { db } from './db'
import { fetchAllTransactions, fetchTransactionsSince, appendTransaction } from './gasApi'
import type { Transaction } from '../types'

const LAST_SYNC_KEY = 'lele_last_sync'
const MAX_RETRIES = 5

export async function pullTransactions(): Promise<void> {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY)
  const transactions: Transaction[] = lastSync
    ? await fetchTransactionsSince(lastSync)
    : await fetchAllTransactions()
  if (transactions.length > 0) {
    await db.transactions.bulkPut(transactions)
  }
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
}

export async function flushSyncQueue(): Promise<void> {
  const items = await db.syncQueue.toArray()
  for (const item of items) {
    try {
      const ok = await appendTransaction(item.payload)
      if (!ok) throw new Error('GAS returned failure')
      await db.transactions.update(item.payload.id, { synced: true })
      await db.syncQueue.delete(item.id!)
    } catch {
      if (item.retries >= MAX_RETRIES) {
        await db.syncQueue.delete(item.id!)
      } else {
        await db.syncQueue.update(item.id!, { retries: item.retries + 1 })
      }
    }
  }
}

export async function addToQueue(t: Transaction): Promise<void> {
  await db.syncQueue.add({ payload: t, retries: 0 })
}

export function startPolling(intervalMs = 5 * 60 * 1000): () => void {
  const id = setInterval(async () => {
    try {
      await pullTransactions()
      await flushSyncQueue()
    } catch { /* ignore — offline */ }
  }, intervalMs)
  return () => clearInterval(id)
}
