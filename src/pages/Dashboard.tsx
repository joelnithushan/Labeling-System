import { useState, useEffect } from 'react'
import { Package, Printer, CalendarCheck, Layers } from 'lucide-react'
import { format } from 'date-fns'
import StatCard from '../components/StatCard'
import type { DashboardStats } from '../types'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electron.db.getStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          {format(new Date(), 'EEEE, dd MMMM yyyy')}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={stats?.total_products ?? 0}
          icon={Package}
          color="amber"
        />
        <StatCard
          label="Total Labels Printed"
          value={stats?.total_printed ?? 0}
          icon={Printer}
          color="blue"
        />
        <StatCard
          label="Printed Today"
          value={stats?.today_printed ?? 0}
          icon={CalendarCheck}
          color="green"
        />
        <StatCard
          label="Categories"
          value={stats?.categories ?? 0}
          icon={Layers}
          color="purple"
        />
      </div>

      {/* Recent barcodes */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="px-5 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold">Recent Activity</h2>
          <p className="text-slate-400 text-sm mt-0.5">Last 10 printed labels</p>
        </div>

        {!stats?.recent_barcodes.length ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No labels printed yet. Go to <b>Print Label</b> to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Serial Number', 'Product', 'Qty', 'Printed At'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent_barcodes.map(b => (
                  <tr key={b.id} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                    <td className="px-4 py-2.5 font-mono text-amber-400 text-xs">{b.serial_number}</td>
                    <td className="px-4 py-2.5 text-white">{b.product_name}</td>
                    <td className="px-4 py-2.5 text-slate-300">{b.quantity}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">
                      {format(new Date(b.printed_at), 'dd/MM/yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
