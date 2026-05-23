import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../services/db'
import { fetchMeta } from '../services/gasApi'
import type { Category, Account } from '../types'

export const useMetaStore = defineStore('meta', () => {
  const categories = ref<Category[]>([])
  const accounts = ref<Account[]>([])

  async function initialize(): Promise<void> {
    const cached = await db.categories.toArray()
    if (cached.length > 0) {
      categories.value = cached
      accounts.value = await db.accounts.toArray()
      return
    }
    const remote = await fetchMeta()
    categories.value = remote.categories
    accounts.value = remote.accounts
    await db.categories.bulkPut(remote.categories)
    await db.accounts.bulkPut(remote.accounts)
  }

  const expenseCategories = () => categories.value.filter(c => c.type === '費用' || c.type === '成本')
  const incomeCategories = () => categories.value.filter(c => c.type === '收入')
  const assetAccounts = () => accounts.value.filter(a => a.type === '資產')

  return { categories, accounts, initialize, expenseCategories, incomeCategories, assetAccounts }
})
