import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LabelPreview from '../../components/LabelPreview'
import type { Product, AppSettings } from '../../types'

vi.mock('jsbarcode', () => ({ default: vi.fn() }))

const product: Product = {
  id: 1,
  name: 'மிளகாய்த் தூள்',
  category: 'Spice',
  weight: '200',
  weight_unit: 'g',
  price: 350,
  shelf_life_days: 180,
  created_at: '2026-06-27 00:00:00',
}

const settings: AppSettings = {
  shop_name: 'Test Shop',
  printer_name: '',
  label_size: '100x50',
  date_format: 'dd/MM/yyyy',
  address: '123 Main St',
  phone: '+94 77 123 4567',
  whatsapp: '+94 76 111 1111',
  username: 'admin',
  password: 'admin',
  logo: '',
  theme: 'dark',
  label_net_wt: 'NET WT',
  label_price: 'PRICE',
  label_mfg: 'Mfg Date',
  label_exp: 'Exp Date',
}

const mfgDate = new Date('2026-06-27')
const expDate = new Date('2026-12-27')
const serial = '20260627-SPC-00001'

function renderPreview(overrides: Partial<AppSettings> = {}, productOverride: Product | null = product) {
  return render(
    <LabelPreview
      product={productOverride}
      settings={{ ...settings, ...overrides }}
      serialNumber={serial}
      mfgDate={mfgDate}
      expDate={expDate}
    />
  )
}

// ── No product ────────────────────────────────────────────────────────────────

describe('LabelPreview — no product', () => {
  it('shows select-product placeholder when product is null', () => {
    renderPreview({}, null)
    expect(screen.getByText(/select a product/i)).toBeInTheDocument()
  })

  it('does not render a label frame when product is null', () => {
    const { container } = renderPreview({}, null)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})

// ── All 6 required label fields ───────────────────────────────────────────────

describe('LabelPreview — required fields', () => {
  it('shows shop name', () => {
    renderPreview()
    expect(screen.getByText('Test Shop')).toBeInTheDocument()
  })

  it('shows product name', () => {
    renderPreview()
    expect(screen.getByText('மிளகாய்த் தூள்')).toBeInTheDocument()
  })

  it('shows weight and unit', () => {
    renderPreview()
    expect(screen.getByText(/200/)).toBeInTheDocument()
    expect(screen.getByText(/200/).textContent).toContain('g')
  })

  it('shows price formatted as Rs.', () => {
    renderPreview()
    expect(screen.getByText(/Rs\.\s*350\.00/)).toBeInTheDocument()
  })

  it('shows Mfg Date label', () => {
    renderPreview()
    expect(screen.getByText('Mfg Date')).toBeInTheDocument()
  })

  it('shows Exp Date label', () => {
    renderPreview()
    expect(screen.getByText('Exp Date')).toBeInTheDocument()
  })

  it('shows serial number', () => {
    renderPreview()
    expect(screen.getByText(serial)).toBeInTheDocument()
  })
})

// ── Header info ───────────────────────────────────────────────────────────────

describe('LabelPreview — shop header', () => {
  it('shows address when set', () => {
    renderPreview({ address: '123 Main St' })
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
  })

  it('shows phone when set', () => {
    renderPreview({ phone: '+94 77 123 4567' })
    expect(screen.getByText('+94 77 123 4567')).toBeInTheDocument()
  })

  it('shows whatsapp number when set', () => {
    renderPreview({ whatsapp: '+94 76 111 1111' })
    expect(screen.getByText('+94 76 111 1111')).toBeInTheDocument()
  })

  it('omits address when empty', () => {
    renderPreview({ address: '' })
    expect(screen.queryByText('123 Main St')).not.toBeInTheDocument()
  })
})

// ── Custom label field names ──────────────────────────────────────────────────

describe('LabelPreview — custom label fields', () => {
  it('uses custom netWtLabel', () => {
    render(
      <LabelPreview
        product={product} settings={settings} serialNumber={serial}
        mfgDate={mfgDate} expDate={expDate}
        labelFields={{ netWtLabel: 'எடை', priceLabel: 'PRICE', mfgLabel: 'Mfg Date', expLabel: 'Exp Date' }}
      />
    )
    expect(screen.getByText('எடை')).toBeInTheDocument()
  })

  it('uses custom Tamil label names for all four fields', () => {
    render(
      <LabelPreview
        product={product} settings={settings} serialNumber={serial}
        mfgDate={mfgDate} expDate={expDate}
        labelFields={{ netWtLabel: 'எடை', priceLabel: 'விலை', mfgLabel: 'உ.தி', expLabel: 'கா.தி' }}
      />
    )
    expect(screen.getByText('எடை')).toBeInTheDocument()
    expect(screen.getByText('விலை')).toBeInTheDocument()
    expect(screen.getByText('உ.தி')).toBeInTheDocument()
    expect(screen.getByText('கா.தி')).toBeInTheDocument()
  })
})

// ── Logo watermark ────────────────────────────────────────────────────────────

describe('LabelPreview — logo watermark', () => {
  it('does not render watermark img when logo is empty', () => {
    const { container } = renderPreview({ logo: '' })
    expect(container.querySelector('img[alt=""]')).not.toBeInTheDocument()
  })

  it('renders watermark img when logo is set', () => {
    const { container } = renderPreview({ logo: 'data:image/png;base64,abc' })
    const img = container.querySelector('img[alt=""]')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc')
  })

  it('applies logoOpacity prop to watermark', () => {
    const { container } = render(
      <LabelPreview
        product={product} settings={{ ...settings, logo: 'data:image/png;base64,abc' }}
        serialNumber={serial} mfgDate={mfgDate} expDate={expDate}
        logoOpacity={0.4}
      />
    )
    const img = container.querySelector('img[alt=""]') as HTMLImageElement
    expect(img.style.opacity).toBe('0.4')
  })

  it('applies logoSize prop to watermark', () => {
    const { container } = render(
      <LabelPreview
        product={product} settings={{ ...settings, logo: 'data:image/png;base64,abc' }}
        serialNumber={serial} mfgDate={mfgDate} expDate={expDate}
        logoSize={70}
      />
    )
    const img = container.querySelector('img[alt=""]') as HTMLImageElement
    expect(img.style.width).toBe('70%')
    expect(img.style.height).toBe('70%')
  })
})
