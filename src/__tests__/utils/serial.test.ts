import { describe, it, expect } from 'vitest'
import { buildSerialNumber, formatDateKey } from '../../utils/serial'

// ── formatDateKey ─────────────────────────────────────────────────────────────

describe('formatDateKey', () => {
  it('formats a date as YYYYMMDD', () => {
    expect(formatDateKey(new Date('2026-06-21'))).toBe('20260621')
  })

  it('zero-pads single-digit month and day', () => {
    expect(formatDateKey(new Date('2026-01-05'))).toBe('20260105')
  })

  it('handles December correctly', () => {
    expect(formatDateKey(new Date('2026-12-31'))).toBe('20261231')
  })
})

// ── buildSerialNumber ─────────────────────────────────────────────────────────

describe('buildSerialNumber', () => {
  const date = new Date('2026-06-21')

  it('builds a serial number in YYYYMMDD-CATG-XXXXX format', () => {
    const serial = buildSerialNumber('Flour', date, 1)
    expect(serial).toBe('20260621-FLR-00001')
  })

  it('uses the correct category code for each product type', () => {
    expect(buildSerialNumber('Flour', date, 1)).toMatch(/-FLR-/)
    expect(buildSerialNumber('Millet', date, 1)).toMatch(/-MLT-/)
    expect(buildSerialNumber('Grain', date, 1)).toMatch(/-GRN-/)
    expect(buildSerialNumber('Rice', date, 1)).toMatch(/-RCE-/)
    expect(buildSerialNumber('Sugar', date, 1)).toMatch(/-SGR-/)
    expect(buildSerialNumber('Salt', date, 1)).toMatch(/-SLT-/)
    expect(buildSerialNumber('Spice', date, 1)).toMatch(/-SPC-/)
    expect(buildSerialNumber('Pulse', date, 1)).toMatch(/-PLS-/)
    expect(buildSerialNumber('Other', date, 1)).toMatch(/-OTH-/)
  })

  it('falls back to OTH for an unknown category', () => {
    expect(buildSerialNumber('Unknown', date, 1)).toMatch(/-OTH-/)
  })

  it('zero-pads the sequence number to 5 digits', () => {
    expect(buildSerialNumber('Flour', date, 1)).toMatch(/-00001$/)
    expect(buildSerialNumber('Flour', date, 42)).toMatch(/-00042$/)
    expect(buildSerialNumber('Flour', date, 999)).toMatch(/-00999$/)
    expect(buildSerialNumber('Flour', date, 10000)).toMatch(/-10000$/)
  })

  it('includes the correct date portion', () => {
    expect(buildSerialNumber('Rice', new Date('2026-01-05'), 7)).toBe('20260105-RCE-00007')
  })

  it('produces a serial matching the pattern YYYYMMDD-AAA-NNNNN', () => {
    const serial = buildSerialNumber('Flour', date, 5)
    expect(serial).toMatch(/^\d{8}-[A-Z]{3}-\d{5}$/)
  })
})
