import { setActivePinia, createPinia } from 'pinia'
import { useMetaStore } from '../../src/stores/meta'
import { db } from '../../src/services/db'

vi.mock('../../src/services/gasApi', () => ({
  fetchMeta: vi.fn().mockResolvedValue({
    categories: [
      { name: '薪資費用', type: '費用' },
      { name: '訂單收入', type: '收入' }
    ],
    accounts: [{ name: '零用金', type: '資產' }]
  })
}))

beforeEach(async () => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  await db.categories.clear()
  await db.accounts.clear()
})

describe('useMetaStore', () => {
  it('fetches from GAS when DB is empty and caches to IndexedDB', async () => {
    const store = useMetaStore()
    await store.initialize()
    expect(store.categories).toHaveLength(2)
    expect(store.accounts).toHaveLength(1)
    const cached = await db.categories.toArray()
    expect(cached).toHaveLength(2)
  })

  it('loads from IndexedDB cache without calling GAS', async () => {
    await db.categories.bulkPut([{ name: '薪資費用', type: '費用' }])
    await db.accounts.bulkPut([{ name: '零用金', type: '資產' }])
    const store = useMetaStore()
    await store.initialize()
    const { fetchMeta } = await import('../../src/services/gasApi')
    expect(fetchMeta).not.toHaveBeenCalled()
    expect(store.categories).toHaveLength(1)
  })

  it('expenseCategories returns 費用 and 成本 types', async () => {
    const store = useMetaStore()
    await store.initialize()
    const expense = store.expenseCategories()
    expect(expense.every(c => c.type === '費用' || c.type === '成本')).toBe(true)
  })

  it('incomeCategories returns 收入 type only', async () => {
    const store = useMetaStore()
    await store.initialize()
    const income = store.incomeCategories()
    expect(income.every(c => c.type === '收入')).toBe(true)
  })
})
