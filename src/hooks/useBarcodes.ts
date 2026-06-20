import { useState, useEffect, useCallback } from 'react'
import type { Barcode } from '../types'

export function useBarcodes(filters?: { search?: string; date?: string; limit?: number }) {
  const [barcodes, setBarcodes] = useState<Barcode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.electron.db.getBarcodes(filters)
      setBarcodes(data)
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [filters?.search, filters?.date, filters?.limit])

  useEffect(() => { load() }, [load])

  return { barcodes, loading, error, reload: load }
}
