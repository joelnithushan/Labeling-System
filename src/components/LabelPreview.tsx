import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { format } from 'date-fns'
import type { Product, AppSettings } from '../types'

interface Props {
  product: Product | null
  settings: AppSettings
  serialNumber: string
  mfgDate: Date
  expDate: Date
}

export default function LabelPreview({ product, settings, serialNumber, mfgDate, expDate }: Props) {
  const barcodeRef = useRef<SVGSVGElement>(null)
  const dateFormat = settings.date_format || 'dd/MM/yyyy'
  const [wMm, hMm] = (settings.label_size || '100x50').split('x').map(Number)
  const isSmall = wMm <= 60

  useEffect(() => {
    if (barcodeRef.current && serialNumber) {
      try {
        JsBarcode(barcodeRef.current, serialNumber, {
          format: 'CODE128',
          lineColor: '#000000',
          background: '#ffffff',
          width: isSmall ? 1.2 : 1.6,
          height: isSmall ? 28 : 40,
          displayValue: false,
          margin: 3,
        })
      } catch {
        // invalid value before serial is ready
      }
    }
  }, [serialNumber, isSmall])

  if (!product) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Select a product to preview the label
      </div>
    )
  }

  const scale = Math.min(360 / wMm, 260 / hMm)

  const fs = (small: string, normal: string) => (isSmall ? small : normal)

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-slate-400 text-xs uppercase tracking-widest">Label Preview</p>

      <div
        style={{ width: wMm * scale, height: hMm * scale }}
        className="bg-white border-2 border-slate-300 rounded shadow-xl overflow-hidden"
      >
        <div
          className="w-full h-full flex flex-col bg-white text-black"
          style={{ padding: isSmall ? '3px 4px' : '5px 7px', fontFamily: 'Arial, sans-serif' }}
        >
          {/* ── Shop name ── */}
          <div
            className="text-center font-extrabold uppercase tracking-widest border-b-2 border-black pb-0.5 mb-1"
            style={{ fontSize: fs('7px', '12px') }}
          >
            {settings.shop_name || 'My Mill Shop'}
          </div>

          {/* ── Product name ── */}
          <div
            className="text-center font-bold leading-tight mb-1"
            style={{ fontSize: fs('10px', '15px') }}
          >
            {product.name}
          </div>

          {/* ── Weight ── */}
          <div
            className="flex items-center border border-gray-300 rounded mb-0.5"
            style={{ fontSize: fs('6.5px', '9px') }}
          >
            <span
              className="bg-gray-800 text-white font-bold px-1 py-0.5"
              style={{ fontSize: fs('5.5px', '7.5px'), letterSpacing: '0.02em' }}
            >
              NET WT
            </span>
            <span className="flex-1 text-center font-semibold">
              {product.weight} {product.weight_unit}
            </span>
          </div>

          {/* ── Price ── */}
          <div
            className="flex items-center border border-gray-300 rounded mb-1"
            style={{ fontSize: fs('6.5px', '9px') }}
          >
            <span
              className="bg-gray-800 text-white font-bold px-1 py-0.5"
              style={{ fontSize: fs('5.5px', '7.5px'), letterSpacing: '0.02em' }}
            >
              PRICE
            </span>
            <span className="flex-1 text-center font-semibold">
              Rs. {Number(product.price).toFixed(2)}
            </span>
          </div>

          {/* ── Mfg + Exp dates ── */}
          <div
            className="grid grid-cols-2 gap-0.5 mb-1"
            style={{ fontSize: fs('5.5px', '8px') }}
          >
            <div className="border border-gray-300 rounded px-1 py-0.5">
              <span className="font-bold text-gray-500 uppercase" style={{ fontSize: fs('4.5px', '6.5px') }}>
                Mfg Date
              </span>
              <div className="font-semibold">{format(mfgDate, dateFormat)}</div>
            </div>
            <div className="border border-gray-300 rounded px-1 py-0.5">
              <span className="font-bold text-gray-500 uppercase" style={{ fontSize: fs('4.5px', '6.5px') }}>
                Exp Date
              </span>
              <div className="font-semibold">{format(expDate, dateFormat)}</div>
            </div>
          </div>

          {/* ── Barcode ── */}
          <div className="flex-1 flex items-center justify-center">
            <svg ref={barcodeRef} />
          </div>

          {/* ── Serial + phone ── */}
          <div
            className="text-center text-gray-500 mt-0.5"
            style={{ fontSize: fs('4.5px', '6.5px'), fontFamily: 'Courier New, monospace' }}
          >
            {serialNumber}
          </div>
          {settings.phone && (
            <div
              className="text-center text-gray-400"
              style={{ fontSize: fs('4px', '6px') }}
            >
              {settings.phone}
            </div>
          )}
        </div>
      </div>

      <div className="text-slate-500 text-xs">{wMm}mm × {hMm}mm</div>
    </div>
  )
}
