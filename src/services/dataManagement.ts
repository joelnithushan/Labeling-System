import type {
  BackupResult,
  DataExportResult,
  ImportExecutionResult,
  ImportPreviewResult,
  ResetResult,
  RestoreResult,
} from '../types'

export type DuplicatePolicy = 'skip' | 'replace' | 'merge'

function ensureElectronBridge() {
  if (!window.electron?.dataManagement) {
    throw new Error('Data management IPC bridge is unavailable.')
  }
  return window.electron.dataManagement
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown data management error.'
}

function attachError<T extends { success: boolean; errors?: { code: string; message: string }[] }>(
  result: T,
  fallbackCode: string,
  fallbackMessage: string,
): T {
  if (result.success) return result
  if (result.errors && result.errors.length > 0) return result
  return {
    ...result,
    errors: [{ code: fallbackCode, message: fallbackMessage }],
  }
}

export async function exportData(targetPath?: string): Promise<DataExportResult> {
  try {
    const result = await ensureElectronBridge().exportData(targetPath)
    return attachError(result, 'export_failed', 'Export failed.')
  } catch (error) {
    return {
      success: false,
      filePath: targetPath,
      timestamp: new Date().toISOString(),
      warnings: [],
      errors: [{ code: 'export_failed', message: normalizeErrorMessage(error) }],
      sheetSummary: [],
    }
  }
}

export async function previewImport(filePath?: string): Promise<ImportPreviewResult> {
  try {
    const result = await ensureElectronBridge().previewImport(filePath)
    return attachError(result, 'import_preview_failed', 'Import preview failed.')
  } catch (error) {
    return {
      success: false,
      filePath,
      fileName: filePath ? filePath.split(/[\\/]/).pop() ?? '' : '',
      extension: '.csv',
      sheets: [],
      warnings: [],
      errors: [{ code: 'import_preview_failed', message: normalizeErrorMessage(error) }],
    }
  }
}

export async function executeImport(filePath: string, duplicatePolicy: DuplicatePolicy = 'skip'): Promise<ImportExecutionResult> {
  try {
    const result = await ensureElectronBridge().executeImport(filePath, duplicatePolicy)
    return attachError(result, 'import_failed', 'Import failed.')
  } catch (error) {
    return {
      success: false,
      filePath,
      timestamp: new Date().toISOString(),
      importedCount: 0,
      skippedDuplicates: 0,
      invalidCount: 0,
      warnings: [],
      errors: [{ code: 'import_failed', message: normalizeErrorMessage(error) }],
      tableSummary: [],
    }
  }
}

export async function createBackup(): Promise<BackupResult> {
  try {
    const result = await ensureElectronBridge().backup()
    return attachError(result, 'backup_failed', 'Backup failed.')
  } catch (error) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      warnings: [],
      errors: [{ code: 'backup_failed', message: normalizeErrorMessage(error) }],
    }
  }
}

export async function restoreBackup(backupPath?: string): Promise<RestoreResult> {
  try {
    const result = await ensureElectronBridge().restore(backupPath)
    return attachError(result, 'restore_failed', 'Restore failed.')
  } catch (error) {
    return {
      success: false,
      restoredFrom: backupPath,
      timestamp: new Date().toISOString(),
      warnings: [],
      errors: [{ code: 'restore_failed', message: normalizeErrorMessage(error) }],
    }
  }
}

export async function resetSystem(): Promise<ResetResult> {
  try {
    const result = await ensureElectronBridge().reset()
    return attachError(result, 'reset_failed', 'Reset failed.')
  } catch (error) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      backupPath: undefined,
      warnings: [],
      errors: [{ code: 'reset_failed', message: normalizeErrorMessage(error) }],
      tableSummary: { clearedTables: [], rowsDeleted: {} },
    }
  }
}
