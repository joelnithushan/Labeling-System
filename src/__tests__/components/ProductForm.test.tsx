import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductForm from '../../components/ProductForm'
import type { Product } from '../../types'

const onSave = vi.fn().mockResolvedValue(undefined)
const onClose = vi.fn()

const existingProduct: Product = {
  id: 1,
  name: 'Red Rice Flour',
  category: 'Flour',
  weight: '1',
  weight_unit: 'kg',
  price: 450,
  shelf_life_days: 180,
  created_at: '2026-06-21 00:00:00',
}

function renderForm(product?: Product | null) {
  return render(
    <ProductForm product={product ?? null} onSave={onSave} onClose={onClose} />
  )
}

describe('ProductForm — rendering', () => {
  it('shows "Add Product" title for new product', () => {
    renderForm()
    expect(screen.getByRole('heading', { name: 'Add Product' })).toBeInTheDocument()
  })

  it('shows "Edit Product" title when editing an existing product', () => {
    renderForm(existingProduct)
    expect(screen.getByRole('heading', { name: 'Edit Product' })).toBeInTheDocument()
  })

  it('pre-fills fields when editing an existing product', () => {
    renderForm(existingProduct)
    expect(screen.getByDisplayValue('Red Rice Flour')).toBeInTheDocument()
    expect(screen.getByDisplayValue('450')).toBeInTheDocument()
  })

  it('renders all category options', () => {
    renderForm()
    // There are multiple comboboxes; find the one that contains Flour/Rice options
    const selects = screen.getAllByRole('combobox')
    const categorySelect = selects.find(s =>
      Array.from(s.querySelectorAll('option')).some(o => o.textContent === 'Flour')
    )
    expect(categorySelect).toBeDefined()
    const options = Array.from(categorySelect!.querySelectorAll('option')).map(o => o.textContent)
    expect(options).toContain('Flour')
    expect(options).toContain('Rice')
    expect(options).toContain('Millet')
    expect(options).toContain('Grain')
  })

  it('calls onClose when Cancel is clicked', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when X button is clicked', async () => {
    renderForm()
    // The X close button is the only button outside the form footer
    const buttons = screen.getAllByRole('button')
    const xBtn = buttons.find(b => b.querySelector('svg'))!
    await userEvent.click(xBtn)
    expect(onClose).toHaveBeenCalled()
  })
})

describe('ProductForm — validation', () => {
  it('shows error when product name is empty', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /add product/i }))
    expect(await screen.findByText('Product name is required.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows error when weight is empty', async () => {
    renderForm()
    await userEvent.type(screen.getByPlaceholderText(/e.g. Red Rice Flour/i), 'Test Product')
    await userEvent.click(screen.getByRole('button', { name: /add product/i }))
    expect(await screen.findByText('Weight is required.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows error when price is 0', async () => {
    renderForm()
    await userEvent.type(screen.getByPlaceholderText(/e.g. Red Rice Flour/i), 'Test Product')
    await userEvent.type(screen.getByPlaceholderText(/e.g. 1, 2.5, 500/i), '1')
    // price defaults to 0 — submit without changing it
    await userEvent.click(screen.getByRole('button', { name: /add product/i }))
    expect(await screen.findByText('Price must be greater than 0.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('ProductForm — successful submission', () => {
  it('calls onSave with correct data on valid form submission', async () => {
    renderForm()
    await userEvent.type(screen.getByPlaceholderText(/e.g. Red Rice Flour/i), 'Wheat Flour')
    await userEvent.type(screen.getByPlaceholderText(/e.g. 1, 2.5, 500/i), '2')

    const [priceInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(priceInput, { target: { value: '350' } })

    await userEvent.click(screen.getByRole('button', { name: /add product/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wheat Flour',
          weight: '2',
          price: 350,
        })
      )
    })
  })

  it('calls onClose after successful save', async () => {
    renderForm()
    await userEvent.type(screen.getByPlaceholderText(/e.g. Red Rice Flour/i), 'Wheat Flour')
    await userEvent.type(screen.getByPlaceholderText(/e.g. 1, 2.5, 500/i), '1')
    const [priceField] = screen.getAllByRole('spinbutton')
    fireEvent.change(priceField, { target: { value: '300' } })
    await userEvent.click(screen.getByRole('button', { name: /add product/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
