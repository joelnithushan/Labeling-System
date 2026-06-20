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

export function buildLabelHtml(params: {
  product: Product
  settings: AppSettings
  serialNumber: string
  mfgDate: Date
  expDate: Date
  quantity: number
}): string {
  const { product, settings, serialNumber, mfgDate, expDate } = params
  const dateFormat = settings.date_format || 'dd/MM/yyyy'
  const [wMm, hMm] = (settings.label_size || '100x50').split('x').map(Number)
  const isSmall = wMm <= 60

  const barcodeSvg = generateBarcodeSvg(serialNumber, isSmall)
  const mfgStr = format(mfgDate, dateFormat)
  const expStr = format(expDate, dateFormat)

  const fs = (s: number, n: number) => `${isSmall ? s : n}pt`

  return `
<div style="
  width:${wMm}mm; height:${hMm}mm;
  font-family:Arial,sans-serif;
  background:#fff; color:#000;
  display:flex; flex-direction:column;
  box-sizing:border-box;
  padding:${isSmall ? '2mm 2.5mm' : '3mm 4mm'};
  overflow:hidden;
">

  <!-- Shop name -->
  <div style="
    text-align:center; font-weight:800;
    text-transform:uppercase; letter-spacing:1px;
    font-size:${fs(6, 11)};
    border-bottom:2px solid #000;
    padding-bottom:1mm; margin-bottom:1.5mm;
  ">${esc(settings.shop_name)}</div>

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
      background:#222; color:#fff; font-weight:700;
      font-size:${fs(5, 7)}; padding:0.5mm 1.5mm;
      letter-spacing:0.5px; display:flex; align-items:center;
    ">NET WT</div>
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
      background:#222; color:#fff; font-weight:700;
      font-size:${fs(5, 7)}; padding:0.5mm 1.5mm;
      letter-spacing:0.5px; display:flex; align-items:center;
    ">PRICE</div>
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
      <div style="font-size:${fs(4.5, 6.5)}pt; color:#888; text-transform:uppercase; font-weight:700; letter-spacing:0.3px;">Mfg Date</div>
      <div style="font-size:${fs(6, 9)}; font-weight:600; margin-top:0.3mm;">${mfgStr}</div>
    </div>
    <div style="border:1px solid #ccc; border-radius:2px; padding:1mm;">
      <div style="font-size:${fs(4.5, 6.5)}pt; color:#888; text-transform:uppercase; font-weight:700; letter-spacing:0.3px;">Exp Date</div>
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

  ${settings.phone ? `<div style="text-align:center;font-size:${fs(4, 6)};color:#999;margin-top:0.3mm;">${esc(settings.phone)}</div>` : ''}
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
