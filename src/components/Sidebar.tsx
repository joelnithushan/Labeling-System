import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Boxes, Printer, Barcode, Settings, Wheat, LogOut,
} from 'lucide-react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/stock', icon: Boxes, label: 'Stock' },
  { to: '/print', icon: Printer, label: 'Print Label' },
  { to: '/barcodes', icon: Barcode, label: 'Barcode History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface Props {
  onLogout: () => void
}

export default function Sidebar({ onLogout }: Props) {
  const [logo, setLogo] = useState('')
  const [shopName, setShopName] = useState('')

  function loadSettings() {
    window.electron.db.getSettings().then(s => {
      setLogo(s.logo || '')
      setShopName(s.shop_name || '')
    })
  }

  useEffect(() => {
    loadSettings()
    window.addEventListener('settingsUpdated', loadSettings)
    return () => window.removeEventListener('settingsUpdated', loadSettings)
  }, [])

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col h-screen">
      {/* Header */}
      <div className="px-5 py-5 border-b border-slate-700 flex items-center gap-3">
        {logo ? (
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src={logo} alt="Logo" className="w-full h-full object-contain p-0.5" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Wheat size={20} className="text-slate-900" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-none truncate">{shopName || 'Mill Label'}</p>
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
      <div className="px-5 py-4 border-t border-slate-700 space-y-3">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
