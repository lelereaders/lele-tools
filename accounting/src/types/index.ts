export interface Transaction {
  id: string            // "T0001" for imported, "A-<ts>-<rand>" for app-created
  date: string          // "YYYY-MM-DD"
  description: string
  category: string
  currency: 'TWD' | 'USD'
  amount: number        // negative = expense, positive = income
  from_account: string
  to_account: string
  notes: string
  twd_amount: number
  created_at: string    // ISO 8601
  source: 'excel_import' | 'app'
  synced: boolean       // local-only: false until confirmed written to Sheets
}

export interface Category {
  name: string
  type: '費用' | '成本' | '收入' | '其他'
}

export interface Account {
  name: string
  type: '資產' | '負債'
}

export type TransactionType = 'expense' | 'income' | 'transfer'

export function deriveType(t: Transaction): TransactionType {
  if (t.from_account && t.to_account) return 'transfer'
  return t.amount >= 0 ? 'income' : 'expense'
}

// Uses timestamp+random — safe for concurrent offline use by two users
export function nextId(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `A-${ts}-${rand}`
}

export interface SyncQueueItem {
  id?: number       // Dexie auto-increment PK
  payload: Transaction
  retries: number
}
