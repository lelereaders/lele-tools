// Google Apps Script — deploy as Web App (Execute as: Me, Access: Anyone)
// Set SPREADSHEET_ID and TOKEN constants before deploying

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'
const TOKEN = 'YOUR_SHARED_SECRET_HERE'

function doGet(e) {
  try {
    if (e.parameter.token !== TOKEN) return unauthorized()
    const action = e.parameter.action

    if (action === 'getTransactions') {
      const since = e.parameter.since || null
      return getTransactions(since)
    }
    if (action === 'appendTransaction') {
      const data = JSON.parse(e.parameter.data)
      return addTransaction(data)
    }
    if (action === 'getMeta') return getMeta()

    return json({ error: 'unknown action' })
  } catch (err) {
    return json({ error: String(err) })
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    if (body.token !== TOKEN) return unauthorized()

    if (body.action === 'addTransaction') return addTransaction(body.data)
    if (body.action === 'addTransactionBatch') return addTransactionBatch(body.data)

    return json({ error: 'unknown action' })
  } catch (err) {
    return json({ error: String(err) })
  }
}

function getTransactions(since) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
  const sheet = ss.getSheetByName('transactions')
  const values = sheet.getDataRange().getValues()
  if (values.length < 2) return json({ rows: [] })
  const headers = values[0]
  let rows = values.slice(1).map(function(row) {
    const obj = {}
    headers.forEach(function(h, i) { obj[h] = row[i] === null ? '' : String(row[i]) })
    return obj
  })
  // Requires ISO 8601 format in created_at; manual sheet edits may break this filter
  if (since) rows = rows.filter(function(r) { return r.created_at >= since })
  return json({ rows: rows })
}

function addTransaction(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
  const sheet = ss.getSheetByName('transactions')
  sheet.appendRow([
    data.id, data.date, data.description, data.category,
    data.currency, data.amount,
    data.from_account || '', data.to_account || '',
    data.notes || '', data.twd_amount,
    data.created_at, data.source
  ])
  return json({ success: true })
}

function addTransactionBatch(rows) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
  const sheet = ss.getSheetByName('transactions')
  const values = rows.map(function(data) {
    return [
      data.id, data.date, data.description, data.category,
      data.currency, data.amount,
      data.from_account || '', data.to_account || '',
      data.notes || '', data.twd_amount,
      data.created_at, data.source
    ]
  })
  if (values.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, values.length, values[0].length).setValues(values)
  }
  return json({ ok: true, count: rows.length })
}

function getMeta() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
  const sheet = ss.getSheetByName('meta')
  const values = sheet.getDataRange().getValues()
  const categories = [], accounts = []
  values.slice(1).forEach(function(row) {
    if (row[0]) categories.push({ name: String(row[0]), type: String(row[1]) })
    if (row[3]) accounts.push({ name: String(row[3]), type: String(row[4]) })
  })
  return json({ categories: categories, accounts: accounts })
}

function unauthorized() {
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
    .setMimeType(ContentService.MimeType.JSON)
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
