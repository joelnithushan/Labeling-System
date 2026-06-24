import Database from 'better-sqlite3'
import ExcelJS from 'exceljs'
import { app, dialog, shell, type IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import {
  createDynamicTableDefinition,
  defaultExportColumnOrder,
  getDefinitionBySourceTable,
  getExportableColumns,
  getExportableDefinitions,
  getExportSheetNames,
  getRegisteredSourceTables,
  isExportBlockedColumn,
  isSensitiveColumnName,
  normalizeRegistryKey,
  normalizeSheetName,
  normalizeText,
  shouldExportDetectedTable,
  type ColumnDefinition,
  type RegistryTableDefinition,
  type TableDefinition,
} from '../src/utils/dataSchemas'
import {
  getDatabasePath,
  getDb,
  initSchema,
} from './db'
import {
  buildPreviewIssueSummary,
  evaluateDuplicateDecision,
  getRowIdentity,
  mapHeadersToColumns,
  normalizeCredentialExport,
  normalizeImportedRow,
  normalizeText as normalizeValidationText,
  validateDuplicatePolicy,
  validateExportableDefinition,
  validateHeaderRow,
  validateImportableDefinition,
  validateNonEmptyRow,
  type ImportPreviewResult,
  type PreviewSheet,
  type ValidationIssue,
} from '../src/utils/dataValidation'

export interface StructuredIssue {
  code: string
  message: string
  tableName?: string
  sheetName?: string
  path?: string
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

export interface ExportSheetSummary {
  sheetName: string
  sourceTable: string
  rowCount: number
  columns: string[]
  maskedColumns: string[]
  dynamic: boolean
}

export interface ExportResult {
  success: boolean
  filePath?: string
  timestamp: string
  warnings: StructuredIssue[]
  errors: StructuredIssue[]
  sheetSummary: ExportSheetSummary[]
}

export interface UserTableSummary {
  name: string
  rowCount: number
}

const BACKUP_FOLDER_NAME = 'backups'
const EXPORT_FOLDER_NAME = 'exports'

function toTimestampToken(date = new Date()) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`
}

function toIsoTimestamp(date = new Date()) {
  return date.toISOString()
}

function getBackupFolder() {
  const folder = path.join(app.getPath('userData'), BACKUP_FOLDER_NAME)
  fs.mkdirSync(folder, { recursive: true })
  return folder
}

function getExportFolder() {
  const folder = path.join(app.getPath('userData'), EXPORT_FOLDER_NAME)
  fs.mkdirSync(folder, { recursive: true })
  return folder
}

function getBackupPath(date = new Date()) {
  return path.join(getBackupFolder(), `backup_${toTimestampToken(date)}.db`)
}

function getExportPath(date = new Date()) {
  return path.join(getExportFolder(), `system_data_${toTimestampToken(date)}.xlsx`)
}

function quoteSqlIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

function getLiveUserTables(db: Database.Database) {
  return db
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name ASC
      `,
    )
    .all() as { name: string }[]
}

function getTableColumns(db: Database.Database, tableName: string) {
  return db.pragma(`table_info(${quoteSqlIdentifier(tableName)})`, { simple: false }) as Array<{
    cid: number
    name: string
    type: string
    notnull: number
    dflt_value: string | null
    pk: number
  }>
}

function isExportableSQLiteTable(tableName: string) {
  return shouldExportDetectedTable(tableName) && !tableName.startsWith('sqlite_')
}

function inferColumnType(sqliteType: string): ColumnDefinition['type'] {
  const normalized = sqliteType.trim().toLowerCase()
  if (normalized.includes('int') || normalized.includes('real') || normalized.includes('num') || normalized.includes('double') || normalized.includes('float')) {
    return 'number'
  }
  if (normalized.includes('bool')) return 'boolean'
  if (normalized.includes('date') || normalized.includes('time')) return 'date'
  if (normalized.includes('json')) return 'json'
  return 'string'
}

function createSheetNameResolver(existing: Set<string>) {
  return (desiredName: string) => {
    const cleaned = normalizeSheetName(desiredName)
      .replace(/[\\/?*\[\]:]/g, ' ')
      .trim()

    const base = (cleaned || 'Sheet').slice(0, 31)
    let candidate = base
    let index = 2

    while (existing.has(candidate)) {
      const suffix = `_${index}`
      candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
      index += 1
    }

    existing.add(candidate)
    return candidate
  }
}

function rowsFromQuery(db: Database.Database, tableName: string, orderColumns: string[] = []) {
  const orderBy = orderColumns.length
    ? ` ORDER BY ${orderColumns.map(column => quoteSqlIdentifier(column)).join(', ')}`
    : ''
  return db.prepare(`SELECT * FROM ${quoteSqlIdentifier(tableName)}${orderBy}`).all() as Record<string, unknown>[]
}

function getRegisteredRowsForDefinition(db: Database.Database, definition: RegistryTableDefinition) {
  const sourceTable = definition.sourceTable ?? definition.key

  if (definition.key === 'login_credentials') {
    const usernameRow = db.prepare(`SELECT key, value FROM ${quoteSqlIdentifier(sourceTable)} WHERE key = 'username' LIMIT 1`).get() as { key: string; value: string } | undefined
    if (!usernameRow) return [] as Record<string, unknown>[]
    const credential = normalizeCredentialExport(usernameRow.value)
    return [credential]
  }

  if (definition.key === 'settings') {
    const rows = db
      .prepare(`SELECT key, value FROM ${quoteSqlIdentifier(sourceTable)} ORDER BY key ASC`)
      .all() as Array<{ key: string; value: string }>

    return rows
      .filter(row => row.key !== 'password')
      .map(row => ({ key: row.key, value: row.value }))
  }

  const orderColumns = definition.primaryKey?.length
    ? definition.primaryKey
    : definition.columns.find(column => column.key === 'id')
      ? ['id']
      : []

  return rowsFromQuery(db, sourceTable, orderColumns)
}

function getDynamicTableDefinition(db: Database.Database, tableName: string): TableDefinition {
  const columns = getTableColumns(db, tableName).map(column => {
    const sensitive = isSensitiveColumnName(column.name)
    return {
      key: column.name,
      label: column.name,
      type: inferColumnType(column.type),
      exportable: !sensitive,
      importable: false,
      sensitive,
      unique: Boolean(column.pk),
    }
  })

  return createDynamicTableDefinition({
    tableName,
    sheetName: tableName,
    columns,
    description: `Detected SQLite table ${tableName}`,
    exportable: true,
    importable: false,
    autoDetect: true,
  })
}

function getExportDefinitions(db: Database.Database) {
  const registered = getExportableDefinitions()
  const registeredSourceTables = new Set(getRegisteredSourceTables())
  const liveTables = getLiveUserTables(db)
  const dynamicDefinitions: TableDefinition[] = []

  for (const table of liveTables) {
    if (!isExportableSQLiteTable(table.name)) continue
    if (registeredSourceTables.has(table.name)) continue
    dynamicDefinitions.push(getDynamicTableDefinition(db, table.name))
  }

  return [...registered, ...dynamicDefinitions]
}

function buildExportRows(definition: TableDefinition, db: Database.Database) {
  if (definition.key === 'login_credentials') {
    return getRegisteredRowsForDefinition(db, definition as RegistryTableDefinition)
  }

  if (definition.key === 'settings') {
    return getRegisteredRowsForDefinition(db, definition as RegistryTableDefinition)
  }

  const sourceTable = definition.sourceTable ?? definition.key
  return rowsFromQuery(db, sourceTable, definition.primaryKey ?? (definition.columns.some(column => column.key === 'id') ? ['id'] : []))
}

function applyRowMasking(definition: TableDefinition, row: Record<string, unknown>) {
  const output: Record<string, unknown> = {}

  for (const column of definition.columns) {
    if (column.exportable === false) continue

    const value = row[column.key]
    if (column.sensitive || isExportBlockedColumn(column.key)) {
      output[column.key] = '[redacted]'
      continue
    }

    if (value === undefined) continue
    output[column.key] = value
  }

  return output
}

function addDefinitionSheet(workbook: ExcelJS.Workbook, definition: TableDefinition, rows: Record<string, unknown>[]) {
  const sheetName = definition.sheetName
  const columns = definition.columns.filter(column => column.exportable !== false)
  const sheet = workbook.addWorksheet(sheetName)

  sheet.columns = columns.map(column => ({
    header: column.label,
    key: column.key,
    width: Math.max(14, column.label.length + 4),
  }))

  if (rows.length) {
    sheet.addRows(rows)
  }

  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

export async function exportAllSystemDataWorkbook(targetPath?: string): Promise<ExportResult> {
  const timestamp = toIsoTimestamp()
  const warnings: StructuredIssue[] = []
  const errors: StructuredIssue[] = []
  const sheetSummary: ExportSheetSummary[] = []

  let resolvedPath = targetPath
  if (!resolvedPath) {
    const result = await dialog.showSaveDialog({
      title: 'Export System Data',
      defaultPath: getExportPath(),
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
    })

    if (result.canceled || !result.filePath) {
      return {
        success: false,
        timestamp,
        warnings,
        errors: [{ code: 'export_cancelled', message: 'Export was cancelled by the user.' }],
        sheetSummary,
      }
    }

    resolvedPath = result.filePath
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = app.getName()
  workbook.lastModifiedBy = app.getName()
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.subject = 'Mill Label System Data Export'
  workbook.title = 'Mill Label System Data Export'

  try {
    const db = getDb()
    const definitions = getExportDefinitions(db)
    const sheetNameResolver = createSheetNameResolver(new Set())

    for (const definition of definitions) {
      const validation = validateExportableDefinition(definition)
      warnings.push(...validation.issues.map(issue => ({
        code: issue.code,
        message: issue.message,
        tableName: issue.tableName,
        sheetName: issue.sheetName,
      })))

      const rows = buildExportRows(definition, db).map(row => applyRowMasking(definition, row))
      const exportSheetName = sheetNameResolver(definition.sheetName)
      const finalDefinition: TableDefinition = { ...definition, sheetName: exportSheetName }

      addDefinitionSheet(workbook, finalDefinition, rows)

      const maskedColumns = definition.columns.filter(column => column.sensitive || isSensitiveColumnName(column.key)).map(column => column.key)
      sheetSummary.push({
        sheetName: exportSheetName,
        sourceTable: definition.sourceTable ?? definition.key,
        rowCount: rows.length,
        columns: definition.columns.filter(column => column.exportable !== false).map(column => column.key),
        maskedColumns,
        dynamic: Boolean(definition.autoDetect),
      })
    }

    const metadataSheet = workbook.addWorksheet('Export Info')
    metadataSheet.columns = [
      { header: 'key', key: 'key', width: 24 },
      { header: 'value', key: 'value', width: 60 },
    ]
    metadataSheet.addRows([
      { key: 'exported_at', value: timestamp },
      { key: 'app_name', value: app.getName() },
      { key: 'registered_sheets', value: getExportSheetNames().join(', ') },
    ])
    metadataSheet.getRow(1).font = { bold: true }

    await workbook.xlsx.writeFile(resolvedPath)
    shell.showItemInFolder(resolvedPath)

    return {
      success: true,
      filePath: resolvedPath,
      timestamp,
      warnings,
      errors,
      sheetSummary,
    }
  } catch (error) {
    errors.push({
      code: 'export_failed',
      message: error instanceof Error ? error.message : 'Failed to export data workbook.',
      path: resolvedPath,
    })

    return {
      success: false,
      filePath: resolvedPath,
      timestamp,
      warnings,
      errors,
      sheetSummary,
    }
  }
}

export interface ImportSheetPreview extends PreviewSheet {
  rowCount: number
  dynamic: boolean
  detectedTable?: string
}

export interface ImportPreviewPayload {
  success: boolean
  filePath?: string
  fileName: string
  extension: '.xlsx' | '.csv'
  sheets: ImportSheetPreview[]
  warnings: StructuredIssue[]
  errors: StructuredIssue[]
}

export interface ImportSheetExecutionSummary {
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
  tableSummary: ImportSheetExecutionSummary[]
}

function getExtension(filePath: string): '.xlsx' | '.csv' | null {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.xlsx')) return '.xlsx'
  if (lower.endsWith('.csv')) return '.csv'
  return null
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const nextCharacter = line[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += character
  }

  cells.push(current)
  return cells.map(cell => cell.trim())
}

function parseCsvContent(content: string) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim().length > 0)
  const headers = lines.length ? parseCsvLine(lines[0]) : []
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    const row: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })

  return { headers, rows }
}

function rowToRecord(headers: string[], rowValues: unknown[]) {
  const row: Record<string, unknown> = {}
  headers.forEach((header, index) => {
    row[header] = rowValues[index]
  })
  return row
}

function isEmptyRecord(row: Record<string, unknown>) {
  return Object.values(row).every(value => value === null || value === undefined || normalizeValidationText(value).trim() === '')
}

function getSheetValues(worksheet: ExcelJS.Worksheet) {
  const headers = (worksheet.getRow(1).values as unknown[]).slice(1).map(value => normalizeValidationText(value))
  const rows: Record<string, unknown>[] = []

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const values = worksheet.getRow(rowIndex).values as unknown[]
    const record = rowToRecord(headers, values.slice(1))
    if (!isEmptyRecord(record)) rows.push(record)
  }

  return { headers, rows }
}

function getLiveTableDefinition(db: Database.Database, tableName: string): TableDefinition {
  const columns = getTableColumns(db, tableName).map(column => ({
    key: column.name,
    label: column.name,
    type: inferColumnType(column.type),
    required: Boolean(column.notnull),
    exportable: !isSensitiveColumnName(column.name),
    importable: !isSensitiveColumnName(column.name),
    sensitive: isSensitiveColumnName(column.name),
    unique: Boolean(column.pk),
  }))

  return createDynamicTableDefinition({
    tableName,
    sheetName: tableName,
    columns,
    description: `Detected table ${tableName}`,
    exportable: true,
    importable: true,
    autoDetect: true,
  })
}

function buildImportCandidates(db: Database.Database) {
  const definitions = [...getExportableDefinitions(), ...getImportableDefinitions()]
  const bySheet = new Map<string, TableDefinition>()

  for (const definition of definitions) {
    bySheet.set(definition.sheetName.trim().toLowerCase(), definition)
  }

  for (const table of getLiveUserTables(db)) {
    const liveDefinition = getLiveTableDefinition(db, table.name)
    bySheet.set(table.name.trim().toLowerCase(), liveDefinition)
    bySheet.set(liveDefinition.sheetName.trim().toLowerCase(), liveDefinition)
  }

  return bySheet
}

function findImportDefinition(db: Database.Database, sheetName: string, headers: string[]) {
  const candidates = buildImportCandidates(db)
  const exact = candidates.get(sheetName.trim().toLowerCase())
  if (exact) return exact

  for (const definition of candidates.values()) {
    const validation = validateHeaderRow(headers, definition)
    if (validation.valid) return definition
  }

  return undefined
}

function readImportSource(filePath: string) {
  const extension = getExtension(filePath)
  if (!extension) {
    throw new Error('Unsupported file type. Only .xlsx and .csv are allowed.')
  }

  if (extension === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8')
    const parsed = parseCsvContent(content)
    return {
      extension,
      sheets: [
        {
          sheetName: path.basename(filePath, path.extname(filePath)),
          headers: parsed.headers,
          rows: parsed.rows,
        },
      ],
    }
  }

  const workbook = new ExcelJS.Workbook()
  return workbook.xlsx.readFile(filePath).then(() => ({
    extension,
    sheets: workbook.worksheets.map(worksheet => {
      const { headers, rows } = getSheetValues(worksheet)
      return {
        sheetName: worksheet.name,
        headers,
        rows,
      }
    }),
  }))
}

export async function previewImportFile(filePath?: string): Promise<ImportPreviewPayload> {
  const warnings: StructuredIssue[] = []
  const errors: StructuredIssue[] = []
  const timestamp = toIsoTimestamp()

  let selectedPath = filePath
  if (!selectedPath) {
    const result = await dialog.showOpenDialog({
      title: 'Import Data',
      properties: ['openFile'],
      filters: [
        { name: 'Excel Workbook', extensions: ['xlsx'] },
        { name: 'CSV File', extensions: ['csv'] },
      ],
    })

    if (result.canceled || !result.filePaths[0]) {
      return {
        success: false,
        fileName: '',
        extension: '.csv',
        sheets: [],
        warnings,
        errors: [{ code: 'import_cancelled', message: 'Import was cancelled by the user.' }],
      }
    }

    selectedPath = result.filePaths[0]
  }

  try {
    const parsed = await readImportSource(selectedPath)
    const db = getDb()
    const sheetPreviews: ImportSheetPreview[] = []

    for (const sheet of parsed.sheets) {
      const definition = findImportDefinition(db, sheet.sheetName, sheet.headers)
      const previewRows = sheet.rows.slice(0, 5)
      const issues: ValidationIssue[] = []

      if (!definition) {
        issues.push({
          severity: 'warning',
          code: 'unmatched_sheet',
          sheetName: sheet.sheetName,
          message: `Could not determine import target for sheet "${sheet.sheetName}".`,
        })
        warnings.push({ code: 'unmatched_sheet', message: `Could not determine import target for sheet "${sheet.sheetName}".`, sheetName: sheet.sheetName })
      } else {
        const headerValidation = validateHeaderRow(sheet.headers, definition)
        issues.push(...headerValidation.issues)
        warnings.push(...headerValidation.issues.filter(issue => issue.severity !== 'error').map(issue => ({
          code: issue.code,
          message: issue.message,
          tableName: issue.tableName,
          sheetName: issue.sheetName,
        })))

        for (const row of previewRows) {
          const normalized = normalizeImportedRow(definition, row)
          issues.push(...normalized.issues)
        }
      }

      sheetPreviews.push({
        tableName: definition?.sourceTable ?? definition?.key ?? sheet.sheetName,
        sheetName: sheet.sheetName,
        headers: sheet.headers,
        rows: previewRows,
        issues,
        rowCount: sheet.rows.length,
        dynamic: Boolean(definition?.autoDetect),
        detectedTable: definition?.sourceTable ?? definition?.key,
      })
    }

    return {
      success: true,
      filePath: selectedPath,
      fileName: path.basename(selectedPath),
      extension: parsed.extension,
      sheets: sheetPreviews,
      warnings,
      errors,
    }
  } catch (error) {
    errors.push({
      code: 'import_preview_failed',
      message: error instanceof Error ? error.message : 'Failed to preview import file.',
      path: selectedPath,
    })
    return {
      success: false,
      filePath: selectedPath,
      fileName: path.basename(selectedPath),
      extension: getExtension(selectedPath) ?? '.csv',
      sheets: [],
      warnings,
      errors,
    }
  }
}

function getTableLookupValue(definition: TableDefinition, row: Record<string, unknown>) {
  if (definition.uniqueKeys?.length) {
    return definition.uniqueKeys[0].map(key => normalizeValidationText(row[key] ?? '')).join('|')
  }

  if (definition.primaryKey?.length) {
    return definition.primaryKey.map(key => normalizeValidationText(row[key] ?? '')).join('|')
  }

  return ''
}

function findExistingRecord(db: Database.Database, definition: TableDefinition, row: Record<string, unknown>) {
  const sourceTable = definition.sourceTable ?? definition.key

  if (definition.key === 'login_credentials') {
    return db.prepare(`SELECT key, value FROM ${quoteSqlIdentifier(sourceTable)} WHERE key = 'username' LIMIT 1`).get() as Record<string, unknown> | undefined
  }

  if (definition.key === 'settings') {
    const key = normalizeValidationText(row.key ?? row.name ?? '')
    if (!key) return undefined
    return db.prepare(`SELECT key, value FROM ${quoteSqlIdentifier(sourceTable)} WHERE key = ? LIMIT 1`).get(key) as Record<string, unknown> | undefined
  }

  if (definition.key === 'barcodes') {
    const serial = normalizeValidationText(row.serial_number ?? '')
    if (!serial) return undefined
    return db.prepare(`SELECT * FROM ${quoteSqlIdentifier(sourceTable)} WHERE serial_number = ? LIMIT 1`).get(serial) as Record<string, unknown> | undefined
  }

  const lookupValue = getTableLookupValue(definition, row)
  if (!lookupValue) return undefined

  if (definition.primaryKey?.length && row[definition.primaryKey[0]] !== undefined) {
    const key = normalizeValidationText(row[definition.primaryKey[0]] ?? '')
    if (key) {
      return db.prepare(`SELECT * FROM ${quoteSqlIdentifier(sourceTable)} WHERE ${quoteSqlIdentifier(definition.primaryKey[0])} = ? LIMIT 1`).get(key) as Record<string, unknown> | undefined
    }
  }

  return undefined
}

function mergeIncomingRow(existing: Record<string, unknown>, incoming: Record<string, unknown>) {
  return Object.entries(incoming).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
    if (value !== undefined && value !== null && normalizeValidationText(value) !== '') {
      accumulator[key] = value
    } else if (existing[key] !== undefined) {
      accumulator[key] = existing[key]
    }
    return accumulator
  }, { ...existing })
}

function upsertRegisteredRow(db: Database.Database, definition: TableDefinition, row: Record<string, unknown>, policy: 'skip' | 'replace' | 'merge') {
  const sourceTable = definition.sourceTable ?? definition.key
  const existing = findExistingRecord(db, definition, row)

  if (existing && policy === 'skip') {
    return { imported: false, skippedDuplicate: true, invalid: false }
  }

  if (definition.key === 'login_credentials') {
    const username = normalizeValidationText(row.username ?? row.value ?? '')
    if (!username) {
      return { imported: false, skippedDuplicate: false, invalid: true }
    }

    const stmt = db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    stmt.run('username', username)
    return { imported: true, skippedDuplicate: false, invalid: false }
  }

  if (definition.key === 'settings') {
    const key = normalizeValidationText(row.key ?? '')
    const value = normalizeValidationText(row.value ?? '')
    if (!key) {
      return { imported: false, skippedDuplicate: false, invalid: true }
    }

    if (policy === 'merge' && existing) {
      const merged = mergeIncomingRow(existing, { key, value })
      db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(merged.key, merged.value)
      return { imported: true, skippedDuplicate: false, invalid: false }
    }

    db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value)
    return { imported: true, skippedDuplicate: false, invalid: false }
  }

  if (definition.key === 'barcodes') {
    const columns = definition.columns.filter(column => column.importable !== false).map(column => column.key)
    const values = columns.map(column => row[column])
    const insertColumns = columns.map(column => quoteSqlIdentifier(column)).join(', ')
    const placeholders = columns.map(() => '?').join(', ')
    const updateAssignments = columns.filter(column => column !== 'id').map(column => `${quoteSqlIdentifier(column)} = excluded.${quoteSqlIdentifier(column)}`).join(', ')

    if (policy === 'merge' && existing) {
      const merged = mergeIncomingRow(existing, row)
      const stmt = db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (${insertColumns}) VALUES (${placeholders}) ON CONFLICT(serial_number) DO UPDATE SET ${updateAssignments}`)
      stmt.run(...columns.map(column => merged[column]))
      return { imported: true, skippedDuplicate: false, invalid: false }
    }

    const stmt = db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (${insertColumns}) VALUES (${placeholders}) ON CONFLICT(serial_number) DO UPDATE SET ${updateAssignments}`)
    stmt.run(...values)
    return { imported: true, skippedDuplicate: false, invalid: false }
  }

  if (definition.key === 'products') {
    const columns = definition.columns.filter(column => column.importable !== false).map(column => column.key)
    const values = columns.map(column => row[column])
    const insertColumns = columns.map(column => quoteSqlIdentifier(column)).join(', ')
    const placeholders = columns.map(() => '?').join(', ')

    if (existing && policy === 'merge') {
      const merged = mergeIncomingRow(existing, row)
      const updateColumns = columns.filter(column => column !== 'id')
      const assignments = updateColumns.map(column => `${quoteSqlIdentifier(column)} = excluded.${quoteSqlIdentifier(column)}`).join(', ')
      const stmt = db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (${insertColumns}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${assignments}`)
      stmt.run(...columns.map(column => merged[column]))
      return { imported: true, skippedDuplicate: false, invalid: false }
    }

    const stmt = db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (${insertColumns}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${columns.filter(column => column !== 'id').map(column => `${quoteSqlIdentifier(column)} = excluded.${quoteSqlIdentifier(column)}`).join(', ')}`)
    stmt.run(...values)
    return { imported: true, skippedDuplicate: false, invalid: false }
  }

  const columns = definition.columns.filter(column => column.importable !== false).map(column => column.key)
  if (!columns.length) return { imported: false, skippedDuplicate: false, invalid: true }

  const insertColumns = columns.map(column => quoteSqlIdentifier(column)).join(', ')
  const placeholders = columns.map(() => '?').join(', ')
  const setAssignments = columns.filter(column => column !== definition.primaryKey?.[0]).map(column => `${quoteSqlIdentifier(column)} = excluded.${quoteSqlIdentifier(column)}`).join(', ')

  if (!definition.primaryKey?.length) {
    const stmt = db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (${insertColumns}) VALUES (${placeholders})`)
    stmt.run(...columns.map(column => row[column]))
    return { imported: true, skippedDuplicate: false, invalid: false }
  }

  if (existing && policy === 'merge') {
    const merged = mergeIncomingRow(existing, row)
    const stmt = db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (${insertColumns}) VALUES (${placeholders}) ON CONFLICT(${quoteSqlIdentifier(definition.primaryKey[0])}) DO UPDATE SET ${setAssignments}`)
    stmt.run(...columns.map(column => merged[column]))
    return { imported: true, skippedDuplicate: false, invalid: false }
  }

  const stmt = db.prepare(`INSERT INTO ${quoteSqlIdentifier(sourceTable)} (${insertColumns}) VALUES (${placeholders}) ON CONFLICT(${quoteSqlIdentifier(definition.primaryKey[0])}) DO UPDATE SET ${setAssignments}`)
  stmt.run(...columns.map(column => row[column]))
  return { imported: true, skippedDuplicate: false, invalid: false }
}

export async function executeImportFile(filePath: string, duplicatePolicy: DuplicatePolicy = 'skip'): Promise<ImportExecutionResult> {
  const timestamp = toIsoTimestamp()
  const warnings: StructuredIssue[] = []
  const errors: StructuredIssue[] = []
  const tableSummary: ImportSheetExecutionSummary[] = []
  let importedCount = 0
  let skippedDuplicates = 0
  let invalidCount = 0

  if (!validateDuplicatePolicy(duplicatePolicy)) {
    return {
      success: false,
      filePath,
      timestamp,
      importedCount: 0,
      skippedDuplicates: 0,
      invalidCount: 0,
      warnings,
      errors: [{ code: 'invalid_duplicate_policy', message: `Unsupported duplicate policy: ${String(duplicatePolicy)}` }],
      tableSummary,
    }
  }

  try {
    const parsed = await readImportSource(filePath)
    const db = getDb()

    for (const sheet of parsed.sheets) {
      const definition = findImportDefinition(db, sheet.sheetName, sheet.headers)
      const sheetWarnings: StructuredIssue[] = []
      const sheetErrors: StructuredIssue[] = []
      let sheetImported = 0
      let sheetSkipped = 0
      let sheetInvalid = 0

      if (!definition) {
        sheetWarnings.push({ code: 'unmatched_sheet', message: `Skipping unmatched sheet "${sheet.sheetName}".`, sheetName: sheet.sheetName })
        warnings.push(...sheetWarnings)
        tableSummary.push({
          sheetName: sheet.sheetName,
          tableName: sheet.sheetName,
          importedCount: 0,
          skippedDuplicates: 0,
          invalidCount: 0,
          warnings: sheetWarnings,
          errors: sheetErrors,
        })
        continue
      }

      const validation = validateHeaderRow(sheet.headers, definition)
      sheetWarnings.push(...validation.issues.filter(issue => issue.severity !== 'error').map(issue => ({ code: issue.code, message: issue.message, sheetName: issue.sheetName, tableName: issue.tableName })))
      if (!validation.valid) {
        sheetErrors.push(...validation.issues.filter(issue => issue.severity === 'error').map(issue => ({ code: issue.code, message: issue.message, sheetName: issue.sheetName, tableName: issue.tableName, path: filePath })))
        errors.push(...sheetErrors)
        tableSummary.push({
          sheetName: sheet.sheetName,
          tableName: definition.sourceTable ?? definition.key,
          importedCount: 0,
          skippedDuplicates: 0,
          invalidCount: sheet.rows.length,
          warnings: sheetWarnings,
          errors: sheetErrors,
        })
        invalidCount += sheet.rows.length
        continue
      }

      const transaction = db.transaction((rows: Record<string, unknown>[]) => {
        for (const rawRow of rows) {
          const normalized = normalizeImportedRow(definition, rawRow)
          if (!normalized.row) {
            sheetInvalid += 1
            invalidCount += 1
            continue
          }

          const result = upsertRegisteredRow(db, definition, normalized.row as Record<string, unknown>, duplicatePolicy)
          if (result.invalid) {
            sheetInvalid += 1
            invalidCount += 1
            continue
          }
          if (result.skippedDuplicate) {
            sheetSkipped += 1
            skippedDuplicates += 1
            continue
          }

          sheetImported += 1
          importedCount += 1
        }
      })

      transaction(sheet.rows)
      tableSummary.push({
        sheetName: sheet.sheetName,
        tableName: definition.sourceTable ?? definition.key,
        importedCount: sheetImported,
        skippedDuplicates: sheetSkipped,
        invalidCount: sheetInvalid,
        warnings: sheetWarnings,
        errors: sheetErrors,
      })
      warnings.push(...sheetWarnings)
      errors.push(...sheetErrors)
    }

    return {
      success: true,
      filePath,
      timestamp,
      importedCount,
      skippedDuplicates,
      invalidCount,
      warnings,
      errors,
      tableSummary,
    }
  } catch (error) {
    errors.push({
      code: 'import_failed',
      message: error instanceof Error ? error.message : 'Failed to execute import.',
      path: filePath,
    })
    return {
      success: false,
      filePath,
      timestamp,
      importedCount,
      skippedDuplicates,
      invalidCount,
      warnings,
      errors,
      tableSummary,
    }
  }
}

function listUserTables(db: Database.Database) {
  return db
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name ASC
      `,
    )
    .all() as { name: string }[]
}

function listTableCounts(db: Database.Database): UserTableSummary[] {
  return listUserTables(db).map(table => {
    const row = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get() as { count: number }
    return { name: table.name, rowCount: row.count }
  })
}

function validateSqliteFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const probe = new Database(filePath, { readonly: true, fileMustExist: true })
  try {
    probe.prepare('SELECT name FROM sqlite_master LIMIT 1').get()
  } finally {
    probe.close()
  }
}

function checkpointDatabase(db: Database.Database) {
  try {
    db.pragma('wal_checkpoint(TRUNCATE)')
  } catch {
    db.pragma('wal_checkpoint(PASSIVE)')
  }
}

function copyLiveDatabaseTo(targetPath: string) {
  const db = getDb()
  checkpointDatabase(db)
  fs.copyFileSync(getDatabasePath(), targetPath)
}

export function createAutomaticBackup(): BackupResult {
  const timestamp = toIsoTimestamp()
  const backupPath = getBackupPath()
  const warnings: StructuredIssue[] = []
  const errors: StructuredIssue[] = []

  try {
    copyLiveDatabaseTo(backupPath)
    shell.showItemInFolder(backupPath)
    return { success: true, backupPath, timestamp, warnings, errors }
  } catch (error) {
    errors.push({
      code: 'backup_failed',
      message: error instanceof Error ? error.message : 'Failed to create database backup.',
      path: backupPath,
    })
    return { success: false, backupPath, timestamp, warnings, errors }
  }
}

export function createManualBackup(): BackupResult {
  return createAutomaticBackup()
}

export function restoreBackupFile(backupFilePath?: string): RestoreResult {
  const timestamp = toIsoTimestamp()
  const warnings: StructuredIssue[] = []
  const errors: StructuredIssue[] = []

  let selectedPath = backupFilePath
  if (!selectedPath) {
    const selected = dialog.showOpenDialogSync({
      title: 'Restore Backup',
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    selectedPath = selected?.[0]
  }

  if (!selectedPath) {
    return {
      success: false,
      timestamp,
      warnings,
      errors: [{ code: 'restore_cancelled', message: 'Restore was cancelled by the user.' }],
    }
  }

  try {
    validateSqliteFile(selectedPath)

    const liveDbPath = getDatabasePath()
    closeDb()

    const restoreTarget = `${liveDbPath}.restore.tmp`
    fs.copyFileSync(selectedPath, restoreTarget)
    fs.renameSync(restoreTarget, liveDbPath)

    initSchema(getDb())

    return {
      success: true,
      restoredFrom: selectedPath,
      timestamp,
      warnings,
      errors,
    }
  } catch (error) {
    closeDb()
    getDb()
    errors.push({
      code: 'restore_failed',
      message: error instanceof Error ? error.message : 'Failed to restore backup.',
      path: selectedPath,
    })
    return { success: false, restoredFrom: selectedPath, timestamp, warnings, errors }
  }
}

export function resetSystemData(): ResetResult {
  const timestamp = toIsoTimestamp()
  const warnings: StructuredIssue[] = []
  const errors: StructuredIssue[] = []
  const backupResult = createAutomaticBackup()

  if (!backupResult.success || !backupResult.backupPath) {
    return {
      success: false,
      backupPath: backupResult.backupPath,
      timestamp,
      warnings: backupResult.warnings,
      errors: backupResult.errors.length
        ? backupResult.errors
        : [{ code: 'backup_required_failed', message: 'Mandatory backup failed before reset.' }],
      tableSummary: { clearedTables: [], rowsDeleted: {} },
    }
  }

  const db = getDb()
  const clearedTables: string[] = []
  const rowsDeleted: Record<string, number> = {}

  try {
    const tables = listUserTables(db)
    db.pragma('foreign_keys = OFF')

    const deleteStatements = tables.map(table => ({
      name: table.name,
      stmt: db.prepare(`DELETE FROM "${table.name}"`),
    }))

    const transaction = db.transaction(() => {
      for (const { name, stmt } of deleteStatements) {
        const result = stmt.run()
        clearedTables.push(name)
        rowsDeleted[name] = result.changes
      }

      try {
        db.prepare('DELETE FROM sqlite_sequence').run()
      } catch {
        // Some SQLite builds or schema states may not have sqlite_sequence.
      }
    })

    transaction()
    db.pragma('foreign_keys = ON')
    initSchema(db)

    return {
      success: true,
      backupPath: backupResult.backupPath,
      timestamp,
      warnings: [...warnings, ...backupResult.warnings],
      errors,
      tableSummary: { clearedTables, rowsDeleted },
    }
  } catch (error) {
    db.pragma('foreign_keys = ON')
    errors.push({
      code: 'reset_failed',
      message: error instanceof Error ? error.message : 'Failed to reset system data.',
    })
    return {
      success: false,
      backupPath: backupResult.backupPath,
      timestamp,
      warnings: [...warnings, ...backupResult.warnings],
      errors,
      tableSummary: { clearedTables, rowsDeleted },
    }
  }
}

export function getCurrentDatabaseSummary() {
  const db = getDb()
  return listTableCounts(db)
}

export function registerDataManagementIpcHandlers(ipcMain: IpcMain) {
  ipcMain.handle('data:export', async (_event, targetPath?: string) => {
    return exportAllSystemDataWorkbook(targetPath)
  })

  ipcMain.handle('data:import-preview', async (_event, filePath?: string) => {
    return previewImportFile(filePath)
  })

  ipcMain.handle('data:import-execute', async (_event, filePath: string, duplicatePolicy?: DuplicatePolicy) => {
    return executeImportFile(filePath, duplicatePolicy ?? 'skip')
  })

  ipcMain.handle('data:backup', () => createManualBackup())

  ipcMain.handle('data:restore', async (_event, backupPath?: string) => {
    return restoreBackupFile(backupPath)
  })

  ipcMain.handle('data:reset', () => resetSystemData())
}
