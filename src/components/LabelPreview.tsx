import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { format } from 'date-fns'
import type { Product, AppSettings } from '../types'
import { DEFAULT_LABEL_FIELDS, PHONE_ICON_PATH, WHATSAPP_ICON_PATH, type LabelFields } from '../utils/print'

interface Props {
  product: Product | null
  settings: AppSettings
  serialNumber: string
  mfgDate: Date
  expDate: Date
  labelFields?: LabelFields
  logoOpacity?: number
  logoSize?: number
}

export default function LabelPreview({ product, settings, serialNumber, mfgDate, expDate, labelFields, logoOpacity = 0.2, logoSize = 85 }: Props) {
  const lf: LabelFields = { ...DEFAULT_LABEL_FIELDS, ...labelFields }
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
          className="w-full h-full flex flex-col bg-white text-black relative"
          style={{ padding: isSmall ? '3px 4px' : '5px 7px', fontFamily: 'Arial, sans-serif' }}
        >
          {settings.logo && (
            <img
              src={settings.logo}
              alt=""
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${logoSize}%`, height: `${logoSize}%`,
                objectFit: 'contain', opacity: logoOpacity,
                pointerEvents: 'none',
              }}
            />
          )}
          {/* ── Shop name + address + phone ── */}
          <div className="text-center border-b-2 border-black pb-0.5 mb-1">
            <div className="font-extrabold uppercase tracking-widest" style={{ fontSize: fs('7px', '12px') }}>
              {settings.shop_name || 'My Mill Shop'}
            </div>
            {settings.address && (
              <div className="text-gray-500" style={{ fontSize: fs('4.5px', '7px') }}>
                {settings.address}
              </div>
            )}
            {(settings.phone || settings.whatsapp) && (
              <div
                className="flex justify-center items-center flex-wrap text-gray-600"
                style={{ gap: fs('5px', '8px'), fontSize: fs('4.5px', '7px'), marginTop: '1px' }}
              >
                {settings.phone && (
                  <span className="inline-flex items-center" style={{ gap: '2px' }}>
                    <svg viewBox="0 0 24 24" fill="#444" style={{ width: fs('6px', '9px'), height: fs('6px', '9px'), flexShrink: 0 }}>
                      <path d={PHONE_ICON_PATH} />
                    </svg>
                    <span>{settings.phone}</span>
                  </span>
                )}
                {settings.whatsapp && (
                  <span className="inline-flex items-center" style={{ gap: '2px' }}>
                    <svg viewBox="0 0 24 24" fill="#25D366" style={{ width: fs('6px', '9px'), height: fs('6px', '9px'), flexShrink: 0 }}>
                      <path d={WHATSAPP_ICON_PATH} />
                    </svg>
                    <span>{settings.whatsapp}</span>
                  </span>
                )}
              </div>
            )}
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
              className="bg-gray-100 text-gray-600 font-bold px-1 py-0.5 border-r border-gray-300"
              style={{ fontSize: fs('5.5px', '7.5px'), letterSpacing: '0.02em' }}
            >
              {lf.netWtLabel}
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
              className="bg-gray-100 text-gray-600 font-bold px-1 py-0.5 border-r border-gray-300"
              style={{ fontSize: fs('5.5px', '7.5px'), letterSpacing: '0.02em' }}
            >
              {lf.priceLabel}
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
              <span className="font-bold text-gray-500" style={{ fontSize: fs('4.5px', '6.5px') }}>
                {lf.mfgLabel}
              </span>
              <div className="font-semibold">{format(mfgDate, dateFormat)}</div>
            </div>
            <div className="border border-gray-300 rounded px-1 py-0.5">
              <span className="font-bold text-gray-500" style={{ fontSize: fs('4.5px', '6.5px') }}>
                {lf.expLabel}
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
        </div>
      </div>

      <div className="text-slate-500 text-xs">{wMm}mm × {hMm}mm</div>
    </div>
  )
}
