import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Product } from '../types'
import { CATEGORIES } from '../types'
import TamilInput from './TamilInput'

interface Props {
  product?: Product | null
  onSave: (data: Omit<Product, 'id' | 'created_at'>) => Promise<void>
  onClose: () => void
}

const WEIGHT_UNITS = ['g', 'kg', 'ml', 'L']

const EMPTY: Omit<Product, 'id' | 'created_at'> = {
  name: '',
  category: 'Flour',
  weight: '',
  weight_unit: 'kg',
  price: 0,
  shelf_life_days: 180,
}

export default function ProductForm({ product, onSave, onClose }: Props) {
  const [form, setForm] = useState<Omit<Product, 'id' | 'created_at'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      const { id: _id, created_at: _ca, ...rest } = product
      setForm(rest)
    } else {
      setForm(EMPTY)
    }
  }, [product])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Product name is required.')
    if (!form.weight.trim()) return setError('Weight is required.')
    if (form.price <= 0) return setError('Price must be greater than 0.')
    setError('')
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Product Name *</label>
            <TamilInput
              className="input-field w-full"
              value={form.name}
              onChange={v => set('name', v)}
              placeholder="e.g. Red Rice Flour"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Category *</label>
            <select
              className="input-field w-full"
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-slate-300 text-sm mb-1.5">Weight *</label>
              <input
                className="input-field w-full"
                value={form.weight}
                onChange={e => set('weight', e.target.value)}
                placeholder="e.g. 1, 2.5, 500"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1.5">Unit</label>
              <select
                className="input-field"
                value={form.weight_unit}
                onChange={e => set('weight_unit', e.target.value)}
              >
                {WEIGHT_UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Price (Rs.) *</label>
            <input
              type="number"
              min="0"
              className="input-field w-full"
              value={form.price || ''}
              onChange={e => set('price', Number(e.target.value))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary"
            >
              {saving ? 'Saving…' : product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
