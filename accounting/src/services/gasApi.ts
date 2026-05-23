import type { Transaction, Category, Account } from '../types'

const GAS_URL = import.meta.env.VITE_GAS_URL as string

interface GASRow {
  id: string; date: string; description: string; category: string
  currency: string; amount: string | number; from_account: string
  to_account: string; notes: string; twd_amount: string | number
  created_at: string; source: string
}

function rowToTransaction(row: GASRow): Transaction {
  return {
    id: String(row.id),
    date: String(row.date),
    description: String(row.description),
    category: String(row.category),
    currency: String(row.currency) as 'TWD' | 'USD',
    amount: Number(row.amount),
    from_account: String(row.from_account || ''),
    to_account: String(row.to_account || ''),
    notes: String(row.notes || ''),
    twd_amount: Number(row.twd_amount),
    created_at: String(row.created_at),
    source: String(row.source) as 'excel_import' | 'app',
    synced: true
  }
}

export async function fetchAllTransactions(): Promise<Transaction[]> {
  const url = `${GAS_URL}?action=getTransactions`
  const res = await fetch(url)
  const json = await res.json()
  return (json.rows as GASRow[]).map(rowToTransaction)
}

export async function appendTransaction(t: Transaction): Promise<boolean> {
  const payload = {
    id: t.id, date: t.date, description: t.description, category: t.category,
    currency: t.currency, amount: t.amount, from_account: t.from_account,
    to_account: t.to_account, notes: t.notes, twd_amount: t.twd_amount,
    created_at: t.created_at, source: t.source
  }
  const data = encodeURIComponent(JSON.stringify(payload))
  const url = `${GAS_URL}?action=appendTransaction&data=${data}`
  const res = await fetch(url)
  const json = await res.json()
  return json.success === true
}

export async function fetchMeta(): Promise<{ categories: Category[]; accounts: Account[] }> {
  const url = `${GAS_URL}?action=getMeta`
  const res = await fetch(url)
  return res.json()
}
