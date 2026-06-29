import { describe, it, expect, vi, beforeAll } from 'vitest'
import { buildLabelHtml } from '../../utils/print'
import type { Product, AppSettings } from '../../types'

// JsBarcode uses SVG DOM APIs that jsdom supports partially.
// We mock it so tests focus on the HTML structure, not barcode rendering.
vi.mock('jsbarcode', () => ({ default: vi.fn() }))

// XMLSerializer is available in jsdom — stub serializeToString to return a
// predictable SVG string so label HTML assertions are deterministic.
beforeAll(() => {
  vi.stubGlobal('XMLSerializer', class {
    serializeToString() { return '<svg data-testid="barcode">mock</svg>' }
  })
})

const product: Product = {
  id: 1,
  name: 'Red Rice Flour',
  category: 'Flour',
  weight: '1',
  weight_unit: 'kg',
  price: 450,
  shelf_life_days: 180,
  created_at: '2026-06-21 00:00:00',
}

const settings: AppSettings = {
  shop_name: 'Nithushan Mill',
  printer_name: '',
  label_size: '100x50',
  date_format: 'dd/MM/yyyy',
  address: '123 Main St',
  phone: '+94 77 000 0000',
  whatsapp: '+94 76 111 1111',
  username: 'admin',
  password: 'admin',
  logo: '',
  theme: 'dark',
  label_net_wt: 'Net Wt',
  label_price: 'Price',
  label_mfg: 'Mfg',
  label_exp: 'Exp',
}

const mfgDate = new Date('2026-06-21')
const expDate = new Date('2026-12-18') // 180 days later

// ── buildLabelHtml ────────────────────────────────────────────────────────────

describe('buildLabelHtml — all 6 required fields', () => {
  let html: string

  beforeAll(() => {
    html = buildLabelHtml({
      product, settings,
      serialNumber: '20260621-FLR-00001',
      mfgDate, expDate, quantity: 1,
    })
  })

  it('contains the shop name', () => {
    expect(html).toContain('Nithushan Mill')
  })

  it('contains the product name', () => {
    expect(html).toContain('Red Rice Flour')
  })

  it('contains the weight and unit', () => {
    expect(html).toContain('1')
    expect(html).toContain('kg')
  })

  it('contains the price in Rs.', () => {
    expect(html).toContain('450.00')
  })

  it('contains the manufacturing date', () => {
    expect(html).toContain('21/06/2026')
  })

  it('contains the expiry date', () => {
    expect(html).toContain('18/12/2026')
  })

  it('contains the serial number', () => {
    expect(html).toContain('20260621-FLR-00001')
  })

  it('contains the barcode SVG', () => {
    expect(html).toContain('<svg')
  })

  it('contains the phone number when set', () => {
    expect(html).toContain('+94 77 000 0000')
  })
})

describe('buildLabelHtml — label size variants', () => {
  it('generates html for 50x40mm (small) label', () => {
    const html = buildLabelHtml({
      product,
      settings: { ...settings, label_size: '50x40' },
      serialNumber: '20260621-FLR-00001',
      mfgDate, expDate, quantity: 1,
    })
    expect(html).toContain('50mm')
    expect(html).toContain('40mm')
    expect(html).toContain('Red Rice Flour')
  })

  it('generates html for 100x150mm (large) label', () => {
    const html = buildLabelHtml({
      product,
      settings: { ...settings, label_size: '100x150' },
      serialNumber: '20260621-FLR-00001',
      mfgDate, expDate, quantity: 1,
    })
    expect(html).toContain('100mm')
    expect(html).toContain('150mm')
  })
})

describe('buildLabelHtml — XSS safety', () => {
  it('escapes HTML special characters in shop name', () => {
    const html = buildLabelHtml({
      product,
      settings: { ...settings, shop_name: '<script>alert(1)</script>' },
      serialNumber: '20260621-FLR-00001',
      mfgDate, expDate, quantity: 1,
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes HTML special characters in product name', () => {
    const html = buildLabelHtml({
      product: { ...product, name: 'Rice & Wheat <b>Mix</b>' },
      settings,
      serialNumber: '20260621-OTH-00001',
      mfgDate, expDate, quantity: 1,
    })
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;b&gt;')
    expect(html).toContain('&amp;')
  })
})

describe('buildLabelHtml — date format variants', () => {
  it('formats dates using dd/MM/yyyy', () => {
    const html = buildLabelHtml({
      product, settings: { ...settings, date_format: 'dd/MM/yyyy' },
      serialNumber: '20260621-FLR-00001',
      mfgDate, expDate, quantity: 1,
    })
    expect(html).toContain('21/06/2026')
  })

  it('formats dates using yyyy-MM-dd', () => {
    const html = buildLabelHtml({
      product, settings: { ...settings, date_format: 'yyyy-MM-dd' },
      serialNumber: '20260621-FLR-00001',
      mfgDate, expDate, quantity: 1,
    })
    expect(html).toContain('2026-06-21')
  })
})
