import JsBarcode from 'jsbarcode'
import { format } from 'date-fns'
import type { AppSettings, Product } from '../types'

function generateBarcodeSvg(value: string, isSmall: boolean): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  JsBarcode(svg, value, {
    format: 'CODE128',
    lineColor: '#000000',
    background: '#ffffff',
    width: isSmall ? 1.4 : 2,
    height: isSmall ? 28 : 44,
    displayValue: false,
    margin: 3,
  })
  return new XMLSerializer().serializeToString(svg)
}

export interface LabelFields {
  netWtLabel: string
  priceLabel: string
  mfgLabel: string
  expLabel: string
}

// SVG path data shared by the printed label (print.ts) and the live preview
// (LabelPreview.tsx) so the two icon renderings stay identical.
export const PHONE_ICON_PATH =
  'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z'
export const WHATSAPP_ICON_PATH =
  'M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.06c-.24.68-1.42 1.31-1.95 1.36-.5.05-1.13.07-1.83-.11-.42-.13-.96-.31-1.65-.61-2.91-1.26-4.81-4.19-4.96-4.39-.14-.2-1.18-1.57-1.18-2.99 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.77-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.82 2.04.89 2.19.07.15.12.32.02.52-.1.2-.15.32-.29.49-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.12.63-.07.17-.2.73-.85.93-1.14.19-.29.39-.24.65-.15.27.1 1.71.81 2 .96.29.15.49.22.56.34.07.12.07.69-.17 1.37z'

export const DEFAULT_LABEL_FIELDS: LabelFields = {
  netWtLabel: 'NET WT',
  priceLabel: 'PRICE',
  mfgLabel: 'Mfg Date',
  expLabel: 'Exp Date',
}

export function buildLabelHtml(params: {
  product: Product
  settings: AppSettings
  serialNumber: string
  mfgDate: Date
  expDate: Date
  quantity: number
  labelFields?: LabelFields
  logoOpacity?: number
  logoSize?: number
}): string {
  const { product, settings, serialNumber, mfgDate, expDate, labelFields, logoOpacity = 0.2, logoSize = 85 } = params
  const lf: LabelFields = { ...DEFAULT_LABEL_FIELDS, ...labelFields }
  const dateFormat = settings.date_format || 'dd/MM/yyyy'
  const [wMm, hMm] = (settings.label_size || '100x50').split('x').map(Number)
  const isSmall = wMm <= 60

  const barcodeSvg = generateBarcodeSvg(serialNumber, isSmall)
  const mfgStr = format(mfgDate, dateFormat)
  const expStr = format(expDate, dateFormat)

  const fs = (s: number, n: number) => `${isSmall ? s : n}pt`

  const iconPx = isSmall ? 6 : 9
  const phoneIcon = `<svg viewBox="0 0 24 24" width="${iconPx}" height="${iconPx}" fill="#444" style="flex-shrink:0;"><path d="${PHONE_ICON_PATH}"/></svg>`
  const whatsappIcon = `<svg viewBox="0 0 24 24" width="${iconPx}" height="${iconPx}" fill="#25D366" style="flex-shrink:0;"><path d="${WHATSAPP_ICON_PATH}"/></svg>`

  const logoStyle = settings.logo
    ? `position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
       width:${logoSize}%; height:${logoSize}%; object-fit:contain; opacity:${logoOpacity}; pointer-events:none;`
    : ''

  return `
<div style="
  width:${wMm}mm; height:${hMm}mm;
  font-family:'Noto Sans Tamil',Arial,sans-serif;
  background:#fff; color:#000;
  display:flex; flex-direction:column;
  box-sizing:border-box;
  padding:${isSmall ? '2mm 2.5mm' : '3mm 4mm'};
  overflow:hidden; position:relative;
">
  ${settings.logo ? `<img src="${settings.logo}" style="${logoStyle}" alt="" />` : ''}

  <!-- Shop name + phone -->
  <div style="
    text-align:center;
    border-bottom:2px solid #000;
    padding-bottom:1mm; margin-bottom:1.5mm;
  ">
    <div style="font-weight:800; text-transform:uppercase; letter-spacing:1px; font-size:${fs(6, 11)};">${esc(settings.shop_name)}</div>
    ${settings.address ? `<div style="font-size:${fs(4.5, 7)}; color:#555; margin-top:0.2mm;">${esc(settings.address)}</div>` : ''}
    ${(settings.phone || settings.whatsapp) ? `
    <div style="
      display:flex; justify-content:center; align-items:center; flex-wrap:wrap;
      gap:${isSmall ? '2mm' : '3mm'}; margin-top:0.4mm;
      font-size:${fs(4.5, 7)}; color:#444;
    ">
      ${settings.phone ? `<span style="display:inline-flex; align-items:center; gap:0.6mm;">${phoneIcon}<span>${esc(settings.phone)}</span></span>` : ''}
      ${settings.whatsapp ? `<span style="display:inline-flex; align-items:center; gap:0.6mm;">${whatsappIcon}<span>${esc(settings.whatsapp)}</span></span>` : ''}
    </div>` : ''}
  </div>

  <!-- Product name -->
  <div style="
    text-align:center; font-weight:700;
    font-size:${fs(9, 14)};
    line-height:1.2; margin-bottom:1.5mm;
  ">${esc(product.name)}</div>

  <!-- Net weight row -->
  <div style="
    display:flex; align-items:stretch;
    border:1px solid #ccc; border-radius:2px;
    margin-bottom:1mm; overflow:hidden;
  ">
    <div style="
      background:#f3f4f6; color:#4b5563; font-weight:700;
      border-right:1px solid #d1d5db;
      font-size:${fs(5, 7)}; padding:0.5mm 1.5mm;
      letter-spacing:0.5px; display:flex; align-items:center;
    ">${esc(lf.netWtLabel)}</div>
    <div style="
      flex:1; text-align:center; font-weight:600;
      font-size:${fs(6, 9)}; padding:0.5mm;
      display:flex; align-items:center; justify-content:center;
    ">${esc(product.weight)} ${esc(product.weight_unit)}</div>
  </div>

  <!-- Price row -->
  <div style="
    display:flex; align-items:stretch;
    border:1px solid #ccc; border-radius:2px;
    margin-bottom:1.5mm; overflow:hidden;
  ">
    <div style="
      background:#f3f4f6; color:#4b5563; font-weight:700;
      border-right:1px solid #d1d5db;
      font-size:${fs(5, 7)}; padding:0.5mm 1.5mm;
      letter-spacing:0.5px; display:flex; align-items:center;
    ">${esc(lf.priceLabel)}</div>
    <div style="
      flex:1; text-align:center; font-weight:600;
      font-size:${fs(6, 9)}; padding:0.5mm;
      display:flex; align-items:center; justify-content:center;
    ">Rs. ${Number(product.price).toFixed(2)}</div>
  </div>

  <!-- Dates -->
  <div style="
    display:grid; grid-template-columns:1fr 1fr;
    gap:1mm; margin-bottom:1.5mm;
  ">
    <div style="border:1px solid #ccc; border-radius:2px; padding:1mm;">
      <div style="font-size:${fs(4.5, 6.5)}pt; color:#888; font-weight:700; letter-spacing:0.3px;">${esc(lf.mfgLabel)}</div>
      <div style="font-size:${fs(6, 9)}; font-weight:600; margin-top:0.3mm;">${mfgStr}</div>
    </div>
    <div style="border:1px solid #ccc; border-radius:2px; padding:1mm;">
      <div style="font-size:${fs(4.5, 6.5)}pt; color:#888; font-weight:700; letter-spacing:0.3px;">${esc(lf.expLabel)}</div>
      <div style="font-size:${fs(6, 9)}; font-weight:600; margin-top:0.3mm;">${expStr}</div>
    </div>
  </div>

  <!-- Barcode -->
  <div style="flex:1; display:flex; align-items:center; justify-content:center;">
    ${barcodeSvg}
  </div>

  <!-- Serial number -->
  <div style="
    text-align:center; font-family:'Courier New',monospace;
    font-size:${fs(4.5, 6.5)}; color:#666; margin-top:0.5mm;
    letter-spacing:0.5px;
  ">${esc(serialNumber)}</div>

</div>`
}

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function printLabel(params: {
  product: Product
  settings: AppSettings
  serialNumber: string
  mfgDate: Date
  expDate: Date
  quantity: number
}): Promise<{ success: boolean; error?: string }> {
  const html = buildLabelHtml(params)
  return window.electron.print.label({
    html,
    printerName: params.settings.printer_name,
    labelSize: params.settings.label_size,
  })
}
