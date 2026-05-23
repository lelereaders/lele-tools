function doGet(e) {
  const action = e.parameter.action
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  try {
    if (action === 'getTransactions') {
      const sheet = ss.getSheetByName('transactions')
      const values = sheet.getDataRange().getValues()
      if (values.length < 2) return jsonResponse({ rows: [] })
      const headers = values[0]
      const rows = values.slice(1).map(row => {
        const obj = {}
        headers.forEach((h, i) => { obj[h] = row[i] })
        return obj
      })
      return jsonResponse({ rows })
    }

    if (action === 'appendTransaction') {
      const data = JSON.parse(e.parameter.data)
      const sheet = ss.getSheetByName('transactions')
      sheet.appendRow([
        data.id, data.date, data.description, data.category,
        data.currency, data.amount,
        data.from_account || '', data.to_account || '',
        data.notes || '', data.twd_amount,
        data.created_at, data.source
      ])
      return jsonResponse({ success: true })
    }

    if (action === 'getMeta') {
      const sheet = ss.getSheetByName('meta')
      const values = sheet.getDataRange().getValues()
      const categories = []
      const accounts = []
      values.slice(1).forEach(row => {
        if (row[0]) categories.push({ name: String(row[0]), type: String(row[1]) })
        if (row[3]) accounts.push({ name: String(row[3]), type: String(row[4]) })
      })
      return jsonResponse({ categories, accounts })
    }

    return jsonResponse({ error: 'Unknown action' })
  } catch (err) {
    return jsonResponse({ error: String(err) })
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
