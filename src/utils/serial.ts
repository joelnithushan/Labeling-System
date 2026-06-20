import { CATEGORY_CODES } from '../types'

export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function buildSerialNumber(category: string, date: Date, sequence: number): string {
  const dateKey = formatDateKey(date)
  const catCode = CATEGORY_CODES[category] ?? 'OTH'
  const seq = String(sequence).padStart(5, '0')
  return `${dateKey}-${catCode}-${seq}`
}

export async function generateSerial(category: string, date: Date): Promise<string> {
  const dateStr = date.toISOString().slice(0, 10)
  const seq = await window.electron.db.getNextSequence(category, dateStr)
  return buildSerialNumber(category, date, seq)
}
