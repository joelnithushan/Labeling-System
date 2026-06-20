import { useState, useEffect, useCallback } from 'react'
import type { Product } from '../types'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.electron.db.getProducts()
      setProducts(data)
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addProduct = useCallback(async (data: Omit<Product, 'id' | 'created_at'>) => {
    const product = await window.electron.db.addProduct(data)
    setProducts(prev => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)))
    return product
  }, [])

  const updateProduct = useCallback(async (id: number, data: Omit<Product, 'id' | 'created_at'>) => {
    const product = await window.electron.db.updateProduct(id, data)
    setProducts(prev => prev.map(p => p.id === id ? product : p))
    return product
  }, [])

  const deleteProduct = useCallback(async (id: number) => {
    await window.electron.db.deleteProduct(id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }, [])

  return { products, loading, error, reload: load, addProduct, updateProduct, deleteProduct }
}
