import type { AppSettings, Barcode, Product } from '../types'
import {
  buildMaskedCredentialReference,
  getDefinitionBySheetName,
  getExportableColumns,
  getImportableColumns,
  getRequiredColumns,
  isExportBlockedColumn,
  isSensitiveColumnName,
  type ColumnDefinition,
  type DuplicatePolicy,
  type RegistryTableDefinition,
  type TableDefinition,
} from './dataSchemas'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: ValidationSeverity
  code: string
  message: string
  tableName?: string
  sheetName?: string
  rowIndex?: number
  field?: string
}

export interface ValidationSummary {
  valid: boolean
  issues: ValidationIssue[]
}

export interface PreviewSheet<RowType = Record<string, unknown>> {
  tableName: string
  sheetName: string
  headers: string[]
  rows: RowType[]
  issues: ValidationIssue[]
}

export interface ImportPreviewResult {
  fileName: string
  extension: '.xlsx' | '.csv'
  sheets: PreviewSheet[]
  issues: ValidationIssue[]
}

export interface NormalizedRowResult<RowType = Record<string, unknown>> {
  row: Partial<RowType> | null
  issues: ValidationIssue[]
}

export interface DuplicateDecision<RowType = Record<string, unknown>> {
  policy: DuplicatePolicy
  isDuplicate: boolean
  keyValues: Partial<RowType>
}

const EMPTY_MARKERS = new Set(['', 'null', 'undefined', 'n/a', 'na', '-'])

export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export function normalizeMaybeNumber(value: unknown): number | null {
  const normalized = normalizeText(value)
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeMaybeInteger(value: unknown): number | null {
  const normalized = normalizeText(value)
  if (!normalized) return null
  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeMaybeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  const normalized = normalizeText(value).toLowerCase()
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
  return null
}

export function isEmptyCellValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'number') return Number.isNaN(value)
  return EMPTY_MARKERS.has(normalizeText(value).toLowerCase())
}

export function validateHeaderRow(headers: string[], definition: TableDefinition<unknown>): ValidationSummary {
  const normalizedHeaders = headers.map(header => header.trim().toLowerCase())
  const issues: ValidationIssue[] = []

  for (const column of getRequiredColumns(definition)) {
    const aliases = [column.key, column.label, ...(column.aliases ?? [])].map(item => item.toLowerCase())
    if (!aliases.some(alias => normalizedHeaders.includes(alias))) {
      issues.push({
        severity: 'error',
        code: 'missing_required_header',
        tableName: definition.sourceTable ?? definition.key,
        sheetName: definition.sheetName,
        field: column.label,
        message: `Missing required column "${column.label}" in ${definition.sheetName}.`,
      })
    }
  }

  return { valid: !issues.some(issue => issue.severity === 'error'), issues }
}

export function validateTableHeaders(sheetName: string, headers: string[]): ValidationSummary {
  const definition = getDefinitionBySheetName(sheetName)
  if (!definition) {
    return {
      valid: false,
      issues: [
        {
          severity: 'error',
          code: 'unknown_sheet',
          sheetName,
          message: `Unknown sheet "${sheetName}".`,
        },
      ],
    }
  }

  return validateHeaderRow(headers, definition)
}

export function validateNonEmptyRow<RowType extends Record<string, unknown>>(
  definition: TableDefinition<RowType>,
  row: Partial<RowType>,
  rowIndex: number,
): ValidationSummary {
  const issues: ValidationIssue[] = []

  for (const column of getRequiredColumns(definition)) {
    const value = row[column.key as keyof RowType]
    if (isEmptyCellValue(value)) {
      issues.push({
        severity: 'error',
        code: 'missing_required_value',
        tableName: definition.sourceTable ?? definition.key,
        sheetName: definition.sheetName,
        rowIndex,
        field: column.label,
        message: `Row ${rowIndex + 1} is missing required value for "${column.label}".`,
      })
    }
  }

  return { valid: !issues.some(issue => issue.severity === 'error'), issues }
}

export function normalizeImportedRow<RowType extends Record<string, unknown>>(
  definition: TableDefinition<RowType>,
  row: Record<string, unknown>,
): NormalizedRowResult<RowType> {
  const issues: ValidationIssue[] = []
  const normalized: Partial<RowType> = {}

  for (const column of getImportableColumns(definition)) {
    const rawValue = row[column.label] ?? row[column.key]

    if (isEmptyCellValue(rawValue)) {
      if (column.required) {
        issues.push({
          severity: 'error',
          code: 'missing_required_value',
          tableName: definition.sourceTable ?? definition.key,
          sheetName: definition.sheetName,
          field: column.label,
          message: `Missing required value for "${column.label}".`,
        })
      }

      if (column.defaultValue !== undefined) {
        normalized[column.key as keyof RowType] = column.defaultValue as RowType[keyof RowType]
      }

      continue
    }

    normalized[column.key as keyof RowType] = coerceColumnValue(column, rawValue) as RowType[keyof RowType]
  }

  return {
    row: issues.some(issue => issue.severity === 'error') ? null : normalized,
    issues,
  }
}

export function validateRegistryCoverage(tableName: string): ValidationSummary {
  return {
    valid: true,
    issues: isSensitiveColumnName(tableName)
      ? [
          {
            severity: 'warning',
            code: 'sensitive_table_name',
            tableName,
            message: `Table name "${tableName}" may contain sensitive data.`,
          },
        ]
      : [],
  }
}

export function validateDuplicatePolicy(policy: unknown): policy is DuplicatePolicy {
  return policy === 'skip' || policy === 'replace' || policy === 'merge'
}

export function validateExportableDefinition(definition: RegistryTableDefinition): ValidationSummary {
  const issues: ValidationIssue[] = []

  if (!definition.exportable) {
    issues.push({
      severity: 'warning',
      code: 'not_exportable',
      tableName: definition.sourceTable ?? definition.key,
      sheetName: definition.sheetName,
      message: `Table "${definition.sheetName}" is not marked exportable.`,
    })
  }

  if (definition.columns.some(column => isSensitiveColumnName(column.key))) {
    issues.push({
      severity: 'warning',
      code: 'sensitive_export_column',
      tableName: definition.sourceTable ?? definition.key,
      sheetName: definition.sheetName,
      message: `Sensitive columns should be filtered before export for "${definition.sheetName}".`,
    })
  }

  return { valid: true, issues }
}

export function validateImportableDefinition(definition: RegistryTableDefinition): ValidationSummary {
  const issues: ValidationIssue[] = []

  if (!definition.importable) {
    issues.push({
      severity: 'warning',
      code: 'not_importable',
      tableName: definition.sourceTable ?? definition.key,
      sheetName: definition.sheetName,
      message: `Table "${definition.sheetName}" is not marked importable.`,
    })
  }

  return { valid: true, issues }
}

export function mapHeadersToColumns<RowType extends Record<string, unknown>>(
  definition: TableDefinition<RowType>,
  headers: string[],
): Map<string, ColumnDefinition> {
  const map = new Map<string, ColumnDefinition>()
  const importableColumns = getImportableColumns(definition)

  for (const header of headers) {
    const normalized = header.trim().toLowerCase()
    const match = importableColumns.find(column => {
      const aliases = [column.key, column.label, ...(column.aliases ?? [])].map(item => item.toLowerCase())
      return aliases.includes(normalized)
    })

    if (match) map.set(header, match)
  }

  return map
}

export function evaluateDuplicateDecision<RowType extends Record<string, unknown>>(
  policy: DuplicatePolicy,
  existingRow: Partial<RowType> | null,
  incomingRow: Partial<RowType>,
  uniqueKeys: string[],
): DuplicateDecision<RowType> {
  const keyValues = uniqueKeys.reduce<Partial<RowType>>((accumulator, key) => {
    if (incomingRow[key as keyof RowType] !== undefined) {
      accumulator[key as keyof RowType] = incomingRow[key as keyof RowType]
    }
    return accumulator
  }, {})

  return {
    policy,
    isDuplicate: Boolean(existingRow),
    keyValues,
  }
}

export function normalizeCredentialExport(username: unknown) {
  const normalizedUsername = normalizeText(username)
  return {
    username: normalizedUsername,
    password_status: normalizedUsername ? 'masked' : 'not-exported',
    password_reference: buildMaskedCredentialReference(normalizedUsername),
  }
}

export function validateExportColumns(definition: TableDefinition<unknown>): ValidationSummary {
  const issues: ValidationIssue[] = []

  for (const column of getExportableColumns(definition)) {
    if (isExportBlockedColumn(column.key)) {
      issues.push({
        severity: 'warning',
        code: 'blocked_export_column',
        tableName: definition.sourceTable ?? definition.key,
        sheetName: definition.sheetName,
        field: column.label,
        message: `Column "${column.label}" is blocked from export.`,
      })
    }
  }

  return { valid: !issues.some(issue => issue.severity === 'error'), issues }
}

export function buildPreviewIssueSummary(issues: ValidationIssue[]) {
  return issues.reduce(
    (summary, issue) => {
      summary[issue.severity] += 1
      return summary
    },
    { error: 0, warning: 0, info: 0 },
  )
}

export function getRowIdentity<RowType extends Record<string, unknown>>(
  definition: TableDefinition<RowType>,
  row: Partial<RowType>,
): string {
  const uniqueKeys = definition.uniqueKeys?.[0] ?? definition.primaryKey ?? []
  return uniqueKeys.map(key => String(row[key as keyof RowType] ?? '')).join('|')
}

function coerceColumnValue(column: ColumnDefinition, value: unknown) {
  if (value === null || value === undefined) return null

  switch (column.type) {
    case 'number': {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value
      const normalized = normalizeText(value).toLowerCase()
      if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
      if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
      return null
    }
    case 'date':
    case 'json':
    case 'string':
    default:
      return String(value)
  }
}
