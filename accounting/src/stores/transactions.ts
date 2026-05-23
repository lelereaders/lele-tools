import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../services/db'
import { pullTransactions, addToQueue, startPolling } from '../services/sync'
import { nextId } from '../types'
import type { Transaction } from '../types'

export interface NewTransactionInput {
  date: string
  description: string
  category: string
  currency: 'TWD' | 'USD'
  amount: number
  from_account: string
  to_account: string
  notes: string
  twd_amount: number
}

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const isLoading = ref(false)
  const isSyncing = ref(false)
  let stopPolling: (() => void) | null = null

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      transactions.value = await db.transactions.orderBy('date').reverse().toArray()
      isSyncing.value = true
      try {
        await pullTransactions()
        transactions.value = await db.transactions.orderBy('date').reverse().toArray()
      } finally {
        isSyncing.value = false
      }
    } finally {
      isLoading.value = false
      stopPolling = startPolling()
    }
  }

  function dispose(): void {
    stopPolling?.()
  }

  async function addTransaction(input: NewTransactionInput): Promise<void> {
    const t: Transaction = {
      ...input,
      id: nextId(),
      created_at: new Date().toISOString(),
      source: 'app',
      synced: false
    }
    await db.transactions.put(t)
    transactions.value = [t, ...transactions.value]
    await addToQueue(t)
  }

  async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    const existing = transactions.value.find(t => t.id === id)
    if (!existing || existing.source === 'excel_import') return
    const updated = { ...existing, ...updates, synced: false }
    await db.transactions.put(updated)
    const idx = transactions.value.findIndex(t => t.id === id)
    if (idx !== -1) transactions.value[idx] = updated
    await addToQueue(updated)
  }

  const monthlySummary = computed(() => {
    const now = new Date()
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthly = transactions.value.filter(t => t.date.startsWith(prefix))
    const income = monthly.filter(t => t.amount > 0).reduce((s, t) => s + t.twd_amount, 0)
    const expense = monthly.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.twd_amount), 0)
    return { income, expense, net: income - expense }
  })

  function filteredByCategory(category: string): Transaction[] {
    if (!category) return transactions.value
    if (category === '收入') return transactions.value.filter(t => t.amount > 0)
    if (category === '費用') return transactions.value.filter(t => t.amount < 0 && !isCost(t))
    if (category === '成本') return transactions.value.filter(t => isCost(t))
    return transactions.value.filter(t => t.category === category)
  }

  return {
    transactions, isLoading, isSyncing,
    initialize, dispose, addTransaction, updateTransaction,
    monthlySummary, filteredByCategory
  }
})

function isCost(t: Transaction): boolean {
  const costKeywords = ['books', 'website', 'audio pen', '運費', 'packing', 'royalty', 'Ads', '網紅', 'bag', '會員']
  return t.amount < 0 && costKeywords.some(k => t.category.toLowerCase().includes(k.toLowerCase()))
}
