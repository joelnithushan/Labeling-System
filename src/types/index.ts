export interface Product {
  id: number
  name: string
  category: string
  weight: string
  weight_unit: string
  price: number
  shelf_life_days: number
  created_at: string
}

export interface Barcode {
  id: number
  product_id: number | null
  product_name: string
  category: string
  weight: string
  weight_unit: string
  price: number
  serial_number: string
  barcode_value: string
  quantity: number
  mfg_date: string
  exp_date: string
  printed_at: string
}

export interface AppSettings {
  shop_name: string
  printer_name: string
  label_size: string
  date_format: string
  address: string
  phone: string
  whatsapp: string
  username: string
  password: string
  logo: string
  theme: string
  label_net_wt: string
  label_price: string
  label_mfg: string
  label_exp: string
}

export interface StructuredIssue {
  code: string
  message: string
  severity?: 'error' | 'warning' | 'info'
  tableName?: string
  sheetName?: string
  path?: string
}

export interface ExportSheetSummary {
  sheetName: string
  sourceTable: string
  rowCount: number
  columns: string[]
  maskedColumns: string[]
  dynamic: boolean
}

export interface DataExportResult {
  success: boolean
  filePath?: string
  timestamp: string
  warnings: StructuredIssue[]
  errors: StructuredIssue[]
  sheetSummary: ExportSheetSummary[]
}

export interface ImportSheetPreview {
  sheetName: string
  tableName: string
  headers: string[]
  rows: Record<string, unknown>[]
  issues: StructuredIssue[]
  rowCount: number
  dynamic: boolean
  detectedTable?: string
}

export interface ImportPreviewResult {
  success: boolean
  filePath?: string
  fileName: string
  extension: '.xlsx' | '.csv'
  sheets: ImportSheetPreview[]
  warnings: StructuredIssue[]
  errors: StructuredIssue[]
}

export interface ImportTableSummary {
  sheetName: string
  tableName: string
  importedCount: number
  skippedDuplicates: number
  invalidCount: number
  warnings: StructuredIssue[]
  errors: StructuredIssue[]
}

export interface ImportExecutionResult {
  success: boolean
  filePath?: string
  timestamp: string
  importedCount: number
  skippedDuplicates: number
  invalidCount: number
  warnings: StructuredIssue[]
  errors: StructuredIssue[]
  tableSummary: ImportTableSummary[]
}

export interface BackupResult {
  success: boolean
  backupPath?: string
  timestamp: string
  warnings: StructuredIssue[]
  errors: StructuredIssue[]
}

export interface RestoreResult {
  success: boolean
  restoredFrom?: string
  timestamp: string
  warnings: StructuredIssue[]
  errors: StructuredIssue[]
}

export interface ResetResult {
  success: boolean
  backupPath?: string
  timestamp: string
  warnings: StructuredIssue[]
  errors: StructuredIssue[]
  tableSummary: {
    clearedTables: string[]
    rowsDeleted: Record<string, number>
  }
}

export interface DashboardStats {
  total_products: number
  total_printed: number
  today_printed: number
  categories: number
  recent_barcodes: Barcode[]
  low_stock_count: number
}

export interface PrintJob {
  product: Product
  quantity: number
  mfg_date: string
  exp_date: string
  serial_number: string
}

export type LabelSize = '50x40' | '100x50' | '100x150'

export type StockEntryType = 'stock_in' | 'stock_out' | 'adjustment'

export interface StockEntry {
  id: number
  product_id: number
  product_name: string
  type: StockEntryType
  quantity_change: number   // positive or negative
  note: string
  created_at: string
}

export interface StockSummary {
  product_id: number
  product_name: string
  category: string
  weight: string
  weight_unit: string
  current_stock: number
}

export const CATEGORIES = [
  'Flour',
  'Millet',
  'Grain',
  'Rice',
  'Sugar',
  'Salt',
  'Spice',
  'Pulse',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_CODES: Record<string, string> = {
  Flour: 'FLR',
  Millet: 'MLT',
  Grain: 'GRN',
  Rice: 'RCE',
  Sugar: 'SGR',
  Salt: 'SLT',
  Spice: 'SPC',
  Pulse: 'PLS',
  Other: 'OTH',
}

// Window type extension
declare global {
  interface Window {
    electron: {
      db: {
        getProducts: () => Promise<Product[]>
        addProduct: (data: Omit<Product, 'id' | 'created_at'>) => Promise<Product>
        updateProduct: (id: number, data: Omit<Product, 'id' | 'created_at'>) => Promise<Product>
        deleteProduct: (id: number) => Promise<{ success: boolean }>
        getBarcodes: (filters?: { search?: string; date?: string; limit?: number }) => Promise<Barcode[]>
        addBarcode: (data: Omit<Barcode, 'id' | 'printed_at'>) => Promise<Barcode>
        getNextSequence: (category: string, date: string) => Promise<number>
        getSettings: () => Promise<AppSettings>
        updateSettings: (settings: AppSettings) => Promise<{ success: boolean }>
        getStats: () => Promise<DashboardStats>
        exportCSV: () => Promise<{ success: boolean; filePath?: string }>
        getStockSummary: () => Promise<StockSummary[]>
        getStockEntries: (productId?: number) => Promise<StockEntry[]>
        addStockEntry: (data: { product_id: number; type: 'stock_in' | 'adjustment'; quantity_change: number; note?: string }) => Promise<StockEntry>
        exportStockCSV: () => Promise<{ success: boolean; filePath?: string }>
      }
      print: {
        label: (data: { html: string; printerName: string; labelSize: string }) => Promise<{ success: boolean; error?: string }>
        getPrinters: () => Promise<{ name: string; displayName: string }[]>
      }
      dialog: {
        saveFile: (options: unknown) => Promise<{ filePath?: string; canceled: boolean }>
        openFile: (options: unknown) => Promise<{ filePaths: string[]; canceled: boolean }>
      }
      dataManagement: {
        exportData: (targetPath?: string) => Promise<DataExportResult>
        previewImport: (filePath?: string) => Promise<ImportPreviewResult>
        executeImport: (filePath: string, duplicatePolicy?: 'skip' | 'replace' | 'merge') => Promise<ImportExecutionResult>
        backup: () => Promise<BackupResult>
        restore: (backupPath?: string) => Promise<RestoreResult>
        reset: () => Promise<ResetResult>
      }
    }
  }
}
