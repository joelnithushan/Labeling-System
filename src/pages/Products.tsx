import { useState } from 'react'
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import ProductForm from '../components/ProductForm'
import type { Product } from '../types'

export default function Products() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useProducts()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this product? This cannot be undone.')) return
    setDeleting(id)
    await deleteProduct(id)
    setDeleting(null)
  }

  const CATEGORY_COLORS: Record<string, string> = {
    Flour: 'bg-yellow-500/20 text-yellow-300',
    Millet: 'bg-orange-500/20 text-orange-300',
    Grain: 'bg-amber-500/20 text-amber-300',
    Rice: 'bg-green-500/20 text-green-300',
    Sugar: 'bg-pink-500/20 text-pink-300',
    Salt: 'bg-blue-500/20 text-blue-300',
    Spice: 'bg-red-500/20 text-red-300',
    Pulse: 'bg-purple-500/20 text-purple-300',
    Other: 'bg-slate-500/20 text-slate-300',
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Products</h1>
          <p className="text-slate-400 text-sm mt-1">{products.length} products registered</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field pl-9 w-full max-w-xs"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-slate-500 py-12 text-center">Loading…</div>
      ) : !filtered.length ? (
        <div className="text-center py-16">
          <Package size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">
            {search ? 'No products match your search.' : 'No products yet.'}
          </p>
          {!search && (
            <p className="text-slate-500 text-sm mt-1">Click "Add Product" to get started.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(product => (
            <div
              key={product.id}
              className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors"
            >
              {/* Category badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[product.category] ?? 'bg-slate-600/30 text-slate-300'}`}>
                {product.category}
              </span>

              {/* Product name */}
              <h3 className="text-white font-semibold mt-2.5 mb-1 leading-snug">{product.name}</h3>

              {/* Details */}
              <div className="space-y-1 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Weight</span>
                  <span className="text-slate-200">{product.weight} {product.weight_unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price</span>
                  <span className="text-amber-400 font-medium">Rs. {product.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shelf Life</span>
                  <span className="text-slate-200">{product.shelf_life_days} days</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700">
                <button
                  onClick={() => { setEditing(product); setShowForm(true) }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  disabled={deleting === product.id}
                  className="flex-1 flex items-center justify-center gap-1.5 text-red-400 hover:text-white hover:bg-red-900/40 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <ProductForm
          product={editing}
          onSave={editing
            ? (data) => updateProduct(editing.id, data).then(() => {})
            : (data) => addProduct(data).then(() => {})
          }
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
