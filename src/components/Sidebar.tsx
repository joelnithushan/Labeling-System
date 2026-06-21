import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Printer, Barcode, Settings, Wheat,
} from 'lucide-react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/print', icon: Printer, label: 'Print Label' },
  { to: '/barcodes', icon: Barcode, label: 'Barcode History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
          <Wheat size={20} className="text-slate-900" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">Mill Label</p>
          <p className="text-slate-400 text-xs mt-0.5">System v1.0</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-500 text-slate-900'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700">
        <p className="text-slate-500 text-xs">Sri Lankan Mill Business</p>
      </div>
    </aside>
  )
}
