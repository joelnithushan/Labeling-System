import { useState, useEffect } from 'react'
import { Save, CheckCircle, Monitor, Eye, EyeOff } from 'lucide-react'
import type { AppSettings } from '../types'
import DataManagementSection from '../components/settings/DataManagementSection'

const LABEL_SIZES = [
  { value: '50x40', label: '50 × 40 mm (small)' },
  { value: '100x50', label: '100 × 50 mm (medium)' },
  { value: '100x150', label: '100 × 150 mm (large / shipping)' },
]

const DATE_FORMATS = [
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (e.g. 21/06/2026)' },
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (e.g. 06/21/2026)' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (e.g. 2026-06-21)' },
  { value: 'dd-MM-yyyy', label: 'DD-MM-YYYY (e.g. 21-06-2026)' },
]

const DEFAULT_SETTINGS: AppSettings = {
  shop_name: 'My Mill Shop',
  printer_name: '',
  label_size: '100x50',
  date_format: 'dd/MM/yyyy',
  address: '',
  phone: '',
  username: 'admin',
  password: 'admin',
}

export default function Settings() {
  const [form, setForm] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])
  const [loadingPrinters, setLoadingPrinters] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    window.electron.db.getSettings().then(s => setForm(s as AppSettings))
  }, [])

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await window.electron.db.updateSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function loadPrinters() {
    setLoadingPrinters(true)
    try {
      const list = await window.electron.print.getPrinters()
      setPrinters(list)
    } finally {
      setLoadingPrinters(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure shop info, printer, and label preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Info */}
        <section className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <h2 className="text-white font-semibold">Shop Information</h2>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Shop / Business Name *</label>
            <input
              className="input-field w-full"
              value={form.shop_name}
              onChange={e => set('shop_name', e.target.value)}
              placeholder="e.g. Nithushan's Mill"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Address (optional)</label>
            <input
              className="input-field w-full"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="e.g. 123 Main Street, Colombo"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Phone (optional)</label>
            <input
              className="input-field w-full"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="e.g. +94 77 123 4567"
            />
          </div>
        </section>

        {/* Printer */}
        <section className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <h2 className="text-white font-semibold">Printer Setup</h2>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 text-sm">Printer Name</label>
              <button
                type="button"
                onClick={loadPrinters}
                disabled={loadingPrinters}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors"
              >
                <Monitor size={13} />
                {loadingPrinters ? 'Loading…' : 'Detect printers'}
              </button>
            </div>

            {printers.length > 0 ? (
              <select
                className="input-field w-full mb-2"
                value={form.printer_name}
                onChange={e => set('printer_name', e.target.value)}
              >
                <option value="">— Use system print dialog —</option>
                {printers.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.displayName || p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input-field w-full"
                value={form.printer_name}
                onChange={e => set('printer_name', e.target.value)}
                placeholder="e.g. Xprinter XP-420B"
              />
            )}
            <p className="text-slate-500 text-xs mt-1">
              Leave blank to show the system print dialog each time.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Label Size</label>
            <select
              className="input-field w-full"
              value={form.label_size}
              onChange={e => set('label_size', e.target.value)}
            >
              {LABEL_SIZES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Login Credentials */}
        <section className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <div>
            <h2 className="text-white font-semibold">Login Credentials</h2>
            <p className="text-slate-400 text-xs mt-1">Change username and password for this system</p>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Username</label>
            <input
              className="input-field w-full"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Password</label>
            <div className="relative">
              <input
                className="input-field w-full pr-10"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </section>

        {/* Date format */}
        <section className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <h2 className="text-white font-semibold">Preferences</h2>
          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Date Format</label>
            <select
              className="input-field w-full"
              value={form.date_format}
              onChange={e => set('date_format', e.target.value)}
            >
              {DATE_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-6"
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
              <CheckCircle size={16} />
              Saved!
            </div>
          )}
        </div>
      </form>

      <DataManagementSection />
    </div>
  )
}
