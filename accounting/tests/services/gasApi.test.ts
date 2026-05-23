import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAllTransactions, appendTransaction, fetchMeta, fetchTransactionsSince } from '../../src/services/gasApi'
import type { Transaction } from '../../src/types'

const GAS_URL = 'https://script.google.com/macros/s/TEST/exec'
const GAS_TOKEN = 'test-token'

beforeEach(() => {
  vi.stubEnv('VITE_GAS_URL', GAS_URL)
  vi.stubEnv('VITE_GAS_TOKEN', GAS_TOKEN)
  vi.stubGlobal('fetch', vi.fn())
})

describe('fetchAllTransactions', () => {
  it('calls GAS with action=getTransactions and token, parses rows', async () => {
    const mockRows = [{
      id: 'T0001', date: '2026-01-02', description: '普捷印刷',
      category: 'books 普捷-印刷費用', currency: 'TWD', amount: '-320030',
      from_account: '上海儲蓄銀行', to_account: '', notes: '',
      twd_amount: '-320030', created_at: '2026-01-02T00:00:00.000Z',
      source: 'excel_import'
    }]
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ rows: mockRows })
    } as Response)

    const result = await fetchAllTransactions()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('action=getTransactions'))
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('token=test-token'))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('T0001')
    expect(result[0].amount).toBe(-320030)
    expect(result[0].synced).toBe(true)
  })
})

describe('fetchTransactionsSince', () => {
  it('calls GAS with since parameter', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ rows: [] })
    } as Response)

    await fetchTransactionsSince('2026-01-01T00:00:00.000Z')

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('action=getTransactions'))
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('since='))
  })
})

describe('appendTransaction', () => {
  it('calls GAS with action=appendTransaction and returns true on success', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response)

    const t: Transaction = {
      id: 'A-TEST', date: '2026-05-23', description: '測試',
      category: '薪資費用', currency: 'TWD', amount: -10000,
      from_account: '零用金', to_account: '', notes: '',
      twd_amount: -10000, created_at: '2026-05-23T00:00:00.000Z',
      source: 'app', synced: false
    }

    const result = await appendTransaction(t)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('action=appendTransaction'))
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('A-TEST'))
    expect(result).toBe(true)
  })

  it('returns false when GAS reports failure', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false })
    } as Response)

    const t: Transaction = {
      id: 'A-FAIL', date: '2026-05-23', description: '失敗測試',
      category: '運費', currency: 'TWD', amount: -500,
      from_account: '零用金', to_account: '', notes: '',
      twd_amount: -500, created_at: '2026-05-23T00:00:00.000Z',
      source: 'app', synced: false
    }

    const result = await appendTransaction(t)
    expect(result).toBe(false)
  })
})

describe('fetchMeta', () => {
  it('returns categories and accounts', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: [{ name: '薪資費用', type: '費用' }],
        accounts: [{ name: '零用金', type: '資產' }]
      })
    } as Response)

    const meta = await fetchMeta()
    expect(meta.categories).toHaveLength(1)
    expect(meta.accounts).toHaveLength(1)
    expect(meta.categories[0].name).toBe('薪資費用')
  })
})
