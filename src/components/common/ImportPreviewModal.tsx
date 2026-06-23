import { Download, FileText, X } from 'lucide-react'
import type { ImportPreviewResult } from '../../types'

interface ImportPreviewModalProps {
  open: boolean
  preview: ImportPreviewResult | null
  duplicatePolicy: 'skip' | 'replace' | 'merge'
  importing?: boolean
  onDuplicatePolicyChange: (value: 'skip' | 'replace' | 'merge') => void
  onImport: () => void | Promise<void>
  onCancel: () => void
}

export default function ImportPreviewModal({
  open,
  preview,
  duplicatePolicy,
  importing = false,
  onDuplicatePolicyChange,
  onImport,
  onCancel,
}: ImportPreviewModalProps) {
  if (!open || !preview) return null

  const primarySheet = preview.sheets[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Import Preview</h2>
            <p className="text-sm text-slate-400">Review detected sheets and row structure before importing.</p>
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 transition-colors hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto px-6 py-5 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center gap-2 text-slate-200">
                <FileText size={16} />
                <span className="font-medium">{preview.fileName}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Detected format: {preview.extension.toUpperCase()}</p>
            </div>

            {preview.sheets.map(sheet => (
              <div key={sheet.sheetName} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{sheet.sheetName}</h3>
                    <p className="text-xs text-slate-400">
                      Target: {sheet.detectedTable ?? sheet.tableName} • {sheet.rowCount} rows
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${sheet.dynamic ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                    {sheet.dynamic ? 'Dynamic' : 'Registered'}
                  </span>
                </div>

                {sheet.issues.length > 0 && (
                  <div className="mt-3 space-y-1 text-sm">
                    {sheet.issues.slice(0, 5).map((issue, index) => (
                      <div key={`${sheet.sheetName}-${index}`} className={`rounded-lg border px-3 py-2 ${(issue.severity ?? 'warning') === 'error' ? 'border-red-500/20 bg-red-500/10 text-red-100' : 'border-amber-500/20 bg-amber-500/10 text-amber-100'}`}>
                        {issue.message}
                      </div>
                    ))}
                  </div>
                )}

                {sheet.rows.length > 0 && primarySheet?.sheetName === sheet.sheetName && (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
                    <table className="min-w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800 text-slate-200">
                        <tr>
                          {sheet.headers.map(header => (
                            <th key={header} className="px-3 py-2 font-medium">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.rows.slice(0, 5).map((row, rowIndex) => (
                          <tr key={`${sheet.sheetName}-${rowIndex}`} className="border-t border-slate-800">
                            {sheet.headers.map(header => (
                              <td key={`${sheet.sheetName}-${rowIndex}-${header}`} className="px-3 py-2 align-top text-slate-300">
                                {String(row[header] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </section>

          <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div>
              <h3 className="font-semibold text-white">Duplicate Policy</h3>
              <p className="text-sm text-slate-400">Choose how conflicts should be handled when importing.</p>
            </div>

            <select className="input-field w-full" value={duplicatePolicy} onChange={e => onDuplicatePolicyChange(e.target.value as 'skip' | 'replace' | 'merge')}>
              <option value="skip">Skip duplicates</option>
              <option value="replace">Replace existing</option>
              <option value="merge">Merge data</option>
            </select>

            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
              Preview validation runs before import. If structure looks wrong, cancel and reselect the file.
            </div>

            <button type="button" onClick={onImport} disabled={importing} className="btn-primary flex w-full items-center justify-center gap-2">
              <Download size={16} />
              {importing ? 'Importing…' : 'Import Data'}
            </button>

            <button type="button" onClick={onCancel} className="btn-secondary w-full">
              Cancel
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}