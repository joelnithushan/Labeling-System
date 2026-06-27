import { useEffect, useState } from 'react'
import { Archive, Upload, Download, RotateCcw, Clock3 } from 'lucide-react'
import ConfirmModal from '../common/ConfirmModal'
import ToastHost, { type ToastItem } from '../common/ToastHost'
import { exportData, executeImport, previewImport, resetSystem } from '../../services/dataManagement'

type ModalState = 'backup' | 'import-confirm' | 'reset1' | 'reset2' | null

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
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [lastImport, setLastImport] = useState<string | null>(null)

  useEffect(() => {
    setLastBackup(localStorage.getItem(LAST_BACKUP_KEY))
    setLastImport(localStorage.getItem(LAST_IMPORT_KEY))
  }, [])

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

  async function handleBackup() {
    setBusy('backup')
    setModal(null)
    try {
      const result = await exportData()
      if (result.success) {
        const now = new Date().toISOString()
        setLastBackup(now)
        localStorage.setItem(LAST_BACKUP_KEY, now)
        pushToast('Backup complete', `Data saved to ${result.filePath ?? 'selected location'}`, 'success')
      } else {
        const cancelled = result.errors[0]?.code === 'export_cancelled'
        if (!cancelled) {
          pushToast('Backup failed', result.errors[0]?.message ?? 'Backup failed.', 'error')
        }
      }
    } finally {
      setBusy(null)
    }
  }

  async function openImportPicker() {
    const selection = await window.electron.dialog.openFile({
      title: 'Select Backup File to Import',
      properties: ['openFile'],
      filters: [
        { name: 'Excel Workbook', extensions: ['xlsx'] },
        { name: 'CSV File', extensions: ['csv'] },
      ],
    })
    if (selection.canceled || !selection.filePaths[0]) return
    setPendingImportPath(selection.filePaths[0])
    setModal('import-confirm')
  }

  async function handleImport() {
    if (!pendingImportPath) return
    setBusy('import')
    setModal(null)
    try {
      const result = await executeImport(pendingImportPath, 'replace')
      if (result.success) {
        const now = new Date().toISOString()
        setLastImport(now)
        localStorage.setItem(LAST_IMPORT_KEY, now)
        const summary = `Imported ${result.importedCount} rows, skipped ${result.skippedDuplicates}`
        pushToast('Import complete', summary, 'success')
      } else {
        pushToast('Import failed', result.errors[0]?.message ?? 'Import failed.', 'error')
      }
    } finally {
      setBusy(null)
      setPendingImportPath(null)
    }
  }

  async function handleReset() {
    setBusy('reset')
    setModal(null)
    try {
      const result = await resetSystem()
      if (result.success) {
        const now = new Date().toISOString()
        setLastBackup(now)
        localStorage.setItem(LAST_BACKUP_KEY, now)
        pushToast('System reset', 'All data has been cleared.', 'success')
      } else {
        pushToast('Reset failed', result.errors[0]?.message ?? 'Reset failed.', 'error')
      }
    } finally {
      setBusy(null)
    }
  }

  const loadingText =
    busy === 'backup' ? 'Creating backup…' :
    busy === 'import' ? 'Importing data…' :
    busy === 'reset' ? 'Resetting system…' : ''

  return (
    <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-800 p-5">
      <ToastHost toasts={toasts} onDismiss={dismissToast} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Data Management</h2>
          <p className="mt-1 text-sm text-slate-400">Backup, import, and reset system data safely.</p>
        </div>
        {loadingText && <div className="text-sm text-amber-300">{loadingText}</div>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
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
        {/* Backup */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-medium text-white">Backup System</h3>
            <p className="text-sm text-slate-400">Download all system data as an Excel file (.xlsx) for safekeeping.</p>
          </div>
          <button
            type="button"
            onClick={() => setModal('backup')}
            disabled={!!busy}
            className="btn-primary flex items-center gap-2"
          >
            <Archive size={16} /> {busy === 'backup' ? 'Saving…' : 'Backup'}
          </button>
        </div>

        {/* Import */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-medium text-white">Import Data</h3>
            <p className="text-sm text-slate-400">Restore data from a previously backed-up file (.xlsx or .csv).</p>
          </div>
          <button
            type="button"
            onClick={openImportPicker}
            disabled={!!busy}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={16} /> {busy === 'import' ? 'Importing…' : 'Import'}
          </button>
        </div>

        {/* Reset */}
        <div className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-medium text-rose-100">Reset System</h3>
            <p className="text-sm text-rose-200/80">Permanently delete all system data. This cannot be undone.</p>
          </div>
          <button
            type="button"
            onClick={() => setModal('reset1')}
            disabled={!!busy}
            className="btn-danger flex items-center gap-2"
          >
            <RotateCcw size={16} /> {busy === 'reset' ? 'Resetting…' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Backup confirm */}
      <ConfirmModal
        open={modal === 'backup'}
        title="Backup System Data"
        message="This will download all system data (products, barcodes, settings) as an Excel file. Continue?"
        confirmLabel="Backup Now"
        cancelLabel="Cancel"
        loading={busy === 'backup'}
        onCancel={() => setModal(null)}
        onConfirm={handleBackup}
      />

      {/* Import confirm */}
      <ConfirmModal
        open={modal === 'import-confirm'}
        title="Import Data"
        message={`Importing will overwrite existing records with data from the selected file.\n\nFile: ${pendingImportPath ?? ''}\n\nAre you sure you want to continue?`}
        confirmLabel="Yes, Import"
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={busy === 'import'}
        onCancel={() => { setModal(null); setPendingImportPath(null) }}
        onConfirm={handleImport}
      />

      {/* Reset — step 1 */}
      <ConfirmModal
        open={modal === 'reset1'}
        title="Reset System"
        message="Are you sure you want to reset the system? All data will be permanently deleted."
        confirmLabel="Yes, Continue"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onCancel={() => setModal(null)}
        onConfirm={() => setModal('reset2')}
      />

      {/* Reset — step 2 (final confirm) */}
      <ConfirmModal
        open={modal === 'reset2'}
        title="Confirm Permanent Reset"
        message="This is your final warning. All products, barcodes, and records will be permanently deleted and cannot be recovered.\n\nType YES to confirm."
        confirmLabel="Delete All Data"
        cancelLabel="No, Go Back"
        confirmVariant="danger"
        loading={busy === 'reset'}
        onCancel={() => setModal(null)}
        onConfirm={handleReset}
      />
    </section>
  )
}
