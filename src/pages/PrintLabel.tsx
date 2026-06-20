import { useState, useEffect, useCallback } from 'react'
import { Printer, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { useProducts } from '../hooks/useProducts'
import LabelPreview from '../components/LabelPreview'
import { generateSerial } from '../utils/serial'
import { buildLabelHtml } from '../utils/print'
import type { AppSettings, Product } from '../types'

type PrintStatus = 'idle' | 'printing' | 'success' | 'error'

export default function PrintLabel() {
  const { products, loading: productsLoading } = useProducts()
  const [settings, setSettings] = useState<AppSettings>({
    shop_name: 'My Mill Shop',
    printer_name: '',
    label_size: '100x50',
    date_format: 'dd/MM/yyyy',
    address: '',
    phone: '',
  })

  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [mfgDate, setMfgDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [quantity, setQuantity] = useState(1)
  const [serialNumber, setSerialNumber] = useState('')
  const [status, setStatus] = useState<PrintStatus>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [generatingSerial, setGeneratingSerial] = useState(false)

  const selectedProduct = products.find(p => p.id === selectedId) ?? null

  const expDate = selectedProduct
    ? addDays(new Date(mfgDate), selectedProduct.shelf_life_days)
    : addDays(new Date(mfgDate), 180)

  // Load settings on mount
  useEffect(() => {
    window.electron.db.getSettings().then(s => setSettings(s as AppSettings))
  }, [])

  // Regenerate serial when product or mfg date changes
  const refreshSerial = useCallback(async () => {
    if (!selectedProduct) return
    setGeneratingSerial(true)
    try {
      const s = await generateSerial(selectedProduct.category, new Date(mfgDate))
      setSerialNumber(s)
    } finally {
      setGeneratingSerial(false)
    }
  }, [selectedProduct, mfgDate])

  useEffect(() => { refreshSerial() }, [refreshSerial])

  async function handlePrint() {
    if (!selectedProduct || !serialNumber) return
    setStatus('printing')
    setStatusMsg('')

    try {
      const html = buildLabelHtml({
        product: selectedProduct,
        settings,
        serialNumber,
        mfgDate: new Date(mfgDate),
        expDate,
        quantity,
      })

      // Save barcode record first
      await window.electron.db.addBarcode({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        category: selectedProduct.category,
        weight: selectedProduct.weight,
        weight_unit: selectedProduct.weight_unit,
        price: selectedProduct.price,
        serial_number: serialNumber,
        barcode_value: serialNumber,
        quantity,
        mfg_date: format(new Date(mfgDate), 'dd/MM/yyyy'),
        exp_date: format(expDate, 'dd/MM/yyyy'),
      })

      // Print
      const result = await window.electron.print.label({
        html,
        printerName: settings.printer_name,
        labelSize: settings.label_size,
      })

      if (result.success) {
        setStatus('success')
        setStatusMsg(`Printed ${quantity} label${quantity > 1 ? 's' : ''} successfully.`)
        // Regenerate serial for next print
        refreshSerial()
      } else {
        setStatus('error')
        setStatusMsg(result.error ?? 'Print failed.')
      }
    } catch (e) {
      setStatus('error')
      setStatusMsg(String(e))
    }
  }

  const canPrint = !!selectedProduct && !!serialNumber && !generatingSerial && status !== 'printing'

  return (
    <div className="p-6 flex gap-6 h-[calc(100vh-64px)]">
      {/* Left: Controls */}
      <div className="w-80 flex-shrink-0 space-y-5 overflow-y-auto">
        <div>
          <h1 className="text-white text-2xl font-bold">Print Label</h1>
          <p className="text-slate-400 text-sm mt-1">Configure and print a label</p>
        </div>

        {/* Product select */}
        <div>
          <label className="block text-slate-300 text-sm mb-1.5">Product *</label>
          <select
            className="input-field w-full"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : '')}
            disabled={productsLoading}
          >
            <option value="">— Select a product —</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.weight}{p.weight_unit})
              </option>
            ))}
          </select>
        </div>

        {/* Manufacturing date */}
        <div>
          <label className="block text-slate-300 text-sm mb-1.5">Manufacturing Date</label>
          <input
            type="date"
            className="input-field w-full"
            value={mfgDate}
            onChange={e => setMfgDate(e.target.value)}
          />
        </div>

        {/* Expiry (calculated) */}
        <div>
          <label className="block text-slate-300 text-sm mb-1.5">Expiry Date (auto-calculated)</label>
          <input
            type="text"
            readOnly
            className="input-field w-full bg-slate-700/50 cursor-not-allowed text-slate-400"
            value={selectedProduct ? format(expDate, 'yyyy-MM-dd') : '—'}
          />
          {selectedProduct && (
            <p className="text-slate-500 text-xs mt-1">{selectedProduct.shelf_life_days} day shelf life</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-slate-300 text-sm mb-1.5">Quantity (copies)</label>
          <input
            type="number"
            min={1}
            max={999}
            className="input-field w-full"
            value={quantity}
            onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        {/* Serial number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-slate-300 text-sm">Serial Number</label>
            <button
              onClick={refreshSerial}
              disabled={!selectedProduct || generatingSerial}
              className="text-slate-400 hover:text-amber-400 transition-colors"
              title="Regenerate serial"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 font-mono text-amber-400 text-sm">
            {generatingSerial ? 'Generating…' : serialNumber || '—'}
          </div>
        </div>

        {/* Printer info */}
        <div className="bg-slate-700/30 rounded-lg px-3 py-2.5 text-sm">
          <p className="text-slate-400 text-xs mb-0.5">Printer</p>
          <p className="text-slate-200">
            {settings.printer_name || <span className="text-slate-500 italic">No printer set — using system dialog</span>}
          </p>
        </div>

        {/* Status */}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-2.5">
            <CheckCircle size={16} />
            {statusMsg}
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2.5">
            <AlertCircle size={16} />
            {statusMsg}
          </div>
        )}

        {/* Print button */}
        <button
          onClick={handlePrint}
          disabled={!canPrint}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer size={20} />
          {status === 'printing' ? 'Printing…' : 'Print Label'}
        </button>
      </div>

      {/* Right: Preview */}
      <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden">
        <LabelPreview
          product={selectedProduct}
          settings={settings}
          serialNumber={serialNumber}
          mfgDate={new Date(mfgDate)}
          expDate={expDate}
        />
      </div>
    </div>
  )
}
