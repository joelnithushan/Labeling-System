import type { AppSettings, Barcode, Product } from '../types'

export type DataTableKey = 'products' | 'barcodes' | 'settings' | 'login_credentials'
export type DuplicatePolicy = 'skip' | 'replace' | 'merge'
export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'json'

export interface ColumnDefinition {
  key: string
  label: string
  type: ColumnType
  required?: boolean
  exportable?: boolean
  importable?: boolean
  sensitive?: boolean
  unique?: boolean
  aliases?: string[]
  defaultValue?: string | number | boolean | null
}

export interface TableDefinition<RowType = Record<string, unknown>> {
  key: DataTableKey | string
  sheetName: string
  sourceTable?: string
  description: string
  exportable: boolean
  importable: boolean
  autoDetect?: boolean
  synthetic?: boolean
  columns: ColumnDefinition[]
  primaryKey?: string[]
  uniqueKeys?: string[][]
  exportFilter?: (row: Record<string, unknown>) => boolean
  exportMap?: (row: Record<string, unknown>) => Record<string, unknown> | null
  importMap?: (row: Record<string, unknown>) => Record<string, unknown> | null
  rowTypeHint?: RowType
}

export interface RegistrySummary {
  key: string
  sheetName: string
  sourceTable?: string
  description: string
  exportable: boolean
  importable: boolean
  synthetic?: boolean
  columns: string[]
  uniqueKeys: string[][]
}

export interface DynamicTableDefinition {
  tableName: string
  sheetName: string
  columns: ColumnDefinition[]
  description?: string
  exportable?: boolean
  importable?: boolean
  autoDetect?: boolean
  primaryKey?: string[]
  uniqueKeys?: string[][]
}

export interface LoginCredentialsExportRow {
  username: string
  password_status: 'masked' | 'not-exported'
  password_reference: string
}

export interface SettingsExportRow {
  key: string
  value: string
}

export interface TableSnapshot<RowType = Record<string, unknown>> {
  definition: TableDefinition<RowType>
  rows: RowType[]
}

export const SECURE_SETTING_KEYS = ['password'] as const

export const SYSTEM_TABLE_PREFIXES = ['sqlite_'] as const

export const TABLE_REGISTRY = {
  products: {
    key: 'products',
    sheetName: 'Products',
    sourceTable: 'products',
    description: 'Product records',
    exportable: true,
    importable: true,
    autoDetect: true,
    columns: [
      { key: 'id', label: 'id', type: 'number', exportable: true, importable: false, unique: true },
      { key: 'name', label: 'name', type: 'string', required: true, exportable: true, importable: true },
      { key: 'category', label: 'category', type: 'string', required: true, exportable: true, importable: true },
      { key: 'weight', label: 'weight', type: 'string', required: true, exportable: true, importable: true },
      { key: 'weight_unit', label: 'weight_unit', type: 'string', required: true, exportable: true, importable: true },
      { key: 'price', label: 'price', type: 'number', required: true, exportable: true, importable: true },
      { key: 'shelf_life_days', label: 'shelf_life_days', type: 'number', required: true, exportable: true, importable: true, defaultValue: 180 },
      { key: 'created_at', label: 'created_at', type: 'date', exportable: true, importable: false },
    ],
    primaryKey: ['id'],
    uniqueKeys: [['name', 'category', 'weight', 'weight_unit']],
  } satisfies TableDefinition<Product>,
  barcodes: {
    key: 'barcodes',
    sheetName: 'Barcodes',
    sourceTable: 'barcodes',
    description: 'Printed barcode records',
    exportable: true,
    importable: true,
    autoDetect: true,
    columns: [
      { key: 'id', label: 'id', type: 'number', exportable: true, importable: false, unique: true },
      { key: 'product_id', label: 'product_id', type: 'number', exportable: true, importable: true },
      { key: 'product_name', label: 'product_name', type: 'string', required: true, exportable: true, importable: true },
      { key: 'category', label: 'category', type: 'string', required: true, exportable: true, importable: true },
      { key: 'weight', label: 'weight', type: 'string', required: true, exportable: true, importable: true },
      { key: 'weight_unit', label: 'weight_unit', type: 'string', required: true, exportable: true, importable: true },
      { key: 'price', label: 'price', type: 'number', required: true, exportable: true, importable: true },
      { key: 'serial_number', label: 'serial_number', type: 'string', required: true, exportable: true, importable: true, unique: true },
      { key: 'barcode_value', label: 'barcode_value', type: 'string', required: true, exportable: true, importable: true },
      { key: 'quantity', label: 'quantity', type: 'number', required: true, exportable: true, importable: true, defaultValue: 1 },
      { key: 'mfg_date', label: 'mfg_date', type: 'date', required: true, exportable: true, importable: true },
      { key: 'exp_date', label: 'exp_date', type: 'date', required: true, exportable: true, importable: true },
      { key: 'printed_at', label: 'printed_at', type: 'date', exportable: true, importable: false },
    ],
    primaryKey: ['id'],
    uniqueKeys: [['serial_number']],
  } satisfies TableDefinition<Barcode>,
  settings: {
    key: 'settings',
    sheetName: 'Settings',
    sourceTable: 'settings',
    description: 'Application settings as key/value rows',
    exportable: true,
    importable: true,
    columns: [
      { key: 'key', label: 'key', type: 'string', required: true, exportable: true, importable: true, unique: true },
      { key: 'value', label: 'value', type: 'string', required: true, exportable: true, importable: true },
    ],
    uniqueKeys: [['key']],
    exportFilter: row => !isSecureSettingKey(String(row.key ?? '')),
    importMap: row => {
      const key = String(row.key ?? '').trim()
      if (!key || isSecureSettingKey(key)) return null
      return { key, value: String(row.value ?? '') }
    },
  } satisfies TableDefinition<SettingsExportRow>,
  login_credentials: {
    key: 'login_credentials',
    sheetName: 'Login Credentials',
    sourceTable: 'settings',
    description: 'Non-sensitive login identity export',
    exportable: true,
    importable: true,
    synthetic: true,
    columns: [
      { key: 'username', label: 'username', type: 'string', required: true, exportable: true, importable: true, unique: true },
      { key: 'password_status', label: 'password_status', type: 'string', required: true, exportable: true, importable: false },
      { key: 'password_reference', label: 'password_reference', type: 'string', required: true, exportable: true, importable: false },
    ],
    uniqueKeys: [['username']],
    exportFilter: row => String(row.key ?? '') === 'username',
    exportMap: row => {
      const username = String(row.value ?? '').trim()
      if (!username) return null
      return {
        username,
        password_status: 'masked' as const,
        password_reference: buildMaskedCredentialReference(username),
      }
    },
    importMap: row => {
      const username = String(row.username ?? '').trim()
      if (!username) return null
      return { key: 'username', value: username }
    },
  } satisfies TableDefinition<LoginCredentialsExportRow>,
} as const

export type RegistryKey = keyof typeof TABLE_REGISTRY
export type RegistryTableDefinition = (typeof TABLE_REGISTRY)[RegistryKey]

export function isSecureSettingKey(key: string): boolean {
  return SECURE_SETTING_KEYS.includes(key.toLowerCase() as (typeof SECURE_SETTING_KEYS)[number])
}

export function buildMaskedCredentialReference(username: string): string {
  const trimmed = username.trim()
  if (!trimmed) return 'masked'
  return `${trimmed.slice(0, 2)}${'*'.repeat(Math.max(3, trimmed.length - 2))}`
}

export function getTableDefinition(key: RegistryKey): RegistryTableDefinition {
  return TABLE_REGISTRY[key]
}

export function getExportableDefinitions(): RegistryTableDefinition[] {
  return Object.values(TABLE_REGISTRY).filter(definition => definition.exportable)
}

export function getImportableDefinitions(): RegistryTableDefinition[] {
  return Object.values(TABLE_REGISTRY).filter(definition => definition.importable)
}

export function getDefinitionBySheetName(sheetName: string): RegistryTableDefinition | undefined {
  const normalized = sheetName.trim().toLowerCase()
  return Object.values(TABLE_REGISTRY).find(definition => definition.sheetName.trim().toLowerCase() === normalized)
}

export function getDefinitionBySourceTable(tableName: string): RegistryTableDefinition[] {
  return Object.values(TABLE_REGISTRY).filter(definition => definition.sourceTable === tableName)
}

export function getRegisteredSheetNames(): string[] {
  return getExportableDefinitions().map(definition => definition.sheetName)
}

export function getRegisteredSourceTables(): string[] {
  return [...new Set(Object.values(TABLE_REGISTRY).map(definition => definition.sourceTable).filter(Boolean) as string[])]
}

export function getExportableColumns<RowType>(definition: TableDefinition<RowType>): ColumnDefinition[] {
  return definition.columns.filter(column => column.exportable !== false)
}

export function getImportableColumns<RowType>(definition: TableDefinition<RowType>): ColumnDefinition[] {
  return definition.columns.filter(column => column.importable !== false)
}

export function getRequiredColumns<RowType>(definition: TableDefinition<RowType>): ColumnDefinition[] {
  return definition.columns.filter(column => column.required)
}

export function getSensitiveColumns<RowType>(definition: TableDefinition<RowType>): ColumnDefinition[] {
  return definition.columns.filter(column => column.sensitive)
}

export function isSensitiveColumnName(columnName: string): boolean {
  const normalized = columnName.toLowerCase()
  return normalized.includes('password') || normalized.includes('secret') || normalized.includes('token')
}

export function normalizeRegistryKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

export function normalizeSheetName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function defaultExportColumnOrder<RowType>(definition: TableDefinition<RowType>): string[] {
  return getExportableColumns(definition).map(column => column.label)
}

export function getExportSheetNames(): string[] {
  return getExportableDefinitions().map(definition => definition.sheetName)
}

export function isSystemTableName(tableName: string): boolean {
  const normalized = tableName.trim().toLowerCase()
  return SYSTEM_TABLE_PREFIXES.some(prefix => normalized.startsWith(prefix))
}

export function shouldExportDetectedTable(tableName: string): boolean {
  return !isSystemTableName(tableName) && Boolean(getDefinitionBySourceTable(tableName).length || tableName.length)
}

export function createDynamicTableDefinition(input: DynamicTableDefinition): TableDefinition {
  return {
    key: normalizeRegistryKey(input.tableName),
    sheetName: input.sheetName,
    sourceTable: input.tableName,
    description: input.description ?? `Detected table ${input.tableName}`,
    exportable: input.exportable ?? true,
    importable: input.importable ?? true,
    autoDetect: input.autoDetect ?? true,
    columns: input.columns,
    primaryKey: input.primaryKey,
    uniqueKeys: input.uniqueKeys,
  }
}

export function listRegistrySummary(): RegistrySummary[] {
  return Object.values(TABLE_REGISTRY).map(definition => ({
    key: definition.key,
    sheetName: definition.sheetName,
    sourceTable: definition.sourceTable,
    description: definition.description,
    exportable: definition.exportable,
    importable: definition.importable,
    synthetic: Boolean((definition as { synthetic?: boolean }).synthetic),
    columns: definition.columns.map(column => column.label),
    uniqueKeys: definition.uniqueKeys ?? [],
  }))
}

export function isExportBlockedColumn(columnName: string): boolean {
  return isSensitiveColumnName(columnName)
}

export function getTableSheetsForSource(tableName: string): string[] {
  return getDefinitionBySourceTable(tableName).map(definition => definition.sheetName)
}
