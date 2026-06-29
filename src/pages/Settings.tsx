import { useState, useEffect, useRef } from 'react'
import { Save, CheckCircle, Monitor, Eye, EyeOff, Upload, X, Sun, Moon, Phone, MessageCircle } from 'lucide-react'
import type { AppSettings } from '../types'
import DataManagementSection from '../components/settings/DataManagementSection'
import TamilInput from '../components/TamilInput'

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
  whatsapp: '',
  username: 'admin',
  password: 'admin',
  logo: '',
  theme: 'dark',
  label_net_wt: 'NET WT',
  label_price: 'PRICE',
  label_mfg: 'Mfg Date',
  label_exp: 'Exp Date',
}

export default function Settings() {
  const [form, setForm] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      set('logo', reader.result as string)
    }
    reader.readAsDataURL(file)
  }
  const [loadingPrinters, setLoadingPrinters] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    window.electron.db.getSettings().then(s => setForm(s as AppSettings))
  }, [])

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', form.theme === 'light')
  }, [form.theme])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave(e as unknown as React.FormEvent)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [form])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await window.electron.db.updateSettings(form)
      setSaved(true)
      window.dispatchEvent(new CustomEvent('settingsUpdated'))
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
            <TamilInput
              className="input-field w-full"
              value={form.shop_name}
              onChange={v => set('shop_name', v)}
              placeholder="e.g. Nithushan's Mill"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Address (optional)</label>
            <TamilInput
              className="input-field w-full"
              value={form.address}
              onChange={v => set('address', v)}
              placeholder="e.g. 123 Main Street, Colombo"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-slate-300 text-sm mb-1.5">
              <Phone size={14} className="text-slate-400" />
              Call Number (optional)
            </label>
            <input
              className="input-field w-full"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="e.g. +94 77 123 4567"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-slate-300 text-sm mb-1.5">
              <MessageCircle size={14} className="text-emerald-400" />
              WhatsApp Number (optional)
            </label>
            <input
              className="input-field w-full"
              value={form.whatsapp}
              onChange={e => set('whatsapp', e.target.value)}
              placeholder="e.g. +94 77 123 4567"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Shop Logo (optional)</label>
            <div className="flex items-center gap-3">
              {form.logo ? (
                <div className="relative">
                  <img
                    src={form.logo}
                    alt="Logo"
                    className="h-16 w-16 object-contain rounded-lg border border-slate-600 bg-white p-1"
                  />
                  <button
                    type="button"
                    onClick={() => { set('logo', ''); if (logoInputRef.current) logoInputRef.current.value = '' }}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500">
                  <Upload size={20} />
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Upload size={14} />
                  {form.logo ? 'Change Logo' : 'Upload Logo'}
                </button>
                <p className="text-slate-500 text-xs mt-1">PNG, JPG or SVG. Appears as watermark on labels.</p>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
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

        {/* Preferences */}
        <section className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <h2 className="text-white font-semibold">Preferences</h2>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Appearance</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
              <button
                type="button"
                onClick={() => set('theme', 'light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                  form.theme === 'light'
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun size={14} /> Light
              </button>
              <button
                type="button"
                onClick={() => set('theme', 'dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                  form.theme !== 'light'
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon size={14} /> Dark
              </button>
            </div>
          </div>

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
