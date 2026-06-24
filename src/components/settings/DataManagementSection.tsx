import { useEffect, useMemo, useState } from 'react'
import { Archive, Download, Upload, RotateCcw, ShieldAlert, Clock3, ExternalLink } from 'lucide-react'
import ConfirmModal from '../common/ConfirmModal'
import ImportPreviewModal from '../common/ImportPreviewModal'
import ToastHost, { type ToastItem } from '../common/ToastHost'
import { createBackup, executeImport, exportData, previewImport, resetSystem, restoreBackup } from '../../services/dataManagement'
import type { ImportPreviewResult } from '../../types'

type ModalState = 'export' | 'backup' | 'restore' | 'reset1' | 'reset2' | null
type DuplicatePolicy = 'skip' | 'replace' | 'merge'

const LAST_BACKUP_KEY = 'data-management:last-backup'
const LAST_IMPORT_KEY = 'data-management:last-import'

function makeToast(title: string, message: string, variant: ToastItem['variant'] = 'info'): ToastItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    message,
    variant,
  }
}

function formatTimestamp(value?: string | null) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function DataManagementSection() {
  const [modal, setModal] = useState<ModalState>(null)
  const [restorePath, setRestorePath] = useState<string | null>(null)
  const [importPreviewData, setImportPreviewData] = useState<ImportPreviewResult | null>(null)
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('skip')
  const [busy, setBusy] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [lastImport, setLastImport] = useState<string | null>(null)

  useEffect(() => {
    setLastBackup(localStorage.getItem(LAST_BACKUP_KEY))
    setLastImport(localStorage.getItem(LAST_IMPORT_KEY))
  }, [])

  const loadingText = useMemo(() => {
    if (!busy) return ''
    return busy === 'export' ? 'Preparing export…' :
      busy === 'import-preview' ? 'Reading import file…' :
      busy === 'import' ? 'Importing data…' :
      busy === 'backup' ? 'Creating backup…' :
      busy === 'restore' ? 'Restoring backup…' :
      busy === 'reset' ? 'Resetting system…' : ''
  }, [busy])

  function pushToast(title: string, message: string, variant: ToastItem['variant'] = 'info') {
    const toast = makeToast(title, message, variant)
    setToasts(prev => [...prev, toast])
    window.setTimeout(() => {
      setToasts(prev => prev.filter(item => item.id !== toast.id))
    }, 5000)
  }

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  async function handleExport() {
    setBusy('export')
    try {
      const result = await exportData()
      if (result.success) {
        pushToast('Export complete', `Saved to ${result.filePath ?? 'selected location'}`, 'success')
      } else {
        pushToast('Export failed', result.errors[0]?.message ?? 'Export failed.', 'error')
      }
    } finally {
      setBusy(null)
      setModal(null)
    }
  }

  async function handleBackup() {
    setBusy('backup')
    try {
      const result = await createBackup()
      if (result.success) {
        setLastBackup(result.timestamp)
        localStorage.setItem(LAST_BACKUP_KEY, result.timestamp)
        pushToast('Backup created', result.backupPath ? `Saved to ${result.backupPath}` : 'Backup completed.', 'success')
      } else {
        pushToast('Backup failed', result.errors[0]?.message ?? 'Backup failed.', 'error')
      }
    } finally {
      setBusy(null)
      setModal(null)
    }
  }

  async function openRestorePicker() {
    const selection = await window.electron.dialog.openFile({
      title: 'Select Backup File',
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })

    if (selection.canceled || !selection.filePaths[0]) return
    setRestorePath(selection.filePaths[0])
    setModal('restore')
  }

  async function handleRestore() {
    if (!restorePath) return
    setBusy('restore')
    try {
      const result = await restoreBackup(restorePath)
      if (result.success) {
        pushToast('Restore complete', `Restored from ${result.restoredFrom ?? restorePath}`, 'success')
      } else {
        pushToast('Restore failed', result.errors[0]?.message ?? 'Restore failed.', 'error')
      }
    } finally {
      setBusy(null)
      setModal(null)
      setRestorePath(null)
    }
  }

  async function beginImportPreview() {
    setBusy('import-preview')
    try {
      const preview = await previewImport()
      if (!preview.success) {
        pushToast('Import preview failed', preview.errors[0]?.message ?? 'Unable to preview file.', 'error')
        return
      }
      setImportPreviewData(preview)
    } finally {
      setBusy(null)
    }
  }

  async function handleImportExecute() {
    if (!importPreviewData?.filePath) return
    setBusy('import')
    try {
      const result = await executeImport(importPreviewData.filePath, duplicatePolicy)
      if (result.success) {
        const summary = `Imported ${result.importedCount} rows, skipped ${result.skippedDuplicates}, invalid ${result.invalidCount}`
        pushToast('Import complete', summary, 'success')
        setLastImport(result.timestamp)
        localStorage.setItem(LAST_IMPORT_KEY, result.timestamp)
        setImportPreviewData(null)
      } else {
        pushToast('Import failed', result.errors[0]?.message ?? 'Import failed.', 'error')
      }
    } finally {
      setBusy(null)
    }
  }

  async function handleResetConfirmation() {
    if (modal === 'reset1') {
      setModal('reset2')
      return
    }

    setBusy('reset')
    try {
      const result = await resetSystem()
      if (result.success) {
        setLastBackup(result.timestamp)
        localStorage.setItem(LAST_BACKUP_KEY, result.timestamp)
        pushToast('System reset complete', result.backupPath ? `Backup saved at ${result.backupPath}` : 'System reset finished.', 'success')
      } else {
        pushToast('Reset failed', result.errors[0]?.message ?? 'Reset failed.', 'error')
        if (result.backupPath) {
          setLastBackup(result.timestamp)
          localStorage.setItem(LAST_BACKUP_KEY, result.timestamp)
        }
      }
    } finally {
      setBusy(null)
      setModal(null)
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-800 p-5">
      <ToastHost toasts={toasts} onDismiss={dismissToast} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Data Management</h2>
          <p className="mt-1 text-sm text-slate-400">Export, import, backup, restore, and reset system data safely.</p>
        </div>
        {loadingText && <div className="text-sm text-amber-300">{loadingText}</div>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-slate-100"><Clock3 size={16} /> Last Backup</div>
          <div className="mt-2 text-slate-400">{formatTimestamp(lastBackup)}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-slate-100"><Clock3 size={16} /> Last Import</div>
          <div className="mt-2 text-slate-400">{formatTimestamp(lastImport)}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-medium text-white">Export Data</h3>
            <p className="text-sm text-slate-400">Generate a multi-sheet Excel workbook with all safe system data.</p>
          </div>
          <button type="button" onClick={() => setModal('export')} className="btn-primary flex items-center gap-2">
            <Download size={16} /> Export
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-medium text-white">Import Data</h3>
            <p className="text-sm text-slate-400">Preview first, then import with duplicate handling and validation.</p>
          </div>
          <button type="button" onClick={beginImportPreview} disabled={busy === 'import-preview'} className="btn-secondary flex items-center gap-2">
            <Upload size={16} /> {busy === 'import-preview' ? 'Opening…' : 'Import'}
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-medium text-white">Backup System</h3>
            <p className="text-sm text-slate-400">Create a full SQLite file backup in one action.</p>
          </div>
          <button type="button" onClick={() => setModal('backup')} className="btn-secondary flex items-center gap-2">
            <Archive size={16} /> Backup
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-medium text-white">Restore Backup</h3>
            <p className="text-sm text-slate-400">Select a .db backup, confirm, and safely replace current data.</p>
          </div>
          <button type="button" onClick={openRestorePicker} className="btn-secondary flex items-center gap-2">
            <ExternalLink size={16} /> Restore
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-medium text-rose-100">Reset System</h3>
            <p className="text-sm text-rose-200/80">Auto-backup first, then clear tables and reinitialize safely.</p>
          </div>
          <button type="button" onClick={() => setModal('reset1')} className="btn-danger flex items-center gap-2">
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <ConfirmModal
        open={modal === 'export'}
        title="Export Data"
        message="Do you want to export all system data?"
        confirmLabel="Export"
        cancelLabel="Cancel"
        loading={busy === 'export'}
        onCancel={() => setModal(null)}
        onConfirm={handleExport}
      />

      <ConfirmModal
        open={modal === 'backup'}
        title="Create Backup"
        message="Create a full SQLite backup now?"
        confirmLabel="Backup"
        cancelLabel="Cancel"
        loading={busy === 'backup'}
        onCancel={() => setModal(null)}
        onConfirm={handleBackup}
      />

      <ConfirmModal
        open={modal === 'restore'}
        title="Restore Backup"
        message={restorePath ? `Restoring will replace all current data. Continue?\n\nSelected file: ${restorePath}` : 'Restoring will replace all current data. Continue?'}
        confirmLabel="Restore"
        cancelLabel="No"
        confirmVariant="danger"
        loading={busy === 'restore'}
        onCancel={() => { setModal(null); setRestorePath(null) }}
        onConfirm={handleRestore}
      />

      <ConfirmModal
        open={modal === 'reset1'}
        title="Reset System"
        message="Are you sure you want to reset the system?"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onCancel={() => setModal(null)}
        onConfirm={() => setModal('reset2')}
      />

      <ConfirmModal
        open={modal === 'reset2'}
        title="Confirm Permanent Reset"
        message="All existing data will be permanently deleted."
        confirmLabel="Yes Reset"
        cancelLabel="No"
        confirmVariant="danger"
        loading={busy === 'reset'}
        onCancel={() => setModal(null)}
        onConfirm={handleResetConfirmation}
      />

      <ImportPreviewModal
        open={Boolean(importPreviewData)}
        preview={importPreviewData}
        duplicatePolicy={duplicatePolicy}
        importing={busy === 'import'}
        onDuplicatePolicyChange={setDuplicatePolicy}
        onImport={handleImportExecute}
        onCancel={() => setImportPreviewData(null)}
      />
    </section>
  )
}