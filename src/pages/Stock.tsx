import { useState, useEffect } from 'react'
import {
  Boxes,
  TrendingDown,
  AlertTriangle,
  Download,
  Search,
  Plus,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import type { StockSummary, StockEntry } from '../types'

export default function Stock() {
  const [summaries, setSummaries] = useState<StockSummary[]>([])
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [entryType, setEntryType] = useState<'stock_in' | 'adjustment'>('stock_in')
  const [adjustmentSubtype, setAdjustmentSubtype] = useState<'wastage' | 'return' | 'other'>('wastage')
  const [quantity, setQuantity] = useState<string>('')
  const [note, setNote] = useState<string>('')

  // Filter state
  const [filterProductId, setFilterProductId] = useState<string>('')

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [sumList, entryList] = await Promise.all([
        window.electron.db.getStockSummary(),
        window.electron.db.getStockEntries()
      ])
      setSummaries(sumList)
      setEntries(entryList)
    } catch (err) {
      console.error(err)
      setError('Failed to load stock data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto dismiss notifications
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(t)
    }
  }, [successMsg])

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000)
      return () => clearTimeout(t)
    }
  }, [error])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!selectedProductId) {
      setError('Please select a product.')
      return
    }

    const qtyNum = parseInt(quantity, 10)
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Please enter a valid positive quantity.')
      return
    }

    setActionLoading(true)
    try {
      let finalQty = qtyNum
      let finalNote = note.trim()

      if (entryType === 'stock_in') {
        if (!finalNote) finalNote = 'Stock added manually'
      } else {
        // Adjustment scenarios
        if (adjustmentSubtype === 'wastage') {
          finalQty = -qtyNum // Wastage/damage reduces stock
          if (!finalNote) finalNote = 'Damaged / wasted goods correction'
        } else if (adjustmentSubtype === 'return') {
          finalQty = qtyNum // Returns increase stock
          if (!finalNote) finalNote = 'Customer return stock restoration'
        } else {
          // Other adjustment - can be negative or positive depending on input (default to subtraction, but prompt user)
          // We default to reduction for safety unless user explicitly notes it. Let's make it positive/negative by checking sign.
          // Wait! For 'other', let's subtract by default since adjustment is usually correction, or we can add a toggle.
          // Let's keep it simple: "Other" is negative by default, but let's allow positive if they mention it. Actually,
          // let's put a simple select: "Increase (+)" or "Decrease (-)" for "other" adjustments.
        }
      }

      await window.electron.db.addStockEntry({
        product_id: parseInt(selectedProductId, 10),
        type: entryType,
        quantity_change: finalQty,
        note: finalNote
      })

      setSuccessMsg('Stock entry added successfully!')
      setQuantity('')
      setNote('')
      // Reload lists
      const [sumList, entryList] = await Promise.all([
        window.electron.db.getStockSummary(),
        window.electron.db.getStockEntries()
      ])
      setSummaries(sumList)
      setEntries(entryList)
    } catch (err) {
      console.error(err)
      setError('Failed to save stock entry.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleExport() {
    try {
      const res = await window.electron.db.exportStockCSV()
      if (res.success) {
        setSuccessMsg(`Stock history exported to ${res.filePath}`)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to export CSV.')
    }
  }

  // Count products out of stock / low stock
  const outOfStockCount = summaries.filter(s => s.current_stock <= 0).length
  const lowStockCount = summaries.filter(s => s.current_stock > 0 && s.current_stock <= 10).length

  // Filtered entries
  const filteredEntries = filterProductId
    ? entries.filter(e => e.product_id === parseInt(filterProductId, 10))
    : entries

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <Boxes className="text-amber-500" />
            Stock Maintenance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track and adjust raw materials & product inventories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="btn-secondary flex items-center gap-2 py-2"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="btn-primary flex items-center gap-2 py-2"
            disabled={entries.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-fadeIn">
          <ArrowUpRight size={18} />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center gap-3 animate-fadeIn">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Alerts Row for Low / Negative Stock */}
      {(outOfStockCount > 0 || lowStockCount > 0) && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-sm">Inventory Warnings Detected</h4>
            <p className="text-slate-300 text-xs mt-1">
              Currently, <span className="text-rose-400 font-bold">{outOfStockCount}</span> products are out of stock (zero or negative stock) and <span className="text-amber-400 font-bold">{lowStockCount}</span> products are low on stock (≤ 10 bags). Please review the details below.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Stock Cards */}
      {loading ? (
        <div className="text-slate-500 py-12 text-center">Loading summaries…</div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700">
          <Boxes size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No products registered yet</p>
          <p className="text-slate-500 text-sm mt-1">Please add products first before managing stock.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {summaries.map(product => {
            const stock = product.current_stock
            let badgeClass = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            let badgeText = 'In Stock'
            if (stock <= 0) {
              badgeClass = 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              badgeText = stock < 0 ? 'Negative Stock' : 'Out of Stock'
            } else if (stock <= 10) {
              badgeClass = 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              badgeText = 'Low Stock'
            }

            return (
              <div
                key={product.product_id}
                className="bg-slate-800/80 rounded-xl border border-slate-700/60 p-4 hover:border-slate-600 transition-all shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-700 text-slate-300">
                      {product.category}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold mt-3 text-base leading-snug line-clamp-1">
                    {product.product_name}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Pack: {product.weight} {product.weight_unit}
                  </p>
                </div>
                <div className="mt-5 flex items-baseline justify-between border-t border-slate-700/50 pt-3">
                  <span className="text-slate-500 text-xs font-medium">Bags Available</span>
                  <span className={`text-xl font-extrabold ${stock <= 0 ? 'text-rose-400' : stock <= 10 ? 'text-amber-400' : 'text-slate-100'}`}>
                    {stock}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="text-amber-500" size={20} />
            <h2 className="text-white font-semibold text-lg">Add Stock / Adjustment</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-300 text-sm font-medium">Product</label>
              <select
                className="input-field bg-slate-700 text-white rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 border border-slate-600"
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                required
              >
                <option value="">Select product...</option>
                {summaries.map(p => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} ({p.weight} {p.weight_unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Type tabs */}
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-300 text-sm font-medium">Operation Type</label>
              <div className="grid grid-cols-2 p-0.5 bg-slate-900 border border-slate-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEntryType('stock_in')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    entryType === 'stock_in'
                      ? 'bg-amber-500 text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Stock In (Delivery)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('adjustment')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    entryType === 'adjustment'
                      ? 'bg-amber-500 text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Stock Adjustment
                </button>
              </div>
            </div>

            {/* Sub-type for adjustments */}
            {entryType === 'adjustment' && (
              <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 animate-fadeIn">
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Adjustment Reason</label>
                <div className="space-y-2 mt-1">
                  <label className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="adjustment_type"
                      checked={adjustmentSubtype === 'wastage'}
                      onChange={() => setAdjustmentSubtype('wastage')}
                      className="accent-amber-500"
                    />
                    <span>Wastage / Damage (Reduces stock)</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="adjustment_type"
                      checked={adjustmentSubtype === 'return'}
                      onChange={() => setAdjustmentSubtype('return')}
                      className="accent-amber-500"
                    />
                    <span>Returned Goods (Increases stock)</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="adjustment_type"
                      checked={adjustmentSubtype === 'other'}
                      onChange={() => setAdjustmentSubtype('other')}
                      className="accent-amber-500"
                    />
                    <span>Other Corrections</span>
                  </label>
                </div>
                {adjustmentSubtype === 'other' && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    Note: For general corrections, use negative quantity to reduce stock (e.g. Recount losses) or positive to add.
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 text-sm font-medium">Quantity (Bags)</label>
                {entryType === 'adjustment' && adjustmentSubtype === 'other' && (
                  <span className="text-[10px] text-amber-400 font-semibold uppercase">Supports negative numbers</span>
                )}
              </div>
              <input
                type={entryType === 'adjustment' && adjustmentSubtype === 'other' ? 'text' : 'number'}
                min={entryType === 'adjustment' && adjustmentSubtype === 'other' ? undefined : '1'}
                placeholder={
                  entryType === 'stock_in'
                    ? 'Enter delivery amount'
                    : adjustmentSubtype === 'wastage'
                    ? 'Wasted bags count'
                    : adjustmentSubtype === 'return'
                    ? 'Returned bags count'
                    : 'Use negative (-) for reductions, e.g. -5'
                }
                className="input-field w-full"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
              />
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-300 text-sm font-medium">Note / Reason</label>
              <textarea
                placeholder={
                  entryType === 'stock_in'
                    ? 'Supplier invoice, delivery notes, etc.'
                    : adjustmentSubtype === 'wastage'
                    ? 'Reason, e.g., Water leakage damage'
                    : adjustmentSubtype === 'return'
                    ? 'Reason, e.g., Customer over-ordered returns'
                    : 'Recount discrepancies, audit details, etc.'
                }
                className="input-field w-full min-h-[80px] py-2 resize-none"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {actionLoading ? 'Saving...' : 'Add Stock Entry'}
            </button>
          </form>
        </div>

        {/* History panel */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl lg:col-span-2 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <TrendingDown className="text-amber-500" size={20} />
              <h2 className="text-white font-semibold text-lg">Stock Movement History</h2>
            </div>
            <div className="flex items-center gap-2">
              <Search size={14} className="text-slate-400" />
              <select
                className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-amber-500"
                value={filterProductId}
                onChange={e => setFilterProductId(e.target.value)}
              >
                <option value="">All Products</option>
                {summaries.map(p => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 border border-slate-700/60 rounded-lg">
            {!filteredEntries.length ? (
              <div className="py-20 text-center text-slate-500 text-sm">
                No inventory changes logged yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900 sticky top-0 z-10">
                    <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider">Date & Time</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider">Product</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider">Type</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider">Change</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => {
                    let typeText = 'Stock In'
                    let typeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    let qtyClass = 'text-emerald-400 font-bold'
                    let qtyPrefix = '+'

                    if (entry.type === 'stock_out') {
                      typeText = 'Label Printed'
                      typeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      qtyClass = 'text-rose-400 font-bold'
                      qtyPrefix = '' // Negative sign is already inside the database entry
                    } else if (entry.type === 'adjustment') {
                      typeText = 'Adjustment'
                      typeClass = 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      qtyClass = entry.quantity_change < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'
                      qtyPrefix = entry.quantity_change > 0 ? '+' : ''
                    }

                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{entry.product_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${typeClass}`}>
                            {typeText}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right ${qtyClass}`}>
                          {qtyPrefix}{entry.quantity_change}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[150px]" title={entry.note}>
                          {entry.note || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
