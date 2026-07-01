import { useState, useEffect, useCallback, useRef } from 'react'
import { Printer, RotateCcw, CheckCircle, AlertCircle, Package, Phone, MessageCircle } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { useProducts } from '../hooks/useProducts'
import LabelPreview from '../components/LabelPreview'
import TamilInput from '../components/TamilInput'
import { generateSerial } from '../utils/serial'
import { buildLabelHtml, DEFAULT_LABEL_FIELDS, type LabelFields } from '../utils/print'
import type { AppSettings, Product, StockSummary } from '../types'

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
    whatsapp: '',
    username: 'admin',
    password: 'admin',
    logo: '',
    theme: 'dark',
    label_net_wt: 'Net Wt',
    label_price: 'Price',
    label_mfg: 'Mfg',
    label_exp: 'Exp',
  })

  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [mfgDate, setMfgDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [expDateOverride, setExpDateOverride] = useState('')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [serialNumber, setSerialNumber] = useState('')
  const [status, setStatus] = useState<PrintStatus>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [generatingSerial, setGeneratingSerial] = useState(false)
  const [stockSummaries, setStockSummaries] = useState<{ product_id: number; current_stock: number }[]>([])

  const [labelFields, setLabelFields] = useState<LabelFields>(DEFAULT_LABEL_FIELDS)
  const [labelFieldsLoaded, setLabelFieldsLoaded] = useState(false)
  const settingsRef = useRef<AppSettings | null>(null)
  const [logoOpacity, setLogoOpacity] = useState(0.2)
  const [logoSize, setLogoSize] = useState(85)

  const selectedProduct = products.find(p => p.id === selectedId) ?? null
  const currentStock = typeof selectedId === 'number'
    ? (stockSummaries.find(s => s.product_id === selectedId)?.current_stock ?? null)
    : null


  const shelfDays = selectedProduct?.shelf_life_days ?? 180
  const autoExpDate = addDays(new Date(mfgDate), Math.max(shelfDays, 1))
  const expDate = expDateOverride ? new Date(expDateOverride) : autoExpDate
  const minExpDate = format(addDays(new Date(mfgDate), 1), 'yyyy-MM-dd')


  // Load settings (used on mount and whenever Settings are saved elsewhere)
  const loadSettings = useCallback(() => {
    window.electron.db.getSettings().then(s => {
      const appSettings = s as AppSettings
      setSettings(appSettings)
      settingsRef.current = appSettings
      setLabelFields({
        netWtLabel: appSettings.label_net_wt || DEFAULT_LABEL_FIELDS.netWtLabel,
        priceLabel: appSettings.label_price || DEFAULT_LABEL_FIELDS.priceLabel,
        mfgLabel: appSettings.label_mfg || DEFAULT_LABEL_FIELDS.mfgLabel,
        expLabel: appSettings.label_exp || DEFAULT_LABEL_FIELDS.expLabel,
      })
      setLabelFieldsLoaded(true)
    })
  }, [])

  // Load settings on mount; refresh settings when saved in Settings page
  useEffect(() => {
    loadSettings()
    window.addEventListener('settingsUpdated', loadSettings)
    return () => window.removeEventListener('settingsUpdated', loadSettings)
  }, [loadSettings])

  // Fetch stock summary for read-only display (no writes, no deductions)
  useEffect(() => {
    window.electron.db.getStockSummary().then(s =>
      setStockSummaries((s as { product_id: number; current_stock: number }[]))
    )
  }, [selectedId])

  // Auto-save label fields to DB whenever they change (debounced)
  useEffect(() => {
    if (!labelFieldsLoaded || !settingsRef.current) return
    const timer = setTimeout(() => {
      window.electron.db.updateSettings({
        ...settingsRef.current!,
        label_net_wt: labelFields.netWtLabel,
        label_price: labelFields.priceLabel,
        label_mfg: labelFields.mfgLabel,
        label_exp: labelFields.expLabel,
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [labelFields, labelFieldsLoaded])



  // Reset quantity to 1 when product changes if it's currently empty, otherwise keep user input
  useEffect(() => {
    if (selectedId === '') return
    if (quantity === '') {
      setQuantity(1)
    }
  }, [selectedId])

  // Clear expiry override if it becomes invalid when mfg date changes
  useEffect(() => {
    if (expDateOverride && expDateOverride <= mfgDate) {
      setExpDateOverride('')
    }
  }, [mfgDate])

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
    const qtyVal = Number(quantity) || 1
    setStatus('printing')
    setStatusMsg('')

    try {
      const html = buildLabelHtml({
        product: selectedProduct,
        settings,
        serialNumber,
        mfgDate: new Date(mfgDate),
        expDate,
        quantity: qtyVal,
        labelFields,
        logoOpacity,
        logoSize,
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
        quantity: qtyVal,
        mfg_date: format(new Date(mfgDate), 'dd/MM/yyyy'),
        exp_date: format(expDate, 'dd/MM/yyyy'),
      })

      // Print
      const result = await window.electron.print.label({
        html,
        printerName: settings.printer_name,
        labelSize: settings.label_size,
        copies: qtyVal,
      })

      if (result.success) {
        setStatus('success')
        setStatusMsg(`Printed ${qtyVal} label${qtyVal > 1 ? 's' : ''} successfully.`)
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

  const canPrint = !!selectedProduct && !!serialNumber && !generatingSerial && status !== 'printing' && typeof quantity === 'number' && quantity >= 1

  return (
    <div className="p-6 flex gap-6 h-[calc(100vh-64px)] min-w-0">
      {/* Left: Controls */}
      <div className="w-80 flex-shrink-0 space-y-5 overflow-y-auto pr-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Print Label</h1>
          <p className="text-slate-400 text-sm mt-1">Configure and print a label</p>
        </div>

        {/* Shop info (editable) */}
        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-3 space-y-2">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Shop Info</p>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Shop Name</label>
            <TamilInput
              className="input-field w-full text-sm py-1"
              value={settings.shop_name}
              onChange={v => setSettings(prev => ({ ...prev, shop_name: v }))}
              placeholder="Shop name"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Address</label>
            <TamilInput
              className="input-field w-full text-sm py-1"
              value={settings.address}
              onChange={v => setSettings(prev => ({ ...prev, address: v }))}
              placeholder="Address (optional)"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-slate-400 text-xs mb-1">
              <Phone size={11} />
              Call Number
            </label>
            <input
              className="input-field w-full text-sm py-1"
              value={settings.phone}
              onChange={e => setSettings(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Call number (optional)"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-slate-400 text-xs mb-1">
              <MessageCircle size={11} className="text-emerald-400" />
              WhatsApp Number
            </label>
            <input
              className="input-field w-full text-sm py-1"
              value={settings.whatsapp}
              onChange={e => setSettings(prev => ({ ...prev, whatsapp: e.target.value }))}
              placeholder="WhatsApp number (optional)"
            />
          </div>
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-slate-300 text-sm">Manufacturing Date</label>
            <button
              type="button"
              onClick={() => setMfgDate(format(new Date(), 'yyyy-MM-dd'))}
              className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
            >
              Today
            </button>
          </div>
          <input
            type="date"
            className="input-field w-36"
            value={mfgDate}
            onChange={e => setMfgDate(e.target.value)}
          />
        </div>

        {/* Expiry date */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-slate-300 text-sm">Expiry Date</label>
            {expDateOverride && (
              <button
                type="button"
                onClick={() => setExpDateOverride('')}
                className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
              >
                Auto ({shelfDays}d)
              </button>
            )}
            {!expDateOverride && (
              <span className="text-xs text-slate-500">Auto ({shelfDays}d shelf life)</span>
            )}
          </div>
          <input
            type="date"
            min={minExpDate}
            className="input-field w-36"
            value={expDateOverride || format(autoExpDate, 'yyyy-MM-dd')}
            onChange={e => {
              const val = e.target.value
              if (val && val <= mfgDate) {
                setExpDateOverride(minExpDate)
              } else {
                setExpDateOverride(val)
              }
            }}
          />
        </div>

        {/* Quantity */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-slate-300 text-sm">Quantity (copies)</label>
            {currentStock !== null && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                currentStock <= 0
                  ? 'bg-red-900/40 text-red-400'
                  : currentStock <= 10
                  ? 'bg-amber-900/40 text-amber-400'
                  : 'bg-emerald-900/30 text-emerald-400'
              }`}>
                Stock: {currentStock}
              </span>
            )}
          </div>
          <input
            type="number"
            min={1}
            max={999}
            className="input-field w-full"
            value={quantity}
            onChange={e => {
              const val = e.target.value
              if (val === '') {
                setQuantity('')
              } else {
                const parsed = parseInt(val, 10)
                setQuantity(isNaN(parsed) ? '' : parsed)
              }
            }}
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

        {/* Label field names */}
        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-3 space-y-2">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Label Field Names</p>
          {(
            [
              { key: 'netWtLabel', placeholder: 'NET WT' },
              { key: 'priceLabel', placeholder: 'PRICE' },
              { key: 'mfgLabel',   placeholder: 'Mfg Date' },
              { key: 'expLabel',   placeholder: 'Exp Date' },
            ] as { key: keyof LabelFields; placeholder: string }[]
          ).map(({ key, placeholder }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-slate-500 text-xs w-16 flex-shrink-0">{placeholder}</span>
              <TamilInput
                className="input-field flex-1 text-sm py-1"
                value={labelFields[key]}
                placeholder={placeholder}
                onChange={v => setLabelFields(prev => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}
        </div>

        {/* Logo watermark controls */}
        {settings.logo && (
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-3 space-y-3">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Logo Watermark</p>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Size</span>
                <span>{logoSize}%</span>
              </div>
              <input
                type="range" min={20} max={100} step={5}
                value={logoSize}
                onChange={e => setLogoSize(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Opacity</span>
                <span>{Math.round(logoOpacity * 100)}%</span>
              </div>
              <input
                type="range" min={5} max={60} step={5}
                value={Math.round(logoOpacity * 100)}
                onChange={e => setLogoOpacity(Number(e.target.value) / 100)}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        )}

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
          labelFields={labelFields}
          logoOpacity={logoOpacity}
          logoSize={logoSize}
        />
      </div>
    </div>
  )
}
