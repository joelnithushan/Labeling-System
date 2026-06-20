import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BarcodeTable from '../../components/BarcodeTable'
import type { Barcode } from '../../types'

const makeBarcodes = (count: number): Barcode[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    product_id: 1,
    product_name: `Product ${i + 1}`,
    category: 'Flour',
    weight: '1',
    weight_unit: 'kg',
    price: 450,
    serial_number: `20260621-FLR-0000${i + 1}`,
    barcode_value: `20260621-FLR-0000${i + 1}`,
    quantity: 2,
    mfg_date: '21/06/2026',
    exp_date: '18/12/2026',
    printed_at: '2026-06-21 10:00:00',
  }))

describe('BarcodeTable', () => {
  it('shows loading state', () => {
    render(<BarcodeTable barcodes={[]} loading={true} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows empty state when no barcodes and not loading', () => {
    render(<BarcodeTable barcodes={[]} loading={false} />)
    expect(screen.getByText('No records found.')).toBeInTheDocument()
  })

  it('renders column headers', () => {
    render(<BarcodeTable barcodes={makeBarcodes(1)} loading={false} />)
    expect(screen.getByText('Serial Number')).toBeInTheDocument()
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Weight')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Qty')).toBeInTheDocument()
    expect(screen.getByText('Mfg Date')).toBeInTheDocument()
    expect(screen.getByText('Exp Date')).toBeInTheDocument()
    expect(screen.getByText('Printed At')).toBeInTheDocument()
  })

  it('renders a row for each barcode', () => {
    render(<BarcodeTable barcodes={makeBarcodes(3)} loading={false} />)
    expect(screen.getByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText('Product 2')).toBeInTheDocument()
    expect(screen.getByText('Product 3')).toBeInTheDocument()
  })

  it('renders the serial number in each row', () => {
    render(<BarcodeTable barcodes={makeBarcodes(2)} loading={false} />)
    expect(screen.getByText('20260621-FLR-00001')).toBeInTheDocument()
    expect(screen.getByText('20260621-FLR-00002')).toBeInTheDocument()
  })

  it('renders the price formatted as Rs. XX.XX', () => {
    render(<BarcodeTable barcodes={makeBarcodes(1)} loading={false} />)
    expect(screen.getByText('Rs. 450.00')).toBeInTheDocument()
  })

  it('renders the quantity', () => {
    render(<BarcodeTable barcodes={makeBarcodes(1)} loading={false} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders mfg and exp dates', () => {
    render(<BarcodeTable barcodes={makeBarcodes(1)} loading={false} />)
    expect(screen.getByText('21/06/2026')).toBeInTheDocument()
    expect(screen.getByText('18/12/2026')).toBeInTheDocument()
  })
})
