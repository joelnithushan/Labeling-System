import { format } from 'date-fns'
import type { Barcode } from '../types'

interface Props {
  barcodes: Barcode[]
  loading: boolean
}

export default function BarcodeTable({ barcodes, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        Loading…
      </div>
    )
  }

  if (!barcodes.length) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        No records found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            {['Serial Number', 'Product', 'Category', 'Weight', 'Price', 'Qty', 'Mfg Date', 'Exp Date', 'Printed At'].map(h => (
              <th key={h} className="text-left text-slate-400 font-medium px-3 py-3 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {barcodes.map(b => (
            <tr key={b.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
              <td className="px-3 py-2.5 font-mono text-amber-400 whitespace-nowrap text-xs">
                {b.serial_number}
              </td>
              <td className="px-3 py-2.5 text-white whitespace-nowrap">{b.product_name}</td>
              <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">
                <span className="bg-slate-700 px-2 py-0.5 rounded-full text-xs">
                  {b.category}
                </span>
              </td>
              <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">
                {b.weight} {b.weight_unit}
              </td>
              <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">
                Rs. {Number(b.price).toFixed(2)}
              </td>
              <td className="px-3 py-2.5 text-slate-300 text-center">{b.quantity}</td>
              <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap text-xs">
                {b.mfg_date}
              </td>
              <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap text-xs">
                {b.exp_date}
              </td>
              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-xs">
                {format(new Date(b.printed_at), 'dd/MM/yyyy HH:mm')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
