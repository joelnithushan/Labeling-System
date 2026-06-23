import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'

// ── Mock window.electron (Electron IPC bridge) ────────────────────────────────
// All pages and hooks call window.electron.db.* and window.electron.print.*
// These mocks replace the real IPC so tests run without an Electron process.

export const mockElectron = {
  db: {
    getProducts: vi.fn().mockResolvedValue([]),
    addProduct: vi.fn().mockResolvedValue({
      id: 1, name: 'Test Product', category: 'Flour',
      weight: '1', weight_unit: 'kg', price: 100, shelf_life_days: 180,
      created_at: '2026-06-21 00:00:00',
    }),
    updateProduct: vi.fn().mockResolvedValue({
      id: 1, name: 'Updated Product', category: 'Flour',
      weight: '2', weight_unit: 'kg', price: 200, shelf_life_days: 180,
      created_at: '2026-06-21 00:00:00',
    }),
    deleteProduct: vi.fn().mockResolvedValue({ success: true }),
    getBarcodes: vi.fn().mockResolvedValue([]),
    addBarcode: vi.fn().mockResolvedValue({ id: 1 }),
    getNextSequence: vi.fn().mockResolvedValue(1),
    getSettings: vi.fn().mockResolvedValue({
      shop_name: 'Test Mill Shop',
      printer_name: '',
      label_size: '100x50',
      date_format: 'dd/MM/yyyy',
      address: '123 Main St',
      phone: '+94 77 123 4567',
      username: 'admin',
      password: 'admin',
    }),
    updateSettings: vi.fn().mockResolvedValue({ success: true }),
    getStats: vi.fn().mockResolvedValue({
      total_products: 5,
      total_printed: 120,
      today_printed: 12,
      categories: 3,
      recent_barcodes: [],
    }),
    exportCSV: vi.fn().mockResolvedValue({ success: true }),
  },
  dataManagement: {
    exportData: vi.fn().mockResolvedValue({
      success: true,
      filePath: '/tmp/system_data.xlsx',
      timestamp: '2026-06-23T00:00:00.000Z',
      warnings: [],
      errors: [],
      sheetSummary: [],
    }),
    previewImport: vi.fn().mockResolvedValue({
      success: true,
      filePath: '/tmp/import.xlsx',
      fileName: 'import.xlsx',
      extension: '.xlsx',
      sheets: [],
      warnings: [],
      errors: [],
    }),
    executeImport: vi.fn().mockResolvedValue({
      success: true,
      filePath: '/tmp/import.xlsx',
      timestamp: '2026-06-23T00:00:00.000Z',
      importedCount: 0,
      skippedDuplicates: 0,
      invalidCount: 0,
      warnings: [],
      errors: [],
      tableSummary: [],
    }),
    backup: vi.fn().mockResolvedValue({
      success: true,
      backupPath: '/tmp/backup.db',
      timestamp: '2026-06-23T00:00:00.000Z',
      warnings: [],
      errors: [],
    }),
    restore: vi.fn().mockResolvedValue({
      success: true,
      restoredFrom: '/tmp/backup.db',
      timestamp: '2026-06-23T00:00:00.000Z',
      warnings: [],
      errors: [],
    }),
    reset: vi.fn().mockResolvedValue({
      success: true,
      backupPath: '/tmp/backup.db',
      timestamp: '2026-06-23T00:00:00.000Z',
      warnings: [],
      errors: [],
      tableSummary: { clearedTables: [], rowsDeleted: {} },
    }),
  },
  print: {
    label: vi.fn().mockResolvedValue({ success: true }),
    getPrinters: vi.fn().mockResolvedValue([
      { name: 'Xprinter XP-420B', displayName: 'Xprinter XP-420B' },
    ]),
  },
  dialog: {
    saveFile: vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/export.csv' }),
    openFile: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/backup.db'] }),
  },
}

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true,
})

// Reset all mocks between tests so state doesn't leak
beforeEach(() => {
  vi.clearAllMocks()
  // Restore default return values after clearAllMocks
  mockElectron.db.getProducts.mockResolvedValue([])
  mockElectron.db.getBarcodes.mockResolvedValue([])
  mockElectron.db.getNextSequence.mockResolvedValue(1)
  mockElectron.db.getSettings.mockResolvedValue({
    shop_name: 'Test Mill Shop',
    printer_name: '',
    label_size: '100x50',
    date_format: 'dd/MM/yyyy',
    address: '123 Main St',
    phone: '+94 77 123 4567',
    username: 'admin',
    password: 'admin',
  })
  mockElectron.db.getStats.mockResolvedValue({
    total_products: 5,
    total_printed: 120,
    today_printed: 12,
    categories: 3,
    recent_barcodes: [],
  })
  mockElectron.print.label.mockResolvedValue({ success: true })
  mockElectron.dataManagement.exportData.mockResolvedValue({
    success: true,
    filePath: '/tmp/system_data.xlsx',
    timestamp: '2026-06-23T00:00:00.000Z',
    warnings: [],
    errors: [],
    sheetSummary: [],
  })
})
