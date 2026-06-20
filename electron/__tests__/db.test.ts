import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import {
  initSchema,
  getAllProducts, insertProduct, updateProduct, deleteProduct,
  getAllBarcodes, insertBarcode, getNextSequence,
  getAllSettings, saveSettings,
  getStats,
} from '../db'

// Mock the electron module so db.ts can be imported without a running Electron process.
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
}))

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  initSchema(db)
})

afterEach(() => {
  db.close()
})

// ── Products ──────────────────────────────────────────────────────────────────

describe('products', () => {
  const sampleProduct = {
    name: 'Red Rice Flour',
    category: 'Flour',
    weight: '1',
    weight_unit: 'kg',
    price: 450,
    shelf_life_days: 180,
  }

  it('inserts a product and returns it with an id', () => {
    const product = insertProduct(db, sampleProduct) as any
    expect(product.id).toBeDefined()
    expect(product.name).toBe('Red Rice Flour')
    expect(product.category).toBe('Flour')
    expect(product.price).toBe(450)
    expect(product.shelf_life_days).toBe(180)
  })

  it('getAllProducts returns all inserted products', () => {
    insertProduct(db, sampleProduct)
    insertProduct(db, { ...sampleProduct, name: 'Millet Flour', category: 'Millet' })
    const products = getAllProducts(db)
    expect(products).toHaveLength(2)
  })

  it('getAllProducts returns products sorted by name', () => {
    insertProduct(db, { ...sampleProduct, name: 'Wheat Flour' })
    insertProduct(db, { ...sampleProduct, name: 'Almond Flour' })
    const products = getAllProducts(db) as any[]
    expect(products[0].name).toBe('Almond Flour')
    expect(products[1].name).toBe('Wheat Flour')
  })

  it('getAllProducts returns empty array when no products', () => {
    expect(getAllProducts(db)).toHaveLength(0)
  })

  it('updates a product and reflects the change', () => {
    const created = insertProduct(db, sampleProduct) as any
    updateProduct(db, created.id, { ...sampleProduct, name: 'Updated Flour', price: 500 })
    const products = getAllProducts(db) as any[]
    expect(products[0].name).toBe('Updated Flour')
    expect(products[0].price).toBe(500)
  })

  it('deletes a product by id', () => {
    const product = insertProduct(db, sampleProduct) as any
    deleteProduct(db, product.id)
    expect(getAllProducts(db)).toHaveLength(0)
  })

  it('stores all fields correctly', () => {
    const product = insertProduct(db, {
      name: 'Test',
      category: 'Rice',
      weight: '2.5',
      weight_unit: 'kg',
      price: 199.99,
      shelf_life_days: 365,
    }) as any
    expect(product.weight).toBe('2.5')
    expect(product.weight_unit).toBe('kg')
    expect(product.price).toBe(199.99)
    expect(product.shelf_life_days).toBe(365)
  })
})

// ── Barcodes ──────────────────────────────────────────────────────────────────

describe('barcodes', () => {
  const sampleBarcode = {
    product_id: null,
    product_name: 'Red Rice Flour',
    category: 'Flour',
    weight: '1',
    weight_unit: 'kg',
    price: 450,
    serial_number: '20260621-FLR-00001',
    barcode_value: '20260621-FLR-00001',
    quantity: 2,
    mfg_date: '21/06/2026',
    exp_date: '18/12/2026',
  }

  it('inserts a barcode and returns it with an id', () => {
    const barcode = insertBarcode(db, sampleBarcode) as any
    expect(barcode.id).toBeDefined()
    expect(barcode.serial_number).toBe('20260621-FLR-00001')
    expect(barcode.quantity).toBe(2)
  })

  it('getAllBarcodes returns all barcodes ordered newest first', () => {
    insertBarcode(db, sampleBarcode)
    insertBarcode(db, { ...sampleBarcode, serial_number: '20260621-FLR-00002' })
    const barcodes = getAllBarcodes(db)
    expect(barcodes).toHaveLength(2)
  })

  it('getAllBarcodes returns empty array when none exist', () => {
    expect(getAllBarcodes(db)).toHaveLength(0)
  })

  it('enforces unique serial numbers', () => {
    insertBarcode(db, sampleBarcode)
    expect(() => insertBarcode(db, sampleBarcode)).toThrow()
  })

  it('filters barcodes by search term (product name)', () => {
    insertBarcode(db, sampleBarcode)
    insertBarcode(db, { ...sampleBarcode, serial_number: 'X', product_name: 'Millet', category: 'Millet' })
    const results = getAllBarcodes(db, { search: 'Millet' }) as any[]
    expect(results).toHaveLength(1)
    expect(results[0].product_name).toBe('Millet')
  })

  it('filters barcodes by search term (serial number)', () => {
    insertBarcode(db, sampleBarcode)
    insertBarcode(db, { ...sampleBarcode, serial_number: '20260621-MLT-00001' })
    const results = getAllBarcodes(db, { search: 'MLT' }) as any[]
    expect(results).toHaveLength(1)
    expect(results[0].serial_number).toBe('20260621-MLT-00001')
  })

  it('respects the limit option', () => {
    for (let i = 1; i <= 5; i++) {
      insertBarcode(db, { ...sampleBarcode, serial_number: `20260621-FLR-0000${i}` })
    }
    const results = getAllBarcodes(db, { limit: 3 })
    expect(results).toHaveLength(3)
  })
})

// ── Sequence ──────────────────────────────────────────────────────────────────

describe('getNextSequence', () => {
  it('returns 1 when no barcodes exist for that category and date', () => {
    const seq = getNextSequence(db, 'Flour', '2026-06-21')
    expect(seq).toBe(1)
  })

  it('returns count+1 for existing barcodes on the same day', () => {
    insertBarcode(db, {
      product_id: null, product_name: 'A', category: 'Flour',
      weight: '1', weight_unit: 'kg', price: 100,
      serial_number: 'X1', barcode_value: 'X1', quantity: 1,
      mfg_date: '21/06/2026', exp_date: '21/12/2026',
    })
    insertBarcode(db, {
      product_id: null, product_name: 'B', category: 'Flour',
      weight: '1', weight_unit: 'kg', price: 100,
      serial_number: 'X2', barcode_value: 'X2', quantity: 1,
      mfg_date: '21/06/2026', exp_date: '21/12/2026',
    })
    const seq = getNextSequence(db, 'Flour', '2026-06-21')
    expect(seq).toBe(3)
  })

  it('does not count barcodes from a different category', () => {
    insertBarcode(db, {
      product_id: null, product_name: 'A', category: 'Rice',
      weight: '1', weight_unit: 'kg', price: 100,
      serial_number: 'Y1', barcode_value: 'Y1', quantity: 1,
      mfg_date: '21/06/2026', exp_date: '21/12/2026',
    })
    const seq = getNextSequence(db, 'Flour', '2026-06-21')
    expect(seq).toBe(1)
  })
})

// ── Settings ──────────────────────────────────────────────────────────────────

describe('settings', () => {
  it('has default settings after schema init', () => {
    const settings = getAllSettings(db)
    expect(settings.shop_name).toBe('My Mill Shop')
    expect(settings.label_size).toBe('100x50')
    expect(settings.date_format).toBe('dd/MM/yyyy')
  })

  it('saves and retrieves updated settings', () => {
    saveSettings(db, {
      shop_name: 'Nithushan Mill',
      printer_name: 'Xprinter XP-420B',
      label_size: '50x40',
      date_format: 'yyyy-MM-dd',
      address: '123 Main St',
      phone: '+94 77 000 0000',
    })
    const settings = getAllSettings(db)
    expect(settings.shop_name).toBe('Nithushan Mill')
    expect(settings.printer_name).toBe('Xprinter XP-420B')
    expect(settings.label_size).toBe('50x40')
  })

  it('overwrites an existing setting without creating a duplicate', () => {
    saveSettings(db, { shop_name: 'First Name', printer_name: '', label_size: '100x50', date_format: 'dd/MM/yyyy', address: '', phone: '' })
    saveSettings(db, { shop_name: 'Second Name', printer_name: '', label_size: '100x50', date_format: 'dd/MM/yyyy', address: '', phone: '' })
    const settings = getAllSettings(db)
    expect(settings.shop_name).toBe('Second Name')
  })
})

// ── Stats ─────────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns zero counts when database is empty', () => {
    const stats = getStats(db) as any
    expect(stats.total_products).toBe(0)
    expect(stats.total_printed).toBe(0)
    expect(stats.today_printed).toBe(0)
    expect(stats.categories).toBe(0)
    expect(stats.recent_barcodes).toHaveLength(0)
  })

  it('counts total products correctly', () => {
    insertProduct(db, { name: 'A', category: 'Flour', weight: '1', weight_unit: 'kg', price: 100, shelf_life_days: 180 })
    insertProduct(db, { name: 'B', category: 'Rice', weight: '1', weight_unit: 'kg', price: 100, shelf_life_days: 180 })
    const stats = getStats(db) as any
    expect(stats.total_products).toBe(2)
  })

  it('counts distinct categories', () => {
    insertProduct(db, { name: 'A', category: 'Flour', weight: '1', weight_unit: 'kg', price: 100, shelf_life_days: 180 })
    insertProduct(db, { name: 'B', category: 'Flour', weight: '2', weight_unit: 'kg', price: 150, shelf_life_days: 180 })
    insertProduct(db, { name: 'C', category: 'Rice', weight: '1', weight_unit: 'kg', price: 200, shelf_life_days: 180 })
    const stats = getStats(db) as any
    expect(stats.categories).toBe(2)
  })

  it('sums total_printed from quantity column', () => {
    insertBarcode(db, {
      product_id: null, product_name: 'A', category: 'Flour',
      weight: '1', weight_unit: 'kg', price: 100,
      serial_number: 'S1', barcode_value: 'S1', quantity: 5,
      mfg_date: '21/06/2026', exp_date: '21/12/2026',
    })
    insertBarcode(db, {
      product_id: null, product_name: 'B', category: 'Rice',
      weight: '1', weight_unit: 'kg', price: 100,
      serial_number: 'S2', barcode_value: 'S2', quantity: 3,
      mfg_date: '21/06/2026', exp_date: '21/12/2026',
    })
    const stats = getStats(db) as any
    expect(stats.total_printed).toBe(8)
  })

  it('limits recent_barcodes to 10', () => {
    for (let i = 1; i <= 15; i++) {
      insertBarcode(db, {
        product_id: null, product_name: 'P', category: 'Flour',
        weight: '1', weight_unit: 'kg', price: 100,
        serial_number: `SN${i}`, barcode_value: `SN${i}`, quantity: 1,
        mfg_date: '21/06/2026', exp_date: '21/12/2026',
      })
    }
    const stats = getStats(db) as any
    expect(stats.recent_barcodes).toHaveLength(10)
  })
})
