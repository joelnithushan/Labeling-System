import { useState } from 'react'
import { Search, Download, Calendar, X } from 'lucide-react'
import { useBarcodes } from '../hooks/useBarcodes'
import BarcodeTable from '../components/BarcodeTable'

export default function Barcodes() {
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [exporting, setExporting] = useState(false)

  const { barcodes, loading } = useBarcodes({ search, date })

  async function handleExport() {
    setExporting(true)
    try {
      const result = await window.electron.db.exportCSV()
      if (!result.success) {
        alert('Export cancelled or failed.')
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Barcode History</h1>
          <p className="text-slate-400 text-sm mt-1">{barcodes.length} records</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary flex items-center gap-2"
        >
          <Download size={16} />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-8 w-56"
            placeholder="Search serial, product…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            className="input-field pl-8"
            value={date}
            onChange={e => setDate(e.target.value)}
            title="Filter by printed date"
          />
          {date && (
            <button
              onClick={() => setDate('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <BarcodeTable barcodes={barcodes} loading={loading} />
      </div>
    </div>
  )
}
